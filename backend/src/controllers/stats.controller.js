const { File, Folder } = require('../models');
const { fn, col, Op } = require('sequelize');

function categoryOf(mime) {
    if (!mime) return 'other';
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.includes('pdf') || mime.includes('word') || mime.includes('excel') ||
        mime.includes('sheet') || mime.includes('document') || mime.startsWith('text/')) return 'document';
    if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z') || mime.includes('gzip')) return 'archive';
    return 'other';
}

/**
 * GET /api/stats/storage
 * Aggregate storage usage for the current user.
 */
async function storageStats(req, res) {
    try {
        const userId = req.user.userId;

        const files = await File.findAll({
            where: { userId, isDeleted: false },
            attributes: ['mimeType', 'fileSize', 'isEncrypted', 'isChunked']
        });

        const byCategory = {};
        let totalBytes = 0;
        let encryptedCount = 0;
        let chunkedCount = 0;

        for (const f of files) {
            const cat = categoryOf(f.mimeType);
            const size = Number(f.fileSize) || 0;
            totalBytes += size;
            if (!byCategory[cat]) byCategory[cat] = { count: 0, bytes: 0 };
            byCategory[cat].count += 1;
            byCategory[cat].bytes += size;
            if (f.isEncrypted) encryptedCount += 1;
            if (f.isChunked) chunkedCount += 1;
        }

        const folderCount = await Folder.count({ where: { userId } });

        res.json({
            success: true,
            data: {
                totalBytes,
                fileCount: files.length,
                folderCount,
                encryptedCount,
                chunkedCount,
                byCategory
            }
        });
    } catch (error) {
        console.error('❌ Storage stats failed:', error.message);
        res.status(500).json({ success: false, error: 'Failed to compute storage stats' });
    }
}

/**
 * GET /api/stats/duplicates
 * Find groups of files that share the same checksum (potential duplicates).
 */
async function duplicateStats(req, res) {
    try {
        const userId = req.user.userId;

        // Find checksums that appear more than once
        const groups = await File.findAll({
            where: { userId, isDeleted: false, checksum: { [Op.ne]: null } },
            attributes: ['checksum', [fn('COUNT', col('id')), 'count']],
            group: ['checksum'],
            having: fn('COUNT', col('id')),
            raw: true
        });

        const dupChecksums = groups
            .filter((g) => Number(g.count) > 1)
            .map((g) => g.checksum);

        if (dupChecksums.length === 0) {
            return res.json({ success: true, data: { groups: [], wastedBytes: 0 } });
        }

        const files = await File.findAll({
            where: { userId, isDeleted: false, checksum: { [Op.in]: dupChecksums } },
            attributes: ['id', 'displayFilename', 'mimeType', 'fileSize', 'checksum', 'createdAt'],
            order: [['createdAt', 'ASC']]
        });

        const grouped = {};
        for (const f of files) {
            if (!grouped[f.checksum]) grouped[f.checksum] = [];
            grouped[f.checksum].push(f.toJSON());
        }

        let wastedBytes = 0;
        const result = Object.entries(grouped).map(([checksum, items]) => {
            // wasted = size * (copies - 1)
            const size = Number(items[0].fileSize) || 0;
            wastedBytes += size * (items.length - 1);
            return { checksum, count: items.length, size, files: items };
        });

        res.json({
            success: true,
            data: { groups: result, wastedBytes }
        });
    } catch (error) {
        console.error('❌ Duplicate stats failed:', error.message);
        res.status(500).json({ success: false, error: 'Failed to find duplicates' });
    }
}

module.exports = { storageStats, duplicateStats };
