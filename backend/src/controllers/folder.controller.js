const { Op } = require('sequelize');
const { Folder, File } = require('../models');

/**
 * GET /api/folders
 * List folders for current user, optionally filtered by parent
 */
async function listFolders(req, res) {
    try {
        const userId = req.user.userId;
        let { parentFolderId } = req.query;

        // Normalize the "null"/"root" query values to actual null
        if (parentFolderId === undefined || parentFolderId === 'null' || parentFolderId === 'root' || parentFolderId === '') {
            parentFolderId = null;
        }

        const folders = await Folder.findAll({
            where: { userId, parentFolderId },
            order: [['displayOrder', 'ASC'], ['name', 'ASC']]
        });

        res.json({
            success: true,
            data: { folders }
        });
    } catch (error) {
        console.error('❌ List folders failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to list folders'
        });
    }
}

/**
 * POST /api/folders
 * Create a new folder
 */
async function createFolder(req, res) {
    try {
        const userId = req.user.userId;
        const { name, parentFolderId = null, icon } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Folder name is required'
            });
        }

        let parent = null;
        let depth = 0;
        let basePath = '';

        if (parentFolderId) {
            parent = await Folder.findOne({ where: { id: parentFolderId, userId } });
            if (!parent) {
                return res.status(404).json({
                    success: false,
                    error: 'Parent folder not found'
                });
            }
            depth = parent.depth + 1;
            basePath = parent.path;
        }

        const path = `${basePath}/${name.trim()}`;

        // Prevent duplicate folder path for same user
        const existing = await Folder.findOne({ where: { userId, path } });
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'A folder with this name already exists here'
            });
        }

        const folder = await Folder.create({
            userId,
            name: name.trim(),
            parentFolderId: parentFolderId || null,
            path,
            depth,
            icon: icon || 'folder'
        });

        res.status(201).json({
            success: true,
            message: 'Folder created',
            data: { folder }
        });
    } catch (error) {
        console.error('❌ Create folder failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to create folder: ' + error.message
        });
    }
}

/**
 * PUT /api/folders/:id
 * Rename a folder
 */
async function renameFolder(req, res) {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Folder name is required'
            });
        }

        const folder = await Folder.findOne({ where: { id, userId } });
        if (!folder) {
            return res.status(404).json({
                success: false,
                error: 'Folder not found'
            });
        }

        const parentPath = folder.path.substring(0, folder.path.lastIndexOf('/'));
        const oldPath = folder.path;
        const newPath = `${parentPath}/${name.trim()}`;

        folder.name = name.trim();
        folder.path = newPath;
        await folder.save();

        // Update descendant paths (prefix replacement)
        const descendants = await Folder.findAll({
            where: { userId, path: { [Op.like]: `${oldPath}/%` } }
        });
        for (const child of descendants) {
            child.path = newPath + child.path.substring(oldPath.length);
            await child.save();
        }

        res.json({
            success: true,
            message: 'Folder renamed',
            data: { folder }
        });
    } catch (error) {
        console.error('❌ Rename folder failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to rename folder'
        });
    }
}

/**
 * DELETE /api/folders/:id
 * Delete a folder (and detach contained files by setting folderId to null)
 */
async function deleteFolder(req, res) {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        const folder = await Folder.findOne({ where: { id, userId } });
        if (!folder) {
            return res.status(404).json({
                success: false,
                error: 'Folder not found'
            });
        }

        // Detach files in this folder tree (keep files, move to root)
        const subtree = await Folder.findAll({
            where: {
                userId,
                [Op.or]: [
                    { id: folder.id },
                    { path: { [Op.like]: `${folder.path}/%` } }
                ]
            }
        });
        const folderIds = subtree.map(f => f.id);

        await File.update(
            { folderId: null },
            { where: { userId, folderId: { [Op.in]: folderIds } } }
        );

        // Delete the folder subtree
        await Folder.destroy({ where: { userId, id: { [Op.in]: folderIds } } });

        res.json({
            success: true,
            message: 'Folder deleted'
        });
    } catch (error) {
        console.error('❌ Delete folder failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to delete folder'
        });
    }
}

module.exports = {
    listFolders,
    createFolder,
    renameFolder,
    deleteFolder
};
