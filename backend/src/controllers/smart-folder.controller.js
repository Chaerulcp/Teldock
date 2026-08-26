const { SmartFolder } = require('../models');

function serialize(sf) {
    let criteria = {};
    try { criteria = JSON.parse(sf.criteria || '{}'); } catch { criteria = {}; }
    return { id: sf.id, name: sf.name, icon: sf.icon, criteria };
}

/**
 * GET /api/smart-folders — list saved filters for the user.
 */
async function listSmartFolders(req, res) {
    try {
        const rows = await SmartFolder.findAll({
            where: { userId: req.user.userId },
            order: [['createdAt', 'ASC']]
        });
        res.json({ success: true, data: { smartFolders: rows.map(serialize) } });
    } catch (error) {
        console.error('❌ List smart folders failed:', error.message);
        res.status(500).json({ success: false, error: 'Failed to list smart folders' });
    }
}

/**
 * POST /api/smart-folders — { name, icon?, criteria }
 * criteria: { favorite?, tagId?, type?, q? }
 */
async function createSmartFolder(req, res) {
    try {
        const { name, icon, criteria } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Name is required' });
        }
        const sf = await SmartFolder.create({
            userId: req.user.userId,
            name: name.trim(),
            icon: icon || 'sparkles',
            criteria: JSON.stringify(criteria || {})
        });
        res.status(201).json({ success: true, message: 'Smart folder created', data: { smartFolder: serialize(sf) } });
    } catch (error) {
        console.error('❌ Create smart folder failed:', error.message);
        res.status(500).json({ success: false, error: 'Failed to create smart folder' });
    }
}

/**
 * DELETE /api/smart-folders/:id
 */
async function deleteSmartFolder(req, res) {
    try {
        const { id } = req.params;
        const sf = await SmartFolder.findOne({ where: { id, userId: req.user.userId } });
        if (!sf) {
            return res.status(404).json({ success: false, error: 'Smart folder not found' });
        }
        await sf.destroy();
        res.json({ success: true, message: 'Smart folder deleted' });
    } catch (error) {
        console.error('❌ Delete smart folder failed:', error.message);
        res.status(500).json({ success: false, error: 'Failed to delete smart folder' });
    }
}

module.exports = { listSmartFolders, createSmartFolder, deleteSmartFolder };
