/**
 * @deprecated Not used. Upload/download now go through telegram-storage.service.js
 * (chunked, multi-bot, encryption-aware) with credentials resolved by
 * bot-pool.service.js. Kept only for reference; do not wire into new code.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { TelegramConfig, decrypt } = require('../models/TelegramConfig');
const multer = require('multer');

/**
 * User-specific Telegram Service
 * Handles file uploads/downloads for individual users' Telegram bots
 */
class TelegramUserService {
    constructor() {
        this.STREAM_BUFFER_SIZE = 1024 * 1024; // 1MB chunks
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY = 2000;
    }

    /**
     * Get active Telegram config for a user
     */
    async getUserConfig(userId) {
        const config = await TelegramConfig.findByUser(userId);
        
        if (!config) {
            throw new Error('No Telegram configuration found for this user');
        }

        return {
            ...config.toJSON(),
            botToken: await config.decryptToken()
        };
    }

    /**
     * Upload file using user's Telegram bot
     */
    async uploadFile(userId, inputStream, originalFilename, metadata = {}) {
        try {
            const config = await this.getUserConfig(userId);
            
            console.log(`📤 [${config.username || 'Bot'}] Uploading ${originalFilename}`);

            // Create FormData
            const formData = new FormData();
            
            const chunks = [];
            for await (const chunk of inputStream) {
                chunks.push(chunk);
            }
            const blob = new Blob(chunks);
            
            formData.append('document', blob, this.sanitizeFilename(originalFilename));
            formData.append('chat_id', config.storageChatId);
            formData.append('caption', this.buildCaption(originalFilename, metadata));
            formData.append('parse_mode', 'MarkdownV2');
            
            const apiUrl = `https://api.telegram.org/bot${config.botToken}/sendDocument`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Telegram API error: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.ok && result.result && result.result.document && result.result.document.file_id) {
                console.log(`✅ Upload successful: ${originalFilename}`);
                
                return {
                    success: true,
                    file_id: result.result.document.file_id,
                    message_id: result.result.message_id,
                    file_unique_id: result.result.document.file_unique_id,
                    file_size: result.result.document.file_size || 0,
                    telegram_metadata: result.result
                };
            } else {
                throw new Error('Invalid Telegram API response');
            }

        } catch (error) {
            console.error(`❌ Upload failed:`, error.message);
            throw error;
        }
    }

    /**
     * Resolve a Telegram file_id to a downloadable file_path
     */
    async getFilePath(botToken, fileId) {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`);

        if (!response.ok) {
            throw new Error(`Telegram getFile error: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.ok || !result.result || !result.result.file_path) {
            throw new Error('Unable to resolve Telegram file path');
        }

        return result.result.file_path;
    }

    /**
     * Download file using user's Telegram bot
     */
    async downloadFile(userId, fileId) {
        try {
            const config = await this.getUserConfig(userId);

            // Telegram requires resolving file_id -> file_path via getFile before download
            const filePath = await this.getFilePath(config.botToken, fileId);
            const downloadUrl = `https://api.telegram.org/file/bot${config.botToken}/${filePath}`;

            return {
                success: true,
                downloadUrl,
                filePath
            };
        } catch (error) {
            console.error('Error downloading from Telegram:', error.message);
            throw error;
        }
    }

    /**
     * Build caption with metadata
     */
    buildCaption(filename, metadata) {
        const parts = [`*${filename}*`];
        
        if (metadata.description) {
            parts.push(`\n${metadata.description}`);
        }

        if (metadata.tags && metadata.tags.length > 0) {
            parts.push(`\nTags: ${metadata.tags.join(', ')}`);
        }

        return parts.join('\n');
    }

    /**
     * Sanitize filename
     */
    sanitizeFilename(filename) {
        const sanitized = filename.replace(/[<>:"\\|?*]/g, '_').substring(0, 100);
        return sanitized.trim();
    }
}

// Export singleton instance
const telegramUserService = new TelegramUserService();

module.exports = telegramUserService;
