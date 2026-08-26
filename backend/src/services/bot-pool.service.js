const { BotToken, encrypt } = require('../models/BotToken');
const { TelegramConfig } = require('../models/TelegramConfig');

/**
 * Bot Pool Service
 *
 * Resolves the Telegram bot tokens to use for a given user, in priority order:
 *   1. The user's bot pool (BotToken) — for parallel throughput
 *   2. The bot token from the user's connected TelegramConfig
 *   3. (dev/testing only) the global TELEGRAM_BOT_TOKEN from the environment
 *
 * Teldock is multi-user: in production every user must connect their own bot;
 * the environment token is a convenience for local development only.
 */
class BotPoolService {
    constructor() {
        // In-memory round-robin cursor per user
        this._cursors = new Map();
    }

    /**
     * Validate a bot token against Telegram and return bot info.
     */
    async validateToken(token) {
        const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        if (!response.ok) {
            throw new Error('Invalid bot token');
        }
        const result = await response.json();
        if (!result.ok) {
            throw new Error('Invalid bot token');
        }
        return result.result; // { id, username, ... }
    }

    /**
     * Add a bot token to a user's pool (validates first).
     */
    async addBot(userId, token) {
        const info = await this.validateToken(token);

        const existing = await BotToken.findOne({
            where: { userId, botId: info.id }
        });
        if (existing) {
            throw new Error('This bot is already in your pool');
        }

        return BotToken.create({
            userId,
            tokenEncrypted: encrypt(token),
            botUsername: info.username,
            botId: info.id,
            isActive: true
        });
    }

    /**
     * Remove a bot from a user's pool.
     */
    async removeBot(userId, botTokenId) {
        return BotToken.destroy({ where: { id: botTokenId, userId } });
    }

    /**
     * List a user's bots (without exposing raw tokens).
     */
    async listBots(userId) {
        const bots = await BotToken.findAll({
            where: { userId },
            order: [['createdAt', 'ASC']]
        });
        return bots.map((b) => ({
            id: b.id,
            botUsername: b.botUsername,
            botId: b.botId,
            isActive: b.isActive,
            lastUsedAt: b.lastUsedAt
        }));
    }

    /**
     * Return all usable tokens for a user, in priority order:
     *   1. the user's active bot pool
     *   2. the user's connected TelegramConfig bot token
     *   3. (development only) the global env token
     */
    async getTokens(userId) {
        const bots = await BotToken.findAll({
            where: { userId, isActive: true },
            order: [['createdAt', 'ASC']]
        });

        if (bots.length > 0) {
            return bots.map((b) => b.getToken());
        }

        // Fall back to the token from the user's connected Telegram config
        const config = await TelegramConfig.findByUser(userId);
        if (config) {
            const token = await config.decryptToken();
            if (token) return [token];
        }

        // Development/testing convenience only — never in production
        if (process.env.NODE_ENV !== 'production') {
            const fallback = process.env.TELEGRAM_BOT_TOKEN;
            if (fallback && fallback !== 'your-telegram-bot-token-here') {
                return [fallback];
            }
        }

        throw new Error('No Telegram bot connected. Add one in Settings → Telegram Integration.');
    }

    /**
     * Pick the next token round-robin for a user.
     */
    async nextToken(userId) {
        const tokens = await this.getTokens(userId);
        const cursor = this._cursors.get(userId) || 0;
        const token = tokens[cursor % tokens.length];
        this._cursors.set(userId, (cursor + 1) % tokens.length);
        return token;
    }
}

module.exports = new BotPoolService();
