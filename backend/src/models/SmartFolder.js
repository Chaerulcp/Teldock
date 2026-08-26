const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * SmartFolder — a saved filter (not a real folder). Criteria is stored as JSON
 * and applied client-side / via the file list query (favorite, tagId, type, search).
 */
const SmartFolder = sequelize.define('SmartFolder', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
    },
    name: {
        type: DataTypes.STRING(80),
        allowNull: false,
        validate: { notEmpty: true, len: [1, 80] }
    },
    icon: {
        type: DataTypes.STRING(30),
        defaultValue: 'sparkles'
    },
    criteria: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'JSON: { favorite?, tagId?, type?, q? }'
    }
}, {
    timestamps: true,
    tableName: 'smart_folders',
    indexes: [{ fields: ['userId'] }]
});

module.exports = SmartFolder;
