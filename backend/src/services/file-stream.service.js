const telegramStorage = require('./telegram-storage.service');
const { File, FilePart } = require('../models');
const { FileServiceError } = require('./file-service-error');
const { generateFileAccessToken } = require('./jwt.service');

function parseRange(rangeHeader, totalSize) {
    if (!rangeHeader) {
        return { start: 0, end: totalSize - 1, isPartial: false };
    }

    const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
    if (!match) {
        return { start: 0, end: totalSize - 1, isPartial: false };
    }

    let start = match[1] ? parseInt(match[1], 10) : 0;
    let end = match[2] ? parseInt(match[2], 10) : totalSize - 1;

    if (Number.isNaN(start)) start = 0;
    if (Number.isNaN(end) || end >= totalSize) end = totalSize - 1;
    if (start > end || start >= totalSize) {
        const error = new FileServiceError(416, 'Requested range is not satisfiable');
        error.totalSize = totalSize;
        throw error;
    }

    return { start, end, isPartial: true };
}

function getFileParts(file) {
    if (file.parts && file.parts.length > 0) {
        return file.parts;
    }

    return [
        {
            partIndex: 0,
            telegramChatId: file.telegramChatId,
            telegramMessageId: file.telegramMessageId,
            telegramFileId: file.telegramFileId,
            partSize: file.fileSize,
            plainSize: file.fileSize,
            encryptionIv: null,
        },
    ];
}

async function createFileAccessToken({ fileId, userId, disposition }) {
    const file = await File.findOne({
        where: { id: fileId, userId, isDeleted: false },
        attributes: ['id'],
    });
    if (!file) {
        throw new FileServiceError(404, 'File not found');
    }

    return generateFileAccessToken({ userId, fileId, disposition });
}

async function createStreamPlan({ fileId, userId, accessToken, disposition, rangeHeader }) {
    const file = await File.findOne({
        where: { id: fileId, isDeleted: false },
        include: [{ model: FilePart, as: 'parts' }],
    });

    if (!file) {
        throw new FileServiceError(404, 'File not found');
    }

    if (file.isPublic && file.sharedToken) {
        if (!accessToken || accessToken !== file.sharedToken) {
            throw new FileServiceError(403, 'Access denied');
        }
    } else if (file.userId !== userId) {
        throw new FileServiceError(403, 'Access denied');
    }

    if (disposition === 'inline' && file.isEncrypted) {
        throw new FileServiceError(409, 'Encrypted files cannot be previewed. Download it instead.');
    }

    if (disposition === 'attachment') {
        await file.incrementDownload();
    }

    const totalSize = Number(file.fileSize);
    const range = parseRange(rangeHeader, totalSize);
    const { stream } = telegramStorage.createReadStream(file.userId, getFileParts(file), file.encryptionSalt, range);

    return {
        contentLength: range.end - range.start + 1,
        contentRange: range.isPartial ? `bytes ${range.start}-${range.end}/${totalSize}` : null,
        file,
        range,
        stream,
    };
}

module.exports = {
    createFileAccessToken,
    createStreamPlan,
    parseRange,
};
