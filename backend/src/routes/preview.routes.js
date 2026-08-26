const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const ImagePreviewService = require('../services/preview/image.service');
const telegramFileService = require('../services/telegram.service');
const { File } = require('../models');

/**
 * Fetch the raw file buffer from Telegram CDN for a stored file
 */
async function fetchFileBuffer(file) {
    const downloadResult = await telegramFileService.downloadFromTelegram(file.telegramFileId);
    const response = await fetch(downloadResult.downloadUrl);

    if (!response.ok) {
        throw new Error(`Failed to fetch file from Telegram: ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
}

/**
 * POST /api/previews/generate
 * Generate a preview for a file. Images are generated synchronously and
 * returned as base64 data URLs. Video previews require ffmpeg and are
 * generated on the server temp dir.
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

        const file = await File.findByPk(fileId);

        if (!file || file.isDeleted) {
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

        const buffer = await fetchFileBuffer(file);
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
            error: error.message
        });
    }
});

module.exports = router;
