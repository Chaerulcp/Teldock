const { TelegramConfig } = require('../models/TelegramConfig');

/**
 * Middleware: Require active Telegram connection
 * Blocks file operations until user configures Telegram settings
 */
async function requireTelegramConnection(req, res, next) {
    try {
        const telegramConfig = await TelegramConfig.findByUser(req.user.userId);
        
        if (!telegramConfig || !telegramConfig.isActive) {
            return res.status(403).json({
                success: false,
                error: 'Please configure your Telegram settings first',
                requiresSetup: true,
                setupUrl: '/settings#telegram'
            });
        }

        req.telegramConfig = telegramConfig;
        next();
    } catch (error) {
        console.error('Telegram connection check failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to verify Telegram configuration'
        });
    }
}

/**
 * Optional Telegram connection - includes user's config if available
 */
async function optionalTelegramConnection(req, res, next) {
    try {
        const telegramConfig = await TelegramConfig.findByUser(req.user.userId);
        
        req.telegramConfig = telegramConfig || null;
        next();
    } catch (error) {
        req.telegramConfig = null;
        next();
    }
}

module.exports = {
    requireTelegramConnection,
    optionalTelegramConnection
};
