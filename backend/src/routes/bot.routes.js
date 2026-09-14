const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validation.middleware');
const { botTokenSchema } = require('../validation/telegram.validation');
const botPool = require('../services/bot-pool.service');
const { z } = require('zod');

router.use(authenticateToken);

/**
 * GET /api/bots
 * List the current user's bot pool
 */
router.get('/', async (req, res) => {
    try {
        const bots = await botPool.listBots(req.user.userId);
        res.json({ success: true, data: { bots } });
    } catch (error) {
        console.error('List bots failed:', error.message);
        res.status(500).json({ success: false, error: 'Failed to list bots' });
    }
});

/**
 * POST /api/bots
 * Add a bot token to the pool (validated against Telegram)
 */
router.post('/', validateBody(z.object({ token: botTokenSchema })), async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ success: false, error: 'Bot token is required' });
        }

        const bot = await botPool.addBot(req.user.userId, token);
        res.status(201).json({
            success: true,
            message: 'Bot added to pool',
            data: {
                bot: {
                    id: bot.id,
                    botUsername: bot.botUsername,
                    botId: bot.botId,
                    isActive: bot.isActive
                }
            }
        });
    } catch (error) {
        console.error('Add bot failed:', error.message);
        const isExpectedError = error.message.includes('Invalid') || error.message.includes('already');
        const status = isExpectedError ? 400 : 500;
        const message = isExpectedError ? error.message : 'Failed to add bot';
        res.status(status).json({ success: false, error: message });
    }
});

/**
 * DELETE /api/bots/:id
 * Remove a bot from the pool
 */
router.delete('/:id', async (req, res) => {
    try {
        await botPool.removeBot(req.user.userId, req.params.id);
        res.json({ success: true, message: 'Bot removed from pool' });
    } catch (error) {
        console.error('Remove bot failed:', error.message);
        res.status(500).json({ success: false, error: 'Failed to remove bot' });
    }
});

module.exports = router;
