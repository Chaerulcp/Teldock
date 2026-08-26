const { SharedLink } = require('../models');

/**
 * GET /api/shares
 * List shared links created by the current user.
 */
async function listShares(req, res) {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 50;

        const result = await SharedLink.getLinksForUser(req.user.userId, { page, limit });

        const links = result.links.map((link) => {
            const json = link.toJSON();
            return {
                id: json.id,
                fileId: json.fileId,
                file: json.file,
                shortUrl: `${process.env.FRONTEND_URL || ''}/s/${json.token || ''}`,
                downloadLimit: json.downloadLimit,
                usedDownloads: json.usedDownloads,
                accessedCount: json.accessedCount,
                expiresAt: json.expiresAt,
                hasPassword: !!json.passwordHash,
                allowPreview: json.allowPreview,
                isExpired: link.isExpired(),
                isUsable: link.canUse(),
                createdAt: json.createdAt
            };
        });

        res.json({
            success: true,
            data: {
                links,
                total: result.total,
                currentPage: result.currentPage,
                totalPages: result.totalPages
            }
        });
    } catch (error) {
        console.error('❌ List shares failed:', error.message);
        res.status(500).json({ success: false, error: 'Failed to list shared links' });
    }
}

/**
 * DELETE /api/shares/:id
 * Revoke (delete) a shared link owned by the current user.
 */
async function revokeShare(req, res) {
    try {
        const { id } = req.params;

        const link = await SharedLink.findOne({
            where: { id, creatorId: req.user.userId }
        });

        if (!link) {
            return res.status(404).json({ success: false, error: 'Shared link not found' });
        }

        await link.destroy();

        res.json({ success: true, message: 'Shared link revoked' });
    } catch (error) {
        console.error('❌ Revoke share failed:', error.message);
        res.status(500).json({ success: false, error: 'Failed to revoke shared link' });
    }
}

module.exports = { listShares, revokeShare };
