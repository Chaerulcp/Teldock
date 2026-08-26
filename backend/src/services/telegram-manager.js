const { Telegraf, session } = require('telegraf');
require('dotenv').config();

/**
 * Initialize Telegraph Bot
 * Used for managing file uploads to Telegram storage channel
 */
class TelegramBotManager {
    constructor() {
        this.bot = null;
        this.config = {
            token: process.env.TELEGRAM_BOT_TOKEN,
            chatId: process.env.TELEGRAM_STORAGE_CHAT_ID,
            localApiUrl: process.env.TELEGRAM_API_SERVER_URL || 'http://localhost:8081'
        };
    }

    /**
     * Initialize bot instance with all middlewares and handlers
     */
    initialize() {
        if (!this.config.token) {
            console.warn('⚠️  TELEGRAM_BOT_TOKEN not configured. Bot features disabled.');
            return false;
        }

        try {
            // Create bot instance
            this.bot = new Telegraf(this.config.token);

            // Session middleware for user tracking
            this.bot.use(session());

            // Add error handling
            this.bot.catch((err, ctx) => {
                console.error('❌ Bot Error:', err.message);
                
                // Handle rate limiting (429)
                if (err.code === 429) {
                    const retryAfter = err.parameters?.retry_after || 5;
                    console.log(`⏳ Rate limited. Retrying in ${retryAfter}s...`);
                    setTimeout(() => this.retryAction(ctx), retryAfter * 1000);
                }
                
                return false;
            });

            // Register basic commands
            this.registerCommands();

            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Telegram Bot:', error.message);
            return false;
        }
    }

    /**
     * Register bot commands
     */
    registerCommands() {
        const commands = [
            { command: 'start', description: 'Start interaction with the bot' },
            { command: 'upload', description: 'Upload a file to storage' },
            { command: 'list', description: 'List all stored files' },
            { command: 'folder', description: 'Create or view folders' },
            { command: 'delete', description: 'Delete files from storage' },
            { command: 'search', description: 'Search files by name' },
            { command: 'help', description: 'Show help information' }
        ];

        this.bot.command('setcommands', async (ctx) => {
            try {
                await ctx.setMyCommands(commands);
                await ctx.reply('✅ Commands updated successfully!');
            } catch (error) {
                console.error('Error setting commands:', error);
                await ctx.reply('❌ Failed to update commands');
            }
        });
    }

    /**
     * Retry failed action after rate limit
     */
    retryAction(ctx) {
        // Implementation depends on the action that was retried
        // This is a placeholder for the retry logic
    }

    /**
     * Get bot instance
     */
    getBot() {
        return this.bot;
    }

    /**
     * Check if bot is initialized
     */
    isInitialized() {
        return this.bot !== null && this.config.token !== undefined;
    }

    /**
     * Start bot polling (if using webhook mode)
     */
    async startPolling() {
        if (!this.isInitialized()) {
            throw new Error('Telegram Bot not initialized');
        }

        console.log('🤖 Starting Telegram bot polling...');
        
        const interval = setInterval(async () => {
            try {
                await this.bot.telegram.getMe();
                clearInterval(interval);
                console.log('✅ Telegram bot connected successfully!');
            } catch (error) {
                console.error('❌ Unable to connect to Telegram Bot API:', error.message);
                clearInterval(interval);
            }
        }, 1000);

        return this.bot.startPolling();
    }
}

// Export singleton instance
const botManager = new TelegramBotManager();

module.exports = {
    botManager,
    TelegramBotManager
};
