const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * FileVersion — an immutable snapshot of a file's state at a point in time.
 * Stores the full Telegram part references (as JSON) so chunked/encrypted
 * files can be restored exactly.
 */
const FileVersion = sequelize.define('FileVersion', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    fileId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'files', key: 'id' },
        onDelete: 'CASCADE'
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
    },
    versionNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Sequential version number (1, 2, 3...)'
    },
    // Single-message reference (legacy / non-chunked convenience)
    telegramMessageId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Telegram message ID for single-part versions'
    },
    telegramFileId: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    telegramChatId: {
        type: DataTypes.BIGINT,
        allowNull: true
    },
    // Chunk / encryption metadata snapshot
    isChunked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    partCount: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    isEncrypted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    encryptionSalt: {
        type: DataTypes.STRING(64),
        allowNull: true
    },
    partsSnapshot: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
        comment: 'JSON array of FilePart records for this version'
    },
    originalFilename: {
        type: DataTypes.STRING(500),
        comment: 'Original filename at time of upload'
    },
    displayFilename: {
        type: DataTypes.STRING(500),
        comment: 'Display name shown in UI'
    },
    mimeType: {
        type: DataTypes.STRING(100),
        comment: 'MIME type of this version'
    },
    fileSize: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'File size in bytes'
    },
    checksum: {
        type: DataTypes.STRING(64),
        comment: 'SHA-256 hash of the original file'
    }
}, {
    timestamps: true,
    tableName: 'file_versions',
    indexes: [
        { fields: ['fileId'] },
        { fields: ['userId'] },
        { fields: ['versionNumber'] }
    ]
});

FileVersion.prototype.getMetadata = function () {
    return {
        id: this.id,
        versionNumber: this.versionNumber,
        filename: this.displayFilename,
        mimeType: this.mimeType,
        fileSize: this.fileSize,
        isChunked: this.isChunked,
        partCount: this.partCount,
        isEncrypted: this.isEncrypted,
        createdAt: this.createdAt
    };
};

module.exports = FileVersion;
