const { Tag, FileTag } = require('../models');
const { fn, col } = require('sequelize');

/**
 * GET /api/tags — list the user's tags with file counts.
 */
async function listTags(req, res) {
    try {
        const tags = await Tag.findAll({
            where: { userId: req.user.userId },
            order: [['name', 'ASC']]
        });

        // Count files per tag
        const counts = await FileTag.findAll({
            attributes: ['tagId', [fn('COUNT', col('fileId')), 'count']],
            group: ['tagId'],
            raw: true
        });
        const countMap = {};
        counts.forEach((c) => { countMap[c.tagId] = Number(c.count); });

        res.json({
            success: true,
            data: {
                tags: tags.map((t) => ({
                    id: t.id,
                    name: t.name,
                    color: t.color,
                    fileCount: countMap[t.id] || 0
                }))
            }
        });
    } catch (error) {
        console.error('❌ List tags failed:', error.message);
        res.status(500).json({ success: false, error: 'Failed to list tags' });
    }
}

/**
 * POST /api/tags — create a tag { name, color }
 */
async function createTag(req, res) {
    try {
        const { name, color } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Tag name is required' });
        }

        const existing = await Tag.findOne({ where: { userId: req.user.userId, name: name.trim() } });
        if (existing) {
            return res.status(409).json({ success: false, error: 'A tag with this name already exists' });
        }

        const tag = await Tag.create({
            userId: req.user.userId,
            name: name.trim(),
            color: color || '#10b981'
        });

        res.status(201).json({ success: true, message: 'Tag created', data: { tag } });
    } catch (error) {
        console.error('❌ Create tag failed:', error.message);
        res.status(500).json({ success: false, error: 'Failed to create tag' });
    }
}

/**
 * PUT /api/tags/:id — rename / recolor a tag
 */
async function updateTag(req, res) {
    try {
        const { id } = req.params;
        const { name, color } = req.body;

        const tag = await Tag.findOne({ where: { id, userId: req.user.userId } });
        if (!tag) {
            return res.status(404).json({ success: false, error: 'Tag not found' });
        }

        if (name !== undefined) {
            if (!name.trim()) {
                return res.status(400).json({ success: false, error: 'Tag name is required' });
            }
            const dupe = await Tag.findOne({ where: { userId: req.user.userId, name: name.trim() } });
            if (dupe && dupe.id !== id) {
                return res.status(409).json({ success: false, error: 'A tag with this name already exists' });
            }
            tag.name = name.trim();
        }
        if (color !== undefined) tag.color = color;

        await tag.save();
        res.json({ success: true, message: 'Tag updated', data: { tag } });
    } catch (error) {
        console.error('❌ Update tag failed:', error.message);
        res.status(500).json({ success: false, error: 'Failed to update tag' });
    }
}

/**
 * DELETE /api/tags/:id — delete a tag (detaches from all files via cascade)
 */
async function deleteTag(req, res) {
    try {
        const { id } = req.params;
        const tag = await Tag.findOne({ where: { id, userId: req.user.userId } });
        if (!tag) {
            return res.status(404).json({ success: false, error: 'Tag not found' });
        }
        await tag.destroy();
        res.json({ success: true, message: 'Tag deleted' });
    } catch (error) {
        console.error('❌ Delete tag failed:', error.message);
        res.status(500).json({ success: false, error: 'Failed to delete tag' });
    }
}

module.exports = { listTags, createTag, updateTag, deleteTag };
