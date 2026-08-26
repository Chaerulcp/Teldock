const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const fileRoutes = require('./file.routes');

// Import SharedLink model for token validation
const { SharedLink } = require('../models');

// Mount routes
router.use('/auth', authRoutes);
router.use('/files', fileRoutes);

// Public shared link access (no authentication required)
router.get('/files/s/:token', async (req, res) => {
    try {
        const token = req.params.token;
        
        // Import File model
        const { File } = require('../models');
        
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
        const file = await File.findByPk(sharedLink.fileId);

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
        } else {
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
        }

    } catch (error) {
        console.error('❌ Shared link access failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Link access failed'
        });
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Telegram Cloud Storage API',
        version: '2.0.0'
    });
});

module.exports = router;
