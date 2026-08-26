const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Tag — a user-defined label that can be attached to many files.
 */
const Tag = sequelize.define('Tag', {
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
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: { notEmpty: true, len: [1, 50] }
    },
    color: {
        type: DataTypes.STRING(20),
        defaultValue: '#10b981',
        comment: 'Hex color for the tag chip'
    }
}, {
    timestamps: true,
    tableName: 'tags',
    indexes: [
        { fields: ['userId'] },
        { name: 'uniq_user_tag', fields: ['userId', 'name'], unique: true }
    ]
});

module.exports = Tag;
