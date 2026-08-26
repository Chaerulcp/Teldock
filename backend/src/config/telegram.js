const { Telegraf } = require('telegraf');
require('dotenv').config();

// Initialize bot instance (lazy load)
let botInstance = null;

/**
 * Get bot instance
 */
function getBot() {
    if (!botInstance && process.env.TELEGRAM_BOT_TOKEN) {
        botInstance = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    }
    return botInstance;
}

// Configuration object
const telegramConfig = {
    token: process.env.TELEGRAM_BOT_TOKEN,
    storageChatId: process.env.TELEGRAM_STORAGE_CHAT_ID,
    apiUrl: `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN || ''}`,
    localApiUrl: process.env.TELEGRAM_API_SERVER_URL || 'http://localhost:8081',
    useLocalApi: false // Set true if using local Bot API Server
};

// Export helpers
module.exports = {
    getBot,
    telegramConfig
};
