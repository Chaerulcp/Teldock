const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-encryption-key-change-in-production';

/**
 * Encrypt a value using AES-256-CBC (salt derived from random IV).
 */
function encrypt(value) {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, iv, 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a value produced by encrypt().
 */
function decrypt(stored) {
    const [ivHex, encryptedValue] = stored.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, iv, 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

/**
 * BotToken model
 * A pool of Telegram bot tokens per user. Multiple bots allow parallel
 * uploads/downloads to increase throughput (teldrive-style multi-bot pool).
 */
const BotToken = sequelize.define('BotToken', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    tokenEncrypted: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Encrypted bot token'
    },
    botUsername: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Bot username for display'
    },
    botId: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Numeric Telegram bot ID'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether this bot is available in the pool'
    },
    lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when this bot was last used (round-robin fairness)'
    }
}, {
    timestamps: true,
    tableName: 'bot_tokens',
    indexes: [
        { fields: ['userId'] },
        { fields: ['isActive'] }
    ]
});

BotToken.prototype.getToken = function () {
    return decrypt(this.tokenEncrypted);
};

module.exports = { BotToken, encrypt, decrypt };
