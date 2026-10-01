const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const ImagePreviewService = require('../services/preview/image.service');
const VideoPreviewService = require('../services/preview/video.service');
const telegramStorage = require('../services/telegram-storage.service');
const { File, FilePart } = require('../models');

// Previews are generated in-process, so the source must fit comfortably in RAM.
const MAX_PREVIEW_SOURCE_BYTES = 25 * 1024 * 1024;

// Video gets its own, explicitly separate cap. Video files are commonly hundreds
// of MB and are decoded by ffmpeg from a temp file, but the source is still
// buffered into RAM before being written out. Raising this to match real video
// sizes would let a single request exhaust process memory; a true streaming
// pipeline (download straight to a temp file) would remove the need for the cap.
// Until then keep it modest and fail fast with 413.
const MAX_VIDEO_PREVIEW_SOURCE_BYTES = 25 * 1024 * 1024;

const PREVIEW_TOO_LARGE = 'PREVIEW_TOO_LARGE';

/**
 * Classify a MIME type into the preview pipeline that can handle it.
 *
 * @returns {'image'|'video'|null}
 */
function classifyPreviewType(mimeType) {
    if (typeof mimeType !== 'string') {
        return null;
    }

    const normalized = mimeType.toLowerCase();
    if (normalized.startsWith('image/')) {
        return 'image';
    }
    if (normalized.startsWith('video/')) {
        return 'video';
    }
    return null;
}

/**
 * Read a stored file into a buffer via the per-user storage service. Credentials
 * are resolved server-side by the bot pool — no global bot token is involved.
 *
 * @param {Object} file
 * @param {number} maxBytes cap for this pipeline (image and video differ)
 */
async function readFileBuffer(file, maxBytes) {
    const parts = file.parts && file.parts.length > 0
        ? file.parts
        : [{
            partIndex: 0,
            telegramChatId: file.telegramChatId,
            telegramMessageId: file.telegramMessageId,
            telegramFileId: file.telegramFileId,
            partSize: file.fileSize,
            plainSize: file.fileSize,
            encryptionIv: null
        }];

    const { stream } = telegramStorage.createReadStream(
        file.userId,
        parts,
        file.encryptionSalt
    );

    const chunks = [];
    let total = 0;
    for await (const chunk of stream) {
        total += chunk.length;
        if (total > maxBytes) {
            stream.destroy();
            const error = new Error('File is too large to generate a preview');
            error.code = PREVIEW_TOO_LARGE;
            throw error;
        }
        chunks.push(chunk);
    }

    return Buffer.concat(chunks, total);
}

/**
 * Turn a service preview object into the transport shape used by both pipelines.
 */
function toPreviewResponse(preview) {
    return {
        dataUrl: `data:${preview.mimetype};base64,${preview.data.toString('base64')}`,
        dimensions: preview.dimensions,
        fileSize: preview.data.length
    };
}

/**
 * POST /api/previews/generate
 * Generate previews for a file the caller owns. Images return resized variants;
 * videos return a single thumbnail plus the duration when it can be read.
 *
 * Image response:  { success, data: { previews, originalDimensions, processingTime } }
 * Video response:  { success, data: { type: 'video', previews: { thumbnail },
 *                                    duration, processingTime } }
 */
async function generatePreviewHandler(req, res) {
    try {
        const userId = req.user.userId;
        const { fileId } = req.body;

        if (!fileId) {
            return res.status(400).json({
                success: false,
                error: 'File ID is required'
            });
        }

        const file = await File.findOne({
            where: { id: fileId, isDeleted: false },
            include: [{ model: FilePart, as: 'parts' }]
        });

        if (!file) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        if (file.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized access to this file'
            });
        }

        const previewType = classifyPreviewType(file.mimeType);

        if (previewType === null) {
            return res.status(400).json({
                success: false,
                error: 'Preview generation supports image and video files only'
            });
        }

        if (previewType === 'video') {
            const ffmpegAvailable = await VideoPreviewService.checkFfmpegAvailable();
            if (!ffmpegAvailable) {
                return res.status(503).json({
                    success: false,
                    error: 'Video previews are unavailable because FFmpeg is not installed on the server'
                });
            }
        }

        const maxBytes = previewType === 'video'
            ? MAX_VIDEO_PREVIEW_SOURCE_BYTES
            : MAX_PREVIEW_SOURCE_BYTES;

        const tooLargeMessage = previewType === 'video'
            ? 'Video is too large to generate a preview'
            : 'File is too large to generate a preview';

        if (Number(file.fileSize) > maxBytes) {
            return res.status(413).json({
                success: false,
                error: tooLargeMessage
            });
        }

        let buffer;
        try {
            buffer = await readFileBuffer(file, maxBytes);
        } catch (error) {
            if (error.code === PREVIEW_TOO_LARGE) {
                return res.status(413).json({
                    success: false,
                    error: tooLargeMessage
                });
            }
            throw error;
        }

        if (previewType === 'image') {
            const result = await ImagePreviewService.generate(buffer);

            // Convert buffers to base64 data URLs for transport
            const previews = {};
            for (const [name, preview] of Object.entries(result.previews)) {
                previews[name] = toPreviewResponse(preview);
            }

            return res.json({
                success: true,
                data: {
                    previews,
                    originalDimensions: result.originalDimensions,
                    processingTime: result.processingTime
                }
            });
        }

        const result = await VideoPreviewService.generate(buffer, file.mimeType);

        return res.json({
            success: true,
            data: {
                type: 'video',
                previews: {
                    thumbnail: toPreviewResponse(result.thumbnail)
                },
                duration: result.duration,
                processingTime: result.processingTime
            }
        });
    } catch (error) {
        console.error('Preview generation failed:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Preview generation failed'
        });
    }
}

router.post('/generate', authenticateToken, generatePreviewHandler);

module.exports = router;
module.exports.generatePreviewHandler = generatePreviewHandler;
module.exports.classifyPreviewType = classifyPreviewType;
module.exports.MAX_VIDEO_PREVIEW_SOURCE_BYTES = MAX_VIDEO_PREVIEW_SOURCE_BYTES;
