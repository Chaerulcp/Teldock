const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const secrets = require('../config/secrets');

const SECRET_LENGTH = 32; // Bytes
const ITERATIONS = 100000; // Salt rounds for hashing token

/**
 * Encrypt a value using AES-256-CBC
 */
function encrypt(value) {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(secrets.encryptionKey, iv, 32);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
        iv: iv.toString('hex'),
        encrypted
    };
}

/**
 * Decrypt an encrypted value
 */
function decrypt(ivHex, encryptedValue) {
    try {
        const iv = Buffer.from(ivHex, 'hex');
        const key = crypto.scryptSync(secrets.encryptionKey, iv, 32);
        
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption failed:', error.message);
        throw new Error('Unable to decrypt credentials');
    }
}

const TelegramConfig = sequelize.define('TelegramConfig', {
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
    botTokenEncrypted: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Encrypted Telegram bot token'
    },
    storageChatId: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Telegram chat/channel ID for storage'
    },
    chatType: {
        type: DataTypes.ENUM('channel', 'group', 'private'),
        defaultValue: 'channel',
        comment: 'Type of Telegram chat being used'
    },
    username: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Bot or channel username for display'
    },
    isActive: {
        type: DataTypes.TINYINT(1),
        defaultValue: 1,
        comment: 'Whether this config is currently active'
    }
}, {
    timestamps: true,
    tableName: 'user_telegram_configs',
    indexes: [
        { fields: ['userId'] },
        { fields: ['isActive'] }
    ]
});

// Instance methods

// The encrypted bot token must never reach a client, even if a route spreads
// the whole row into a response.
TelegramConfig.prototype.toJSON = function() {
    const values = { ...this.get({ plain: true }) };
    delete values.botTokenEncrypted;
    delete values.storageChatId;
    return values;
};

TelegramConfig.prototype.decryptToken = async function() {
    if (!this.botTokenEncrypted) return null;
    
    // Parse stored format: "iv:encrypted"
    const parts = this.botTokenEncrypted.split(':');
    if (parts.length !== 2) return null;
    
    return decrypt(parts[0], parts[1]);
};

TelegramConfig.validateCredentials = async function(botToken, chatId) {
    try {
        // Test connection to verify credentials
        const testResult = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
        
        if (!testResult.ok) {
            throw new Error('Invalid bot token');
        }
        
        const result = await testResult.json();
        
        if (!result.ok) {
            throw new Error('Invalid bot token');
        }
        
        return {
            valid: true,
            bot: result.result
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
};

// Static methods
TelegramConfig.connectUser = async function(userId, botToken, chatId, chatType = 'channel', username = null) {
    // Validate credentials first
    const validation = await this.validateCredentials(botToken, chatId);
    
    if (!validation.valid) {
        throw new Error(validation.error);
    }
    
    // Encrypt credentials before storing
    const encrypted = encrypt(botToken);
    const encryptedString = `${encrypted.iv}:${encrypted.encrypted}`;
    
    const config = await this.create({
        userId,
        botTokenEncrypted: encryptedString,
        storageChatId: chatId,
        chatType,
        username,
        isActive: 1
    });
    
    return config;
};

TelegramConfig.findByUser = async function(userId) {
    return this.findOne({
        where: {
            userId,
            isActive: 1
        }
    });
};

TelegramConfig.disableConfig = async function(userId) {
    return this.update(
        { isActive: 0 },
        { where: { userId } }
    );
};

TelegramConfig.getAllActiveConfigs = async function() {
    return this.findAll({
        where: { isActive: 1 },
        include: [{
            model: sequelize.models.User,
            as: 'user',
            attributes: ['id', 'email', 'username']
        }]
    });
};

module.exports = {
    TelegramConfig,
    encrypt,
    decrypt
};
