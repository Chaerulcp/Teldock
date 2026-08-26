const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * FileTag — join table for the many-to-many File <-> Tag relationship.
 */
const FileTag = sequelize.define('FileTag', {
    fileId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'files', key: 'id' },
        onDelete: 'CASCADE'
    },
    tagId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'tags', key: 'id' },
        onDelete: 'CASCADE'
    }
}, {
    timestamps: false,
    tableName: 'file_tags',
    indexes: [
        { name: 'uniq_file_tag', fields: ['fileId', 'tagId'], unique: true }
    ]
});

module.exports = FileTag;
