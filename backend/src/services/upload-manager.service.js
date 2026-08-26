const crypto = require('crypto');
const { Readable } = require('stream');

/**
 * Upload Manager Service
 * Handles chunked uploads with progress tracking, resume capability, and retry logic
 */
class UploadManagerService {
    constructor() {
        this.UPLOADS = new Map(); // Track in-progress uploads
        this.CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks by default
        this.MAX_RETRIES = 3;
    }

    /**
     * Initialize upload session
     */
    initUpload(userId, fileMetadata) {
        const uploadId = crypto.randomBytes(16).toString('hex');
        
        const uploadSession = {
            uploadId,
            userId,
            metadata: {
                name: fileMetadata.name,
                mimeType: fileMetadata.mimeType || 'application/octet-stream',
                size: fileMetadata.size
            },
            totalChunks: Math.ceil(fileMetadata.size / this.CHUNK_SIZE),
            uploadedChunks: [],
            uploadedBytes: 0,
            startedAt: Date.now(),
            status: 'in_progress',
            retries: {} // Track retries per chunk
        };

        this.UPLOADS.set(uploadId, uploadSession);

        return uploadSession;
    }

    /**
     * Upload a specific chunk
     */
    async uploadChunk(uploadId, chunkData, offset) {
        const uploadSession = this.UPLOADS.get(uploadId);
        
        if (!uploadSession) {
            throw new Error(`Upload session ${uploadId} not found`);
        }

        const chunkIndex = offset / this.CHUNK_SIZE;
        
        try {
            console.log(`📤 Uploading chunk ${chunkIndex + 1}/${uploadSession.totalChunks} for ${uploadSession.metadata.name}`);

            // Upload to Telegram
            const result = await this.uploadToTelegram(chunkData, {
                fileName: uploadSession.metadata.name,
                offset,
                mime_type: uploadSession.metadata.mimeType
            });

            if (!result.ok || !result.result) {
                throw new Error('Telegram upload failed');
            }

            // Mark chunk as uploaded
            uploadSession.uploadedChunks.push(chunkIndex);
            uploadSession.uploadedBytes += chunkData.length;
            
            // Update status
            const progress = (uploadSession.uploadedBytes / uploadSession.metadata.size) * 100;
            
            uploadSession.lastProgress = {
                percentage: progress.toFixed(2),
                bytesUploaded: uploadSession.uploadedBytes,
                bytesTotal: uploadSession.metadata.size,
                speed: this.calculateSpeed(uploadSession),
                eta: this.estimateTimeRemaining(uploadSession, progress)
            };

            return {
                success: true,
                uploadId,
                chunkIndex,
                progress: uploadSession.lastProgress,
                telegramFileId: result.result.file_id
            };

        } catch (error) {
            console.error(`❌ Chunk ${chunkIndex} failed:`, error.message);
            
            // Track retries
            uploadSession.retries[chunkIndex] = (uploadSession.retries[chunkIndex] || 0) + 1;
            
            if (uploadSession.retries[chunkIndex] >= this.MAX_RETRIES) {
                throw new Error(`Chunk ${chunkIndex} failed after ${this.MAX_RETRIES} retries`);
            }

            // Wait before retry (exponential backoff)
            const delay = Math.pow(2, uploadSession.retries[chunkIndex]) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));

            // Retry the chunk
            return this.retryChunk(uploadId, chunkData, offset);
        }
    }

    /**
     * Retry failed chunk
     */
    async retryChunk(uploadId, chunkData, offset) {
        const chunkIndex = offset / this.CHUNK_SIZE;

        // Check if already retried max times
        const uploadSession = this.UPLOADS.get(uploadId);
        if (uploadSession.retries[chunkIndex] >= this.MAX_RETRIES) {
            throw new Error(`Chunk ${chunkIndex} exceeded retry limit`);
        }

        console.log(`🔄 Retrying chunk ${chunkIndex + 1}...`);

        return this.uploadChunk(uploadId, chunkData, offset);
    }

    /**
     * Upload a chunk to Telegram as a document using the configured storage bot.
     * Each chunk is stored as its own Telegram message; message ids are tracked
     * on the session so they can be reassembled/referenced later.
     */
    async uploadToTelegram(chunkData, options = {}) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_STORAGE_CHAT_ID;
        const apiBase = process.env.TELEGRAM_API_URL || `https://api.telegram.org/bot${botToken}`;

        const formData = new FormData();
        const blob = new Blob([chunkData], {
            type: options.mime_type || 'application/octet-stream'
        });

        const partName = `${options.fileName || 'chunk'}.part${Math.floor((options.offset || 0) / this.CHUNK_SIZE)}`;
        formData.append('document', blob, partName);
        formData.append('chat_id', chatId);

        const response = await fetch(`${apiBase}/sendDocument`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Telegram API error: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.ok && result.result && result.result.document) {
            return {
                ok: true,
                result: {
                    file_id: result.result.document.file_id,
                    file_unique_id: result.result.document.file_unique_id,
                    message_id: result.result.message_id
                }
            };
        }

        return { ok: false, result: null };
    }

    /**
     * Complete multi-part upload
     */
    async completeUpload(uploadId) {
        const uploadSession = this.UPLOADS.get(uploadId);
        
        if (!uploadSession) {
            throw new Error(`Upload session ${uploadId} not found`);
        }

        if (uploadSession.uploadedChunks.length < uploadSession.totalChunks) {
            throw new Error(`Incomplete upload: ${uploadSession.uploadedChunks.length}/${uploadSession.totalChunks} chunks received`);
        }

        uploadSession.status = 'completed';
        uploadSession.completedAt = Date.now();
        
        return {
            success: true,
            uploadId,
            message: 'Upload completed successfully',
            stats: {
                duration: uploadSession.completedAt - uploadSession.startedAt,
                totalSize: uploadSession.metadata.size,
                chunksUsed: uploadSession.totalChunks
            }
        };
    }

    /**
     * Cancel upload
     */
    cancelUpload(uploadId) {
        const uploadSession = this.UPLOADS.get(uploadId);
        
        if (!uploadSession) {
            return { success: false, error: 'Upload not found' };
        }

        uploadSession.status = 'cancelled';
        this.UPLOADS.delete(uploadId);

        return { success: true, message: 'Upload cancelled' };
    }

    /**
     * Get upload status
     */
    getStatus(uploadId) {
        const uploadSession = this.UPLOADS.get(uploadId);
        
        if (!uploadSession) {
            return null;
        }

        const progress = uploadSession.uploadedBytes / uploadSession.metadata.size * 100;

        return {
            uploadId,
            fileName: uploadSession.metadata.name,
            fileSize: uploadSession.metadata.size,
            totalChunks: uploadSession.totalChunks,
            uploadedChunks: uploadSession.uploadedChunks.length,
            progress: progress.toFixed(2),
            status: uploadSession.status,
            lastProgress: uploadSession.lastProgress,
            startTime: new Date(uploadSession.startedAt).toISOString()
        };
    }

    /**
     * Resume upload from last position
     */
    getResumePoint(uploadId) {
        const uploadSession = this.UPLOADS.get(uploadId);
        
        if (!uploadSession || uploadSession.status !== 'in_progress') {
            return null;
        }

        const lastChunkIndex = uploadSession.uploadedChunks.slice(-1)[0];
        const resumeOffset = (lastChunkIndex || -1) * this.CHUNK_SIZE;

        return {
            uploadId,
            currentOffset: resumeOffset,
            remainingChunks: uploadSession.totalChunks - uploadSession.uploadedChunks.length
        };
    }

    /**
     * Calculate upload speed for a given session (bytes per second)
     */
    calculateSpeed(uploadSession) {
        if (!uploadSession) return 0;
        const timeElapsed = (Date.now() - uploadSession.startedAt) / 1000; // seconds

        if (timeElapsed === 0) return 0;

        return uploadSession.uploadedBytes / timeElapsed;
    }

    /**
     * Estimate time remaining for a given session (seconds)
     */
    estimateTimeRemaining(uploadSession, progressPercentage) {
        if (!uploadSession || progressPercentage >= 100) return 0;

        const elapsed = (Date.now() - uploadSession.startedAt) / 1000;
        if (progressPercentage <= 0) return 0;

        const totalTimeEstimate = elapsed / (progressPercentage / 100);
        const timeRemaining = totalTimeEstimate - elapsed;

        return Math.max(timeRemaining, 0);
    }

    /**
     * Cleanup old uploads
     */
    cleanupOldUploads(maxAgeMinutes = 30) {
        const cutoffTime = Date.now() - (maxAgeMinutes * 60 * 1000);
        
        for (const [uploadId, session] of this.UPLOADS.entries()) {
            if (session.startedAt < cutoffTime && session.status !== 'in_progress') {
                this.UPLOADS.delete(uploadId);
            }
        }
    }
}

// Singleton instance
const uploadManagerService = new UploadManagerService();

module.exports = uploadManagerService;
