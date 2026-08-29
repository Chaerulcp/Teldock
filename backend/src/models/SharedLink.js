const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const jwt = require('jsonwebtoken');
const secrets = require('../config/secrets');

const SharedLink = sequelize.define('SharedLink', {
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
    creatorId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    token: {
        type: DataTypes.STRING(512),
        allowNull: false,
        unique: true,
        comment: 'JWT-based access token'
    },
    passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Optional password protection for shared link'
    },
    // Access control
    downloadLimit: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Maximum number of downloads allowed (null = unlimited)'
    },
    usedDownloads: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of downloads already made'
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Link expiration timestamp (null = never expires)'
    },
    // Permissions
    allowDownload: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Allow file download'
    },
    allowPreview: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Allow inline preview/viewing'
    },
    // Usage tracking
    accessedCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Total times link was accessed'
    },
    lastAccessedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last time link was accessed'
    }
}, {
    timestamps: true,
    tableName: 'shared_links',
    indexes: [
        { fields: ['token'] },
        { 
            name: 'idx_expires', 
            fields: ['expiresAt'] 
        },
        { 
            name: 'idx_file_creator', 
            fields: ['fileId', 'creatorId'] 
        }
    ]
});

// Instance methods
SharedLink.prototype.isExpired = function() {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
};

SharedLink.prototype.canUse = function() {
    if (this.isExpired()) return false;
    if (this.downloadLimit && this.usedDownloads >= this.downloadLimit) return false;
    return true;
};

/**
 * Record a metadata/preview access. Does not consume the download quota.
 */
SharedLink.prototype.recordView = async function() {
    this.accessedCount += 1;
    this.lastAccessedAt = new Date();
    await this.save({ silent: true });
};

/**
 * Record an actual file transfer, consuming one unit of the download quota.
 */
SharedLink.prototype.recordDownload = async function() {
    this.accessedCount += 1;
    this.lastAccessedAt = new Date();
    this.usedDownloads += 1;
    await this.save({ silent: true });
};

SharedLink.prototype.consume = async function() {
    if (!this.canUse()) {
        return {
            success: false,
            error: 'This shared link has expired or reached download limit'
        };
    }

    await this.recordDownload();
    return { success: true };
};

// Static helper methods
SharedLink.createLink = async function(fileId, creatorId, options = {}) {
    const {
        expiresIn = null,
        downloadLimit = null,
        password = null,
        allowPreview = true
    } = options;
    
    // Generate token using JWT
    const tokenData = {
        fileId,
        creatorId,
        purpose: 'share',
        iat: Math.floor(Date.now() / 1000)
    };
    
    if (expiresIn) {
        tokenData.exp = Math.floor((Date.now() + expiresIn * 1000) / 1000);
    }
    
    const token = jwt.sign(tokenData, secrets.jwtSecret);
    
    let passwordHash = null;
    if (password) {
        const bcrypt = require('bcryptjs');
        passwordHash = await bcrypt.hash(password, 12);
    }
    
    const link = await SharedLink.create({
        fileId,
        creatorId,
        token,
        passwordHash,
        downloadLimit,
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
        allowPreview
    });
    
    return {
        ...link.toJSON(),
        shortUrl: `${process.env.FRONTEND_URL || ''}/s/${token}`
    };
};

SharedLink.validateToken = async function(token) {
    try {
        const decoded = jwt.verify(token, secrets.jwtSecret);
        
        if (decoded.purpose !== 'share') {
            throw new Error('Invalid token purpose');
        }
        
        const link = await SharedLink.findOne({
            where: { token: token }
        });
        
        if (!link) {
            throw new Error('Link not found');
        }
        
        if (!link.canUse()) {
            throw new Error('Link is expired or fully used');
        }
        
        return {
            valid: true,
            data: link,
            decodedPayload: decoded
        };
        
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
};

SharedLink.getLinksForUser = async function(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const File = require('./File');

    const offset = (page - 1) * limit;
    
    const result = await SharedLink.findAndCountAll({
        where: { creatorId: userId },
        order: [['createdAt', 'DESC']],
        limit: limit,
        offset: offset,
        include: [{
            model: File,
            as: 'file',
            attributes: ['id', 'originalFilename', 'displayFilename', 'mimeType', 'fileSize']
        }]
    });
    
    return {
        links: result.rows,
        total: result.count,
        currentPage: page,
        totalPages: Math.ceil(result.count / limit)
    };
};

module.exports = SharedLink;
