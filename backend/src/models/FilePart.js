const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * FilePart model
 * Represents one chunk of a large file that has been split across
 * multiple Telegram messages (teldrive-style chunked storage).
 */
const FilePart = sequelize.define('FilePart', {
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
    partIndex: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Zero-based order of this part within the file'
    },
    telegramChatId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Telegram chat/channel where this part is stored'
    },
    telegramMessageId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Telegram message ID for this part'
    },
    telegramFileId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Telegram internal file ID for this part'
    },
    partSize: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Size of this part in bytes (encrypted size if encrypted)'
    },
    plainSize: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Original (pre-encryption) size of this part in bytes'
    },
    encryptionIv: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: 'Hex IV used to encrypt this part (null if not encrypted)'
    },
    checksum: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: 'SHA-256 checksum of this part (plaintext)'
    }
}, {
    timestamps: true,
    tableName: 'file_parts',
    indexes: [
        { fields: ['fileId'] },
        {
            name: 'idx_file_part_order',
            fields: ['fileId', 'partIndex'],
            unique: true
        }
    ]
});

module.exports = FilePart;
