const express = require('express');
const router = express.Router();
const { uploadFile, downloadFile, listFiles, searchFiles, listVersions, revertVersion, updateFile, bulkAction, shareFile, deleteFile } = require('../controllers/file.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { createUploadMiddleware, validateFile } = require('../middleware/file-upload.middleware');
const telegramFileService = require('../services/telegram.service');

// Configure multer for uploads (chunked storage splits large files internally)
const upload = createUploadMiddleware({
    maxFileSize: parseInt(process.env.MAX_UPLOAD_BYTES, 10) || 2 * 1024 * 1024 * 1024, // 2GB default
    allowedTypes: 'all',
    storageType: 'memory' // Buffer in memory, then split into parts
});

// Protected routes
router.post('/upload', 
    authenticateToken, 
    upload.single('file'),
    validateFile,
    uploadFile
);

router.get('/:id/download', 
    authenticateToken,
    downloadFile
);

router.get('/', 
    authenticateToken,
    listFiles
);

router.get('/search',
    authenticateToken,
    searchFiles
);

// Bulk actions (delete/move) — must be before /:id routes
router.post('/bulk',
    authenticateToken,
    bulkAction
);

router.get('/:id/versions',
    authenticateToken,
    listVersions
);

router.post('/:id/revert/:versionId',
    authenticateToken,
    revertVersion
);

router.post('/:id/share',
    authenticateToken,
    shareFile
);

router.patch('/:id',
    authenticateToken,
    updateFile
);

router.delete('/:id',
    authenticateToken,
    deleteFile
);

// Shared link access endpoint (public)
router.get('/s/:token', async (req, res, next) => {
    try {
        const token = req.params.token;
        
        // Import models dynamically
        const { SharedLink } = require('../models');
        
        // Validate token
        const validation = await SharedLink.validateToken(token);
        
        if (!validation.valid) {
            return res.status(403).json({
                success: false,
                error: validation.error
            });
        }

        const sharedLink = validation.data;
        const payload = validation.decodedPayload;
        const file = sharedLink.file;

        // Record access
        await sharedLink.recordAccess();

        // Check password protection
        if (sharedLink.passwordHash && !req.query.password) {
            return res.json({
                success: true,
                requiresPassword: true,
                data: {
                    fileName: file.originalFilename,
                    fileId: file.id
                }
            });
        }

        // Verify password if set
        if (sharedLink.passwordHash && req.query.password) {
            const bcrypt = require('bcryptjs');
            const isValid = await bcrypt.compare(req.query.password, sharedLink.passwordHash);
            
            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Incorrect password'
                });
            }
        }

        // Allow download or preview based on permissions
        if (req.query.download === 'true') {
            // Redirect to actual download URL
            const telegramDownloadUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.telegramFileId}`;
            
            res.redirect(telegramDownloadUrl);
        } else if (sharedLink.allowPreview) {
            // Return preview page
            return res.json({
                success: true,
                data: {
                    file: {
                        id: file.id,
                        originalFilename: file.originalFilename,
                        mimeType: file.mimeType,
                        fileSize: file.fileSize,
                        uploadedAt: file.createdAt
                    },
                    sharedBy: sharedLink.creatorId,
                    expiresAt: sharedLink.expiresAt,
                    usedDownloads: sharedLink.usedDownloads,
                    downloadLimit: sharedLink.downloadLimit
                }
            });
        } else {
            // Download only
            const telegramDownloadUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.telegramFileId}`;
            res.redirect(telegramDownloadUrl);
        }

    } catch (error) {
        console.error('❌ Shared link access failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Link access failed'
        });
    }
});

module.exports = router;
