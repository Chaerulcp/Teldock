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
        allowNull: true,
        defaultValue: null,
        comment: 'Optional soft cap in bytes. Null = no fixed quota (capacity depends on Telegram).'
    },
    storageUsedBytes: {
        type: DataTypes.BIGINT,
        defaultValue: 0,
        comment: 'Approximate bytes uploaded, tracked for stats only.'
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
 * Helper: check an optional soft quota. Returns true when no quota is set.
 */
User.prototype.canUpload = function(fileSize) {
    if (this.storageQuotaBytes == null) return true;
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

