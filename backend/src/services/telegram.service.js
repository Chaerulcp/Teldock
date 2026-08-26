const { Readable } = require('stream');
const FormData = require('form-data');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * TelegramFileService - Handles all Telegram file operations
 */
class TelegramFileService {
    constructor() {
        this.STREAM_BUFFER_SIZE = 1024 * 1024; // 1MB chunks
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY = 2000;
    }

    async uploadToStorage(inputStream, originalFilename, metadata = {}) {
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                console.log(`📤 Upload attempt ${attempt}/${this.MAX_RETRIES}: ${originalFilename}`);

                const formData = new FormData();
                
                const chunks = [];
                for await (const chunk of inputStream) {
                    chunks.push(chunk);
                }
                const blob = new Blob(chunks);
                
                formData.append('document', blob, this.sanitizeFilename(originalFilename));
                formData.append('chat_id', process.env.TELEGRAM_STORAGE_CHAT_ID);
                formData.append('caption', this.buildCaption(originalFilename, metadata));
                formData.append('parse_mode', 'MarkdownV2');
                if (metadata.mime_type) {
                    formData.append('mime_type', metadata.mime_type);
                }

                const response = await fetch(`${process.env.TELEGRAM_API_URL}/sendDocument`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`Telegram API error: ${response.statusText}`);
                }

                const result = await response.json();

                if (result.ok && result.result && result.result.document && result.result.document.file_id) {
                    console.log(`✅ Upload successful: ${originalFilename}`);
                    
                    return {
                        success: true,
                        file_id: result.result.document.file_id,
                        message_id: result.result.message_id,
                        file_unique_id: result.result.document.file_unique_id,
                        file_size: result.result.document.file_size || 0,
                        telegram_metadata: result.result
                    };
                } else {
                    throw new Error('Invalid Telegram API response');
                }

            } catch (error) {
                console.error(`❌ Upload attempt ${attempt} failed:`, error.message);

                if (attempt === this.MAX_RETRIES) {
                    throw error;
                }

                const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    async getFile(fileId) {
        try {
            const response = await fetch(`${process.env.TELEGRAM_API_URL}/getFile?file_id=${encodeURIComponent(fileId)}`);
            
            if (!response.ok) {
                throw new Error(`Telegram API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting file:', error.message);
            throw error;
        }
    }

    async downloadFromTelegram(fileId, outputPath = null) {
        try {
            const fileInfo = await this.getFile(fileId);

            if (!fileInfo || !fileInfo.result) {
                throw new Error('Invalid Telegram API response');
            }

            const file = fileInfo.result;
            const downloadUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

            let filePath = null;
            if (outputPath) {
                filePath = await this.saveToFile(downloadUrl, outputPath);
            }

            console.log(`✅ Download successful: ${downloadUrl}`);

            return {
                success: true,
                downloadUrl,
                filePath,
                fileInfo: {
                    file_id: file.file_id,
                    file_unique_id: file.file_unique_id,
                    file_size: file.file_size,
                    file_path: file.file_path
                }
            };

        } catch (error) {
            console.error('Error downloading from Telegram:', error.message);
            throw error;
        }
    }

    async deleteFromStorage(chatId, messageId) {
        try {
            const response = await fetch(`${process.env.TELEGRAM_API_URL}/deleteMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId || process.env.TELEGRAM_STORAGE_CHAT_ID,
                    message_id: messageId
                })
            });

            const result = await response.json();

            if (!result.ok) {
                throw new Error(result.description || 'Failed to delete message from Telegram');
            }

            return { success: true };
        } catch (error) {
            console.error('Error deleting from Telegram:', error.message);
            throw error;
        }
    }

    buildCaption(filename, metadata) {
        const parts = [`*${filename}*`];
        
        if (metadata.description) {
            parts.push(`\n${metadata.description}`);
        }

        if (metadata.tags && metadata.tags.length > 0) {
            parts.push(`\nTags: ${metadata.tags.join(', ')}`);
        }

        return parts.join('\n');
    }

    sanitizeFilename(filename) {
        const sanitized = filename.replace(/[<>:"\\|?*]/g, '_').substring(0, 100);
        return sanitized.trim();
    }

    async saveToFile(url, outputPath) {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, buffer);
        return outputPath;
    }

    calculateHash(buffer) {
        return crypto.createHash('md5').update(buffer).digest('hex');
    }
}

const telegramFileService = new TelegramFileService();

module.exports = telegramFileService;
