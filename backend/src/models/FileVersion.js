const { DataTypes } = require('sequelize');
const crypto = require('crypto');
const { sequelize } = require('../config/database');

const FileVersion = sequelize.define('FileVersion', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    fileId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'files',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    telegramMessageId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Telegram message ID where this version is stored'
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
    versionNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Sequential version number (1, 2, 3...)'
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
        comment: 'MD5 or SHA256 hash for integrity verification'
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

// Instance methods
FileVersion.prototype.getMetadata = function() {
    return {
        id: this.id,
        versionNumber: this.versionNumber,
        filename: this.displayFilename,
        mimeType: this.mimeType,
        fileSize: this.fileSize,
        createdAt: this.createdAt
    };
};

FileVersion.prototype.revertToFile = async function() {
    // Get the current file
    const fileModel = require('./File');
    const currentFile = await fileModel.findByPk(this.fileId);
    
    if (!currentFile) {
        throw new Error('Original file not found');
    }

    // Update current file with version's data
    currentFile.displayFilename = this.displayFilename;
    currentFile.originalFilename = this.originalFilename;
    currentFile.mimeType = this.mimeType;
    currentFile.fileSize = this.fileSize;
    
    // Update Telegram metadata reference
    currentFile.telegramMessageId = this.telegramMessageId;
    
    await currentFile.save();
    
    console.log(`✅ Reverted file ${this.fileId} to version ${this.versionNumber}`);
    
    return currentFile;
};

module.exports = FileVersion;
