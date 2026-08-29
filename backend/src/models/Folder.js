const { DataTypes, Op } = require('sequelize');
const crypto = require('crypto');
const { sequelize } = require('../config/database');

const Folder = sequelize.define('Folder', {
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
    parentFolderId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'folders',
            key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'Parent folder for nested structure'
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 255]
        }
    },
    path: {
        type: DataTypes.STRING(1000),
        allowNull: false,
        comment: 'Full path for quick lookup (e.g., /Documents/Projects/ProjectA)'
    },
    depth: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Depth in hierarchy (root = 0)'
    },
    displayOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Sort order within parent folder'
    },
    icon: {
        type: DataTypes.STRING(50),
        defaultValue: 'folder',
        comment: 'Custom folder icon/classname'
    }
}, {
    timestamps: true,
    tableName: 'folders',
    indexes: [
        { fields: ['userId'] },
        { fields: ['parentFolderId'] },
        { 
            name: 'folders_tree_index', 
            fields: ['userId', 'parentFolderId', 'displayOrder'] 
        },
        { 
            name: 'folders_path_idx', 
            fields: ['path'],
            unique: true
        }
    ]
});

// Instance methods
Folder.prototype.getFullPath = async function() {
    return this.path;
};

Folder.prototype.getParent = async function() {
    if (!this.parentFolderId) return null;
    return Folder.findByPk(this.parentFolderId);
};

Folder.prototype.getChildren = async function() {
    return Folder.findAll({
        where: {
            userId: this.userId,
            parentFolderId: this.id
        },
        order: [['displayOrder', 'ASC'], ['createdAt', 'ASC']]
    });
};

Folder.prototype.getDescendants = async function(includeFiles = false) {
    const descendants = [];
    
    const children = await this.getChildren();
    
    for (const child of children) {
        descendants.push(child);
        
        if (includeFiles) {
            const files = await child.getFiles();
            descendants.push(...files);
        }
        
        // Recursively get grandchildren
        const grandChildren = await child.getDescendants(true);
        descendants.push(...grandChildren);
    }
    
    return descendants;
};

Folder.prototype.moveUp = async function() {
    const parent = await this.getParent();
    if (!parent) return null;
    
    await this.update({ parentFolderId: parent.parentFolderId });
    await this.updatePath(parent.parentFolderId);
    
    return parent;
};

Folder.prototype.moveDown = async function(newParentId) {
    const newParent = await Folder.findByPk(newParentId);
    if (!newParent) return null;
    
    await this.update({ parentFolderId: newParentId });
    await this.updatePath(newParentId);
    
    return newParent;
};

Folder.prototype.updatePath = async function(newParentId) {
    const ancestors = await this.getAncestorChain();
    const newPath = [...ancestors, newParentId, this.id]
        .filter(Boolean)
        .join('/');
    
    await this.update({ path: newPath });
};

Folder.prototype.getAncestorChain = async function() {
    const chain = [];
    let current = await this.getParent();
    
    while (current) {
        chain.unshift(current.id);
        current = await current.getParent();
    }
    
    return chain;
};

Folder.prototype.deleteRecursively = async function() {
    // Delete all children first
    const children = await this.getChildren();
    for (const child of children) {
        await child.deleteRecursively();
    }
    
    // Then delete self
    await this.destroy();
};

// Static methods
Folder.createRoot = async function(userId, name, options = {}) {
    return Folder.create({
        userId,
        name,
        parentFolderId: null,
        path: `/${name}`,
        depth: 0,
        ...options
    });
};

Folder.createFromPath = async function(userId, fullPath) {
    const parts = fullPath.split('/').filter(Boolean);
    
    let currentFolder = null;
    let currentPath = '';
    
    for (const part of parts) {
        currentPath += '/' + part;
        
        let folder = await Folder.findOne({
            where: { userId, path: currentPath }
        });
        
        if (!folder) {
            const parentId = currentFolder ? currentFolder.id : null;
            const depth = currentPath.split('/').length - 1;
            
            folder = await Folder.create({
                userId,
                name: part,
                parentFolderId: parentId,
                path: currentPath,
                depth
            });
        }
        
        currentFolder = folder;
    }
    
    return currentFolder;
};

Folder.getByPath = async function(userId, path) {
    return Folder.findOne({
        where: { userId, path }
    });
};

Folder.searchFolders = async function(userId, searchTerm) {
    const likePattern = `%${searchTerm}%`;

    return Folder.findAll({
        where: {
            userId,
            [Op.or]: [
                { name: { [Op.like]: likePattern } },
                { path: { [Op.like]: likePattern } }
            ]
        },
        order: [['name', 'ASC']],
        limit: 50
    });
};

module.exports = Folder;
