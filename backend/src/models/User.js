const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    telegramId: {
        type: DataTypes.BIGINT,
        unique: true,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(255),
        unique: true
    },
    username: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    firstName: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    lastName: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    avatarUrl: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: true // Can be null for Telegram-only auth
    },
    storageQuotaBytes: {
        type: DataTypes.BIGINT,
        defaultValue: 53687091200 // 50GB default
    },
    storageUsedBytes: {
        type: DataTypes.BIGINT,
        defaultValue: 0
    },
    premiumUntil: {
        type: DataTypes.DATE,
        allowNull: true
    },
    isPremium: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    timestamps: true,
    tableName: 'users',
    indexes: [
        { fields: ['telegramId'] },
        { fields: ['email'] }
    ]
});

/**
 * Helper method to check storage quota
 */
User.prototype.canUpload = function(fileSize) {
    const remaining = this.storageQuotaBytes - this.storageUsedBytes;
    return fileSize <= remaining;
};

/**
 * Update storage usage
 */
User.updateStorageUsage = async function(userId, sizeChange) {
    await User.increment('storageUsedBytes', {
        by: sizeChange,
        where: { id: userId }
    });
};

module.exports = User;

