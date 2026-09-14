const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validation.middleware');
const { TelegramConfig } = require('../models/TelegramConfig');
const { connectTelegramSchema, updateTelegramSchema } = require('../validation/telegram.validation');

// All user routes require authentication
router.use(authenticateToken);

/**
 * POST /api/user/telegram/connect
 * Connect new Telegram bot & storage channel
 */
router.post('/telegram/connect', validateBody(connectTelegramSchema), async (req, res) => {
    try {
        const userId = req.user.userId;
        const { botToken, chatId, chatType = 'channel', username } = req.body;

        if (!botToken || !chatId) {
            return res.status(400).json({
                success: false,
                error: 'Bot token and chat ID are required'
            });
        }

        // Disable existing config
        await TelegramConfig.disableConfig(userId);

        // Create new config
        const config = await TelegramConfig.connectUser(userId, botToken, chatId, chatType, username);

        console.log(`✅ User ${userId} connected Telegram config`);

        res.status(201).json({
            success: true,
            message: 'Telegram connected successfully',
            data: {
                id: config.id,
                chatType: config.chatType,
                username: config.username,
                isSetupComplete: true
            }
        });

    } catch (error) {
        console.error('Failed to connect Telegram:', error.message);
        
        if (error.message.includes('Invalid bot token')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid bot token. Please check your credentials.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to connect Telegram'
        });
    }
});

/**
 * PUT /api/user/telegram/config
 * Update existing Telegram config
 */
router.put('/telegram/config', validateBody(updateTelegramSchema), async (req, res) => {
    try {
        const userId = req.user.userId;
        const { botToken, chatId, chatType, username } = req.body;

        // Get current config
        const config = await TelegramConfig.findByUser(userId);

        if (!config) {
            return res.status(404).json({
                success: false,
                error: 'No Telegram configuration found'
            });
        }

        // Validate if tokens provided
        if (botToken && chatId) {
            const validation = await TelegramConfig.validateCredentials(botToken, chatId);
            
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: validation.error
                });
            }

            // Update encrypted token
            const { encrypt } = require('../models/TelegramConfig');
            const encrypted = encrypt(botToken);
            const encryptedString = `${encrypted.iv}:${encrypted.encrypted}`;
            
            await config.update({
                botTokenEncrypted: encryptedString,
                storageChatId: chatId,
                chatType: chatType || config.chatType,
                username: username || config.username
            });
        }

        res.json({
            success: true,
            message: 'Configuration updated',
            data: {
                id: config.id,
                chatType: config.chatType,
                username: config.username,
                isSetupComplete: true
            }
        });

    } catch (error) {
        console.error('Failed to update config:', error.message);
        res.status(500).json({
            success: false,
            error: 'Update failed'
        });
    }
});

/**
 * GET /api/user/telegram/status
 * Get connection status
 */
router.get('/telegram/status', async (req, res) => {
    try {
        const config = await TelegramConfig.findByUser(req.user.userId);

        if (!config) {
            return res.json({
                success: true,
                data: {
                    isConnected: false,
                    requiresSetup: true
                }
            });
        }

        const decryptedToken = await config.decryptToken();
        let botInfo = null;

        if (decryptedToken) {
            try {
                const result = await fetch(`https://api.telegram.org/bot${decryptedToken}/getMe`);
                if (result.ok) {
                    const data = await result.json();
                    if (data.ok) {
                        botInfo = data.result;
                    }
                }
            } catch (err) {
                console.warn('Could not fetch bot info:', err.message);
            }
        }

        res.json({
            success: true,
            data: {
                isConnected: config.isActive === 1,
                botName: botInfo?.username || config.username,
                chatType: config.chatType
            }
        });

    } catch (error) {
        console.error('Failed to get status:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to get status'
        });
    }
});

/**
 * DELETE /api/user/telegram/unlink
 * Disconnect Telegram
 */
router.delete('/telegram/unlink', async (req, res) => {
    try {
        await TelegramConfig.disableConfig(req.user.userId);

        res.json({
            success: true,
            message: 'Telegram disconnected'
        });

    } catch (error) {
        console.error('Failed to unlink:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to disconnect'
        });
    }
});

module.exports = router;
