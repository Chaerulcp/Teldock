const { authenticateToken } = require('../middleware/auth.middleware');
const { sanitizeFilename } = require('../middleware/file-upload.middleware');
const telegramStorage = require('../services/telegram-storage.service');
const versionHistoryService = require('../services/version-history.service');
const { File, Folder, SharedLink, User, FilePart, Tag } = require('../models');
const { sequelize } = require('../config/database');

/**
 * POST /api/files/upload
 * Upload a file to Telegram storage
 */
async function uploadFile(req, res) {
    const t = await sequelize.transaction();
    try {
        const user = req.user;
        const file = req.file;
        const folderId = req.body.folderId || null;
        const encrypt = req.body.encrypt === 'true' || req.body.encrypt === true;

        console.log(`📤 Starting upload for ${file.originalname} (${file.size} bytes)`);

        // Verify user exists (usage is tracked for stats, not enforced as a fixed quota —
        // capacity depends on the user's own Telegram account/channel)
        const dbUser = await User.findByPk(user.userId, { transaction: t });
        if (!dbUser) {
            await t.rollback();
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Find target folder
        if (folderId) {
            const folder = await Folder.findOne({
                where: { id: folderId, userId: user.userId },
                transaction: t
            });
            if (!folder) {
                await t.rollback();
                return res.status(404).json({ success: false, error: 'Folder not found' });
            }
        }

        // Upload directly from the multipart stream. The storage service keeps
        // at most one bounded part in memory (plus Telegram's request buffer).
        const result = await telegramStorage.uploadStream(
            user.userId,
            file.stream,
            file.originalname,
            { encrypt, maxBytes: parseInt(process.env.MAX_UPLOAD_BYTES, 10) || 2 * 1024 * 1024 * 1024 }
        );

        // Busboy truncates a stream after the configured limit. Do not persist
        // metadata for a truncated Telegram upload; remove any parts already
        // sent and return the correct client error.
        if (file.limitReached || req.fileLimitReached) {
            await telegramStorage.deleteFile(user.userId, result.parts).catch(() => {});
            await t.rollback();
            return res.status(413).json({ success: false, error: 'File too large' });
        }

        // Use the streamer's byte count as the source of truth. It is final even
        // when the request stream emitted chunks across multiple data listeners.
        file.size = result.plainSize;

        const displayName = sanitizeFilename(file.originalname);

        // Version-on-overwrite: if a file with the same display name already exists
        // in this folder, snapshot its current state then replace it in place.
        const existing = await File.findOne({
            where: {
                userId: user.userId,
                folderId: folderId || null,
                displayFilename: displayName,
                isDeleted: false
            },
            include: [{ model: FilePart, as: 'parts' }],
            transaction: t
        });

        let uploadedFile;
        let replaced = false;

        if (existing) {
            replaced = true;
            const previousSize = Number(existing.fileSize) || 0;

            // Snapshot the current state as a version
            await versionHistoryService.snapshotCurrent(existing, existing.parts || [], { transaction: t });

            // Replace parts with the new upload's parts
            await FilePart.destroy({ where: { fileId: existing.id }, transaction: t });

            existing.telegramChatId = result.telegramChatId;
            existing.telegramMessageId = result.telegramMessageId;
            existing.telegramFileId = result.telegramFileId;
            existing.originalFilename = file.originalname;
            existing.mimeType = file.mimetype;
            existing.fileSize = file.size;
            existing.isChunked = result.isChunked;
            existing.partCount = result.partCount;
            existing.isEncrypted = result.isEncrypted;
            existing.encryptionSalt = result.encryptionSalt;
            existing.checksum = result.checksum;
            await existing.save({ transaction: t });

            for (const part of result.parts) {
                await FilePart.create({
                    fileId: existing.id,
                    partIndex: part.partIndex,
                    telegramChatId: part.telegramChatId,
                    telegramMessageId: part.telegramMessageId,
                    telegramFileId: part.telegramFileId,
                    partSize: part.partSize,
                    plainSize: part.plainSize,
                    encryptionIv: part.encryptionIv,
                    checksum: part.checksum
                }, { transaction: t });
            }

            uploadedFile = existing;

            // Adjust storage usage by the delta (new size - old size)
            const delta = Number(file.size) - previousSize;
            await User.update(
                { storageUsedBytes: sequelize.literal(`GREATEST(\`storageUsedBytes\` + ${delta}, 0)`) },
                { where: { id: user.userId }, transaction: t }
            );
        } else {
            // Create a new file record
            uploadedFile = await File.create({
                userId: user.userId,
                folderId: folderId || null,
                telegramChatId: result.telegramChatId,
                telegramMessageId: result.telegramMessageId,
                telegramFileId: result.telegramFileId,
                originalFilename: file.originalname,
                displayFilename: displayName,
                mimeType: file.mimetype,
                fileSize: file.size,
                isChunked: result.isChunked,
                partCount: result.partCount,
                isEncrypted: result.isEncrypted,
                encryptionSalt: result.encryptionSalt,
                checksum: result.checksum
            }, { transaction: t });

            for (const part of result.parts) {
                await FilePart.create({
                    fileId: uploadedFile.id,
                    partIndex: part.partIndex,
                    telegramChatId: part.telegramChatId,
                    telegramMessageId: part.telegramMessageId,
                    telegramFileId: part.telegramFileId,
                    partSize: part.partSize,
                    plainSize: part.plainSize,
                    encryptionIv: part.encryptionIv,
                    checksum: part.checksum
                }, { transaction: t });
            }

            await User.update(
                { storageUsedBytes: sequelize.literal(`GREATEST(\`storageUsedBytes\` + ${Number(file.size)}, 0)`) },
                { where: { id: user.userId }, transaction: t }
            );
        }

        await t.commit();

        console.log(`✅ Upload complete: ${uploadedFile.displayFilename} (${result.partCount} part(s), encrypted=${result.isEncrypted}${replaced ? ', new version' : ''})`);

        res.status(201).json({
            success: true,
            message: replaced ? 'File updated (previous saved as version)' : 'File uploaded successfully',
            data: { file: uploadedFile, versioned: replaced }
        });

    } catch (error) {
        await t.rollback().catch(() => {});
        console.error('❌ Upload failed:', error.message);

        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                error: 'Validation failed: ' + error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'Upload failed: ' + error.message
        });
    }
}

/**
 * Shared streamer for download & preview. `disposition` is 'attachment' or 'inline'.
 */
async function streamFile(req, res, disposition) {
    try {
        const { id } = req.params;

        const file = await File.findOne({
            where: { id: id, isDeleted: false },
            include: [{ model: FilePart, as: 'parts' }]
        });

        if (!file) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        // Verify ownership or public access
        if (file.isPublic && file.sharedToken) {
            const providedToken = req.query.token;
            if (!providedToken || providedToken !== file.sharedToken) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }
        } else if (file.userId !== req.user.userId) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        // Inline preview does not support encrypted files (fail closed).
        if (disposition === 'inline' && file.isEncrypted) {
            return res.status(409).json({
                success: false,
                error: 'Encrypted files cannot be previewed. Download it instead.'
            });
        }

        if (disposition === 'attachment') {
            await file.incrementDownload();
        }

        const parts = file.parts && file.parts.length > 0
            ? file.parts
            : [{
                partIndex: 0,
                telegramChatId: file.telegramChatId,
                telegramMessageId: file.telegramMessageId,
                telegramFileId: file.telegramFileId,
                partSize: file.fileSize,
                plainSize: file.fileSize,
                encryptionIv: null
            }];

        const totalSize = Number(file.fileSize);

        // Parse HTTP Range header for seek support
        const rangeHeader = req.headers.range;
        let start = 0;
        let end = totalSize - 1;
        let isPartial = false;

        if (rangeHeader) {
            const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
            if (match) {
                if (match[1]) start = parseInt(match[1], 10);
                if (match[2]) end = parseInt(match[2], 10);
                if (isNaN(start)) start = 0;
                if (isNaN(end) || end >= totalSize) end = totalSize - 1;
                if (start > end || start >= totalSize) {
                    res.status(416).setHeader('Content-Range', `bytes */${totalSize}`);
                    return res.end();
                }
                isPartial = true;
            }
        }

        const contentLength = end - start + 1;
        const encodedName = encodeURIComponent(file.displayFilename);

        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', contentLength);
        res.setHeader(
            'Content-Disposition',
            `${disposition}; filename="${file.displayFilename}"; filename*=UTF-8''${encodedName}`
        );

        if (isPartial) {
            res.status(206).setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
        }

        const { stream } = telegramStorage.createReadStream(
            file.userId,
            parts,
            file.encryptionSalt,
            { start, end }
        );

        stream.on('error', (err) => {
            console.error('❌ Stream error:', err.message);
            if (!res.headersSent) {
                res.status(500).json({ success: false, error: 'Streaming failed' });
            } else {
                res.destroy(err);
            }
        });

        stream.pipe(res);

    } catch (error) {
        console.error('❌ Stream failed:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Streaming failed: ' + error.message });
        }
    }
}

/**
 * GET /api/files/:id/download — download as attachment.
 */
async function downloadFile(req, res) {
    return streamFile(req, res, 'attachment');
}

/**
 * GET /api/files/:id/preview — inline stream for in-app viewers (image/pdf/audio/video),
 * with Range support for media seeking. Encrypted files are rejected.
 */
async function previewFile(req, res) {
    return streamFile(req, res, 'inline');
}

/**
 * GET /api/files
 * List all files for current user with pagination
 */
async function listFiles(req, res) {
    try {
        const {
            folderId,
            page = 1,
            limit = 50,
            sortBy = 'createdAt',
            sortOrder = 'DESC',
            includeDeleted = false,
            favorite = false,
            tagId = null
        } = req.query;

        const result = await File.getUserFiles(req.user.userId, {
            folderId: folderId || null,
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy,
            sortOrder,
            includeDeleted: includeDeleted === 'true',
            favorite: favorite === 'true' || favorite === true,
            tagId: tagId || null
        });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('❌ List files failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to list files'
        });
    }
}

/**
 * POST /api/files/:id/share
 * Create shared link for file
 */
async function shareFile(req, res) {
    try {
        const { id } = req.params;
        const { expiresIn, downloadLimit, password } = req.body;

        // Find file
        const file = await File.findOne({
            where: { id: id, userId: req.user.userId, isDeleted: false }
        });

        if (!file) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        // Generate shared link
        const sharedLink = await SharedLink.createLink(id, req.user.userId, {
            expiresIn: parseInt(expiresIn) || null,
            downloadLimit: downloadLimit ? parseInt(downloadLimit) : null,
            password: password || null,
            allowPreview: req.body.allowPreview !== false
        });

        res.status(201).json({
            success: true,
            message: 'Shared link created',
            data: {
                link: {
                    id: sharedLink.id,
                    shortUrl: `${process.env.FRONTEND_URL || ''}/s/${sharedLink.token}`,
                    expiresAt: sharedLink.expiresAt,
                    downloadLimit: sharedLink.downloadLimit,
                    usedDownloads: sharedLink.usedDownloads
                }
            }
        });

    } catch (error) {
        console.error('❌ Share failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to create share link'
        });
    }
}

/**
 * DELETE /api/files/:id
 * Soft delete a file
 */
async function deleteFile(req, res) {
    try {
        const { id } = req.params;
        const deleteFromTelegram = req.query.deleteFromTelegram !== 'false';

        // Find file
        const file = await File.findOne({
            where: { id: id, userId: req.user.userId, isDeleted: false },
            include: [{ model: FilePart, as: 'parts' }]
        });

        if (!file) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        // Delete from Telegram if requested
        if (deleteFromTelegram) {
            try {
                const parts = file.parts && file.parts.length > 0
                    ? file.parts
                    : [{
                        partIndex: 0,
                        telegramChatId: file.telegramChatId,
                        telegramMessageId: file.telegramMessageId
                    }];
                await telegramStorage.deleteFile(req.user.userId, parts);
            } catch (error) {
                console.warn('Warning: Failed to delete from Telegram, but file marked as deleted locally');
            }
        }

        // Soft delete from database
        file.isDeleted = true;
        file.deletedAt = new Date();
        await file.save();

        // Update user storage usage
        await User.update(
            { storageUsedBytes: sequelize.literal(`GREATEST(\`storageUsedBytes\` - ${Number(file.fileSize)}, 0)`) },
            { where: { id: req.user.userId } }
        );

        res.json({
            success: true,
            message: 'File deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to delete file'
        });
    }
}

/**
 * GET /api/files/search
 * Search files by filename for current user
 */
async function searchFiles(req, res) {
    try {
        const { q, page = 1, limit = 50 } = req.query;

        if (!q || !q.trim()) {
            return res.json({
                success: true,
                data: { files: [], total: 0, currentPage: 1, totalPages: 0, hasMore: false }
            });
        }

        const { Op } = require('sequelize');
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const result = await File.findAndCountAll({
            where: {
                userId: req.user.userId,
                isDeleted: false,
                [Op.or]: [
                    { originalFilename: { [Op.like]: `%${q.trim()}%` } },
                    { displayFilename: { [Op.like]: `%${q.trim()}%` } }
                ]
            },
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset,
            attributes: { exclude: ['telegramFileId'] }
        });

        res.json({
            success: true,
            data: {
                files: result.rows,
                total: result.count,
                currentPage: parseInt(page),
                totalPages: Math.ceil(result.count / parseInt(limit)),
                hasMore: offset + parseInt(limit) < result.count
            }
        });
    } catch (error) {
        console.error('❌ Search files failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to search files'
        });
    }
}

/**
 * GET /api/files/:id/versions
 * List version history for a file
 */
async function listVersions(req, res) {
    try {
        const { id } = req.params;

        const file = await File.findOne({
            where: { id, userId: req.user.userId, isDeleted: false }
        });

        if (!file) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        const versions = await versionHistoryService.getVersions(id);

        res.json({
            success: true,
            data: { versions }
        });
    } catch (error) {
        console.error('❌ List versions failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to list versions'
        });
    }
}

/**
 * POST /api/files/:id/revert/:versionId
 * Revert a file to a specific version
 */
async function revertVersion(req, res) {
    try {
        const { id, versionId } = req.params;

        const file = await File.findOne({
            where: { id, userId: req.user.userId, isDeleted: false }
        });

        if (!file) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        const version = await versionHistoryService.revertToVersion(versionId, req.user.userId);

        res.json({
            success: true,
            message: `Reverted to version ${version.versionNumber}`,
            data: { version: version.getMetadata() }
        });
    } catch (error) {
        console.error('❌ Revert version failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to revert version: ' + error.message
        });
    }
}

/**
 * PATCH /api/files/:id
 * Rename (displayFilename) and/or move (folderId) a file.
 */
async function updateFile(req, res) {
    try {
        const { id } = req.params;
        const { displayFilename, folderId, isFavorite } = req.body;

        const file = await File.findOne({
            where: { id, userId: req.user.userId, isDeleted: false }
        });
        if (!file) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        // Validate destination folder if moving
        if (folderId !== undefined) {
            if (folderId === null || folderId === '' || folderId === 'root') {
                file.folderId = null;
            } else {
                const folder = await Folder.findOne({ where: { id: folderId, userId: req.user.userId } });
                if (!folder) {
                    return res.status(404).json({ success: false, error: 'Destination folder not found' });
                }
                file.folderId = folderId;
            }
        }

        // Rename
        if (displayFilename !== undefined) {
            const clean = sanitizeFilename(String(displayFilename).trim());
            if (!clean) {
                return res.status(400).json({ success: false, error: 'Invalid filename' });
            }
            file.displayFilename = clean;
        }

        // Favorite toggle
        if (isFavorite !== undefined) {
            file.isFavorite = isFavorite === true || isFavorite === 'true';
        }

        await file.save();

        res.json({ success: true, message: 'File updated', data: { file } });
    } catch (error) {
        console.error('❌ Update file failed:', error.message);
        res.status(500).json({ success: false, error: 'Failed to update file' });
    }
}

/**
 * PUT /api/files/:id/tags
 * Replace the set of tags on a file: { tagIds: [] }
 */
async function setFileTags(req, res) {
    try {
        const { id } = req.params;
        const { tagIds } = req.body;

        const file = await File.findOne({
            where: { id, userId: req.user.userId, isDeleted: false }
        });
        if (!file) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        const ids = Array.isArray(tagIds) ? tagIds : [];
        // Only allow tags owned by this user
        const tags = ids.length
            ? await Tag.findAll({ where: { id: ids, userId: req.user.userId } })
            : [];

        await file.setTags(tags);

        const refreshed = await File.findByPk(id, {
            include: [{ model: Tag, as: 'tags', attributes: ['id', 'name', 'color'], through: { attributes: [] } }]
        });

        res.json({ success: true, message: 'Tags updated', data: { tags: refreshed.tags } });
    } catch (error) {
        console.error('❌ Set file tags failed:', error.message);
        res.status(500).json({ success: false, error: 'Failed to update tags' });
    }
}

/**
 * POST /api/files/bulk
 * Perform a bulk action on multiple files: { action, fileIds[], folderId? }
 * action: 'delete' | 'move'
 */
async function bulkAction(req, res) {
    const t = await sequelize.transaction();
    try {
        const { action, fileIds, folderId } = req.body;

        if (!Array.isArray(fileIds) || fileIds.length === 0) {
            await t.rollback();
            return res.status(400).json({ success: false, error: 'No files selected' });
        }
        if (!['delete', 'move'].includes(action)) {
            await t.rollback();
            return res.status(400).json({ success: false, error: 'Invalid action' });
        }

        const files = await File.findAll({
            where: { id: { [require('sequelize').Op.in]: fileIds }, userId: req.user.userId, isDeleted: false },
            include: [{ model: FilePart, as: 'parts' }],
            transaction: t
        });

        if (files.length === 0) {
            await t.rollback();
            return res.status(404).json({ success: false, error: 'No matching files found' });
        }

        if (action === 'move') {
            let destFolderId = null;
            if (folderId && folderId !== 'root') {
                const folder = await Folder.findOne({
                    where: { id: folderId, userId: req.user.userId },
                    transaction: t
                });
                if (!folder) {
                    await t.rollback();
                    return res.status(404).json({ success: false, error: 'Destination folder not found' });
                }
                destFolderId = folderId;
            }
            await File.update(
                { folderId: destFolderId },
                { where: { id: { [require('sequelize').Op.in]: files.map(f => f.id) }, userId: req.user.userId }, transaction: t }
            );
            await t.commit();
            return res.json({ success: true, message: `Moved ${files.length} file(s)`, data: { count: files.length } });
        }

        // action === 'delete' (soft delete + best-effort Telegram cleanup)
        let freedBytes = 0;
        for (const file of files) {
            freedBytes += Number(file.fileSize);
            file.isDeleted = true;
            file.deletedAt = new Date();
            await file.save({ transaction: t });
        }

        await User.update(
            { storageUsedBytes: sequelize.literal(`GREATEST(\`storageUsedBytes\` - ${freedBytes}, 0)`) },
            { where: { id: req.user.userId }, transaction: t }
        );

        await t.commit();

        // Delete from Telegram outside the DB transaction (best-effort)
        for (const file of files) {
            const parts = file.parts && file.parts.length > 0
                ? file.parts
                : [{ telegramChatId: file.telegramChatId, telegramMessageId: file.telegramMessageId }];
            telegramStorage.deleteFile(req.user.userId, parts).catch(() => {});
        }

        res.json({ success: true, message: `Deleted ${files.length} file(s)`, data: { count: files.length } });
    } catch (error) {
        await t.rollback().catch(() => {});
        console.error('❌ Bulk action failed:', error.message);
        res.status(500).json({ success: false, error: 'Bulk action failed: ' + error.message });
    }
}

module.exports = {
    uploadFile,
    downloadFile,
    previewFile,
    listFiles,
    searchFiles,
    listVersions,
    revertVersion,
    updateFile,
    setFileTags,
    bulkAction,
    shareFile,
    deleteFile,
    authenticateToken // export for use in routes
};


