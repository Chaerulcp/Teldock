const { BotToken, encrypt } = require('../models/BotToken');

/**
 * Bot Pool Service
 *
 * Manages a pool of Telegram bot tokens per user and hands them out in a
 * round-robin fashion so that concurrent upload/download operations can be
 * spread across multiple bots for higher throughput (teldrive-style).
 *
 * Falls back to the global TELEGRAM_BOT_TOKEN / TELEGRAM_STORAGE_CHAT_ID when
 * the user has not configured any bots of their own.
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
     * Return all usable tokens for a user. If the user has no active bots,
     * fall back to the global token from the environment.
     */
    async getTokens(userId) {
        const bots = await BotToken.findAll({
            where: { userId, isActive: true },
            order: [['createdAt', 'ASC']]
        });

        if (bots.length > 0) {
            return bots.map((b) => b.getToken());
        }

        const fallback = process.env.TELEGRAM_BOT_TOKEN;
        if (fallback && fallback !== 'your-telegram-bot-token-here') {
            return [fallback];
        }

        throw new Error('No Telegram bot configured. Add a bot in Settings.');
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
