const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const ImagePreviewService = require('../services/preview/image.service');
const telegramStorage = require('../services/telegram-storage.service');
const { File, FilePart } = require('../models');

// Previews are generated in-process, so the source must fit comfortably in RAM.
const MAX_PREVIEW_SOURCE_BYTES = 25 * 1024 * 1024;

/**
 * Read a stored file into a buffer via the per-user storage service. Credentials
 * are resolved server-side by the bot pool — no global bot token is involved.
 */
async function readFileBuffer(file) {
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
        if (total > MAX_PREVIEW_SOURCE_BYTES) {
            stream.destroy();
            throw new Error('File is too large to generate a preview');
        }
        chunks.push(chunk);
    }

    return Buffer.concat(chunks, total);
}

/**
 * POST /api/previews/generate
 * Generate resized image previews for a file the caller owns. Returns base64
 * data URLs; only image files are supported.
 */
router.post('/generate', authenticateToken, async (req, res) => {
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

        if (!file.mimeType.startsWith('image/')) {
            return res.status(400).json({
                success: false,
                error: 'Preview generation currently supports image files only'
            });
        }

        if (Number(file.fileSize) > MAX_PREVIEW_SOURCE_BYTES) {
            return res.status(413).json({
                success: false,
                error: 'File is too large to generate a preview'
            });
        }

        const buffer = await readFileBuffer(file);
        const result = await ImagePreviewService.generate(buffer);

        // Convert buffers to base64 data URLs for transport
        const previews = {};
        for (const [name, preview] of Object.entries(result.previews)) {
            previews[name] = {
                dataUrl: `data:${preview.mimetype};base64,${preview.data.toString('base64')}`,
                dimensions: preview.dimensions,
                fileSize: preview.fileSize
            };
        }

        res.json({
            success: true,
            data: {
                previews,
                originalDimensions: result.originalDimensions,
                processingTime: result.processingTime
            }
        });
    } catch (error) {
        console.error('Preview generation failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Preview generation failed'
        });
    }
});

module.exports = router;
