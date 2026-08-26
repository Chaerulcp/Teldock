const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const File = sequelize.define('File', {
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
    folderId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'folders',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    // Telegram storage metadata
    telegramChatId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Telegram chat/channel ID where file is stored'
    },
    telegramMessageId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Telegram message ID for single-message files (null for chunked files)'
    },
    telegramFileId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Telegram internal file ID for single-message files (null for chunked files)'
    },
    // Original file info
    originalFilename: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Original filename from user upload'
    },
    displayFilename: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Filename shown in UI'
    },
    mimeType: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'MIME type of the file'
    },
    fileSize: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'File size in bytes'
    },
    // Chunked / large-file storage (teldrive-style)
    isChunked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether the file is split across multiple Telegram messages'
    },
    partCount: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: 'Number of parts the file is split into'
    },
    // Encryption metadata (opt-in AES-256)
    isEncrypted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether file parts are encrypted at rest'
    },
    encryptionSalt: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: 'Hex salt used to derive the per-file encryption key'
    },
    // Integrity
    checksum: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: 'SHA-256 checksum of the original file'
    },
    // Sharing & permissions
    isPublic: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Publicly accessible or private only'
    },
    isFavorite: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether the owner starred this file'
    },
    sharedToken: {
        type: DataTypes.STRING(64),
        allowNull: true,
        unique: true,
        comment: 'JWT token for public sharing (null if private)'
    },
    // Download tracking
    downloadCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Total times file has been downloaded'
    },
    lastDownloadedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of last download'
    },
    // Soft delete support
    isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Soft delete flag - set TRUE when user wants to remove file'
    },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of deletion'
    }
}, {
    timestamps: true,
    tableName: 'files',
    indexes: [
        { fields: ['userId'] },
        { fields: ['folderId'] },
        { 
            name: 'idx_telegram_file', 
            fields: ['telegramFileId'] 
        },
        { 
            name: 'idx_user_files', 
            fields: ['userId', 'isDeleted', 'createdAt'] 
        },
        { 
            name: 'idx_telegram_chat_msg', 
            fields: ['telegramChatId', 'telegramMessageId'] 
        },
        { 
            name: 'idx_shared_token', 
            fields: ['sharedToken'],
            unique: true
        },
        { 
            name: 'idx_search', 
            fields: ['originalFilename', 'mimeType'],
            type: 'FULLTEXT'
        }
    ]
});

// Instance methods
File.prototype.isExpiredShare = async function() {
    if (!this.sharedToken) return false;
    // Token expiration should be tracked separately via shared_links table
    return false;
};

File.prototype.incrementDownload = async function() {
    this.downloadCount += 1;
    this.lastDownloadedAt = new Date();
    await this.save({ silent: true });
    return {
        downloadCount: this.downloadCount,
        lastDownloadedAt: this.lastDownloadedAt
    };
};

File.prototype.generatePublicToken = async function() {
    const tokenData = {
        fileId: this.id,
        purpose: 'share',
        createdAt: Date.now()
    };
    
    const token = crypto.randomBytes(32).toString('hex');
    this.sharedToken = token;
    await this.save();
    
    return token;
};

// Static helper methods
File.deleteFile = async function(userId, fileId) {
    const file = await File.findOne({
        where: {
            id: fileId,
            userId: userId
        }
    });
    
    if (!file) {
        throw new Error('File not found');
    }
    
    file.isDeleted = true;
    file.deletedAt = new Date();
    await file.save();
    
    return file;
};

File.getUserFiles = async function(userId, options = {}) {
    const {
        folderId = null,
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        includeDeleted = false,
        favorite = false,
        tagId = null
    } = options;

    const where = {
        userId: userId,
        isDeleted: includeDeleted ? null : false
    };

    if (folderId) {
        where.folderId = folderId;
    }
    if (favorite) {
        where.isFavorite = true;
    }

    const offset = (page - 1) * limit;
    const Folder = require('./Folder');
    const Tag = require('./Tag');

    const include = [{
        model: Folder,
        as: 'folder',
        attributes: ['id', 'name']
    }, {
        model: Tag,
        as: 'tags',
        attributes: ['id', 'name', 'color'],
        through: { attributes: [] },
        ...(tagId ? { where: { id: tagId } } : {})
    }];

    const result = await File.findAndCountAll({
        where: where,
        order: [[sortBy, sortOrder]],
        limit: limit,
        offset: offset,
        include,
        distinct: true,
        attributes: {
            exclude: ['telegramFileId'] // Don't expose internal ID publicly
        }
    });

    return {
        files: result.rows,
        total: result.count,
        currentPage: page,
        totalPages: Math.ceil(result.count / limit),
        hasMore: offset + limit < result.count
    };
};

module.exports = File;
