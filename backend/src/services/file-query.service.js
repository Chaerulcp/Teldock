const { Op } = require('sequelize');
const { File } = require('../models');
const versionHistoryService = require('./version-history.service');
const { FileServiceError } = require('./file-service-error');

function parseNumber(value, fallback) {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

async function listFiles(userId, query) {
    const {
        folderId,
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        includeDeleted = false,
        favorite = false,
        tagId = null,
    } = query;

    return File.getUserFiles(userId, {
        folderId: folderId || null,
        page: parseNumber(page, 1),
        limit: parseNumber(limit, 50),
        sortBy,
        sortOrder,
        includeDeleted: includeDeleted === 'true',
        favorite: favorite === 'true' || favorite === true,
        tagId: tagId || null,
    });
}

async function searchFiles(userId, query) {
    const { q, page = 1, limit = 50 } = query;
    if (!q || !q.trim()) {
        return { files: [], total: 0, currentPage: 1, totalPages: 0, hasMore: false };
    }

    const currentPage = parseNumber(page, 1);
    const pageSize = parseNumber(limit, 50);
    const offset = (currentPage - 1) * pageSize;
    const searchTerm = q.trim();
    const result = await File.findAndCountAll({
        where: {
            userId,
            isDeleted: false,
            [Op.or]: [
                { originalFilename: { [Op.like]: `%${searchTerm}%` } },
                { displayFilename: { [Op.like]: `%${searchTerm}%` } },
            ],
        },
        order: [['createdAt', 'DESC']],
        limit: pageSize,
        offset,
        attributes: { exclude: ['telegramFileId'] },
    });

    return {
        files: result.rows,
        total: result.count,
        currentPage,
        totalPages: Math.ceil(result.count / pageSize),
        hasMore: offset + pageSize < result.count,
    };
}

async function assertOwnedFile(fileId, userId) {
    const file = await File.findOne({ where: { id: fileId, userId, isDeleted: false } });
    if (!file) {
        throw new FileServiceError(404, 'File not found');
    }

    return file;
}

async function listVersions(fileId, userId) {
    await assertOwnedFile(fileId, userId);
    return versionHistoryService.getVersions(fileId);
}

async function revertVersion(fileId, versionId, userId) {
    await assertOwnedFile(fileId, userId);
    return versionHistoryService.revertToVersion(versionId, userId);
}

module.exports = {
    listFiles,
    listVersions,
    revertVersion,
    searchFiles,
};
