const { sequelize } = require('../config/database');
const { File, FilePart, Folder, User } = require('../models');
const { sanitizeFilename } = require('../middleware/file-upload.middleware');
const telegramStorage = require('./telegram-storage.service');
const versionHistoryService = require('./version-history.service');
const { FileServiceError } = require('./file-service-error');

const DEFAULT_MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

function getMaxUploadBytes() {
    return parseInt(process.env.MAX_UPLOAD_BYTES, 10) || DEFAULT_MAX_UPLOAD_BYTES;
}

async function assertUploadTarget(userId, folderId, transaction) {
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
        throw new FileServiceError(404, 'User not found');
    }

    if (!folderId) {
        return;
    }

    const folder = await Folder.findOne({
        where: { id: folderId, userId },
        transaction,
    });
    if (!folder) {
        throw new FileServiceError(404, 'Folder not found');
    }
}

async function createFileParts(fileId, parts, transaction) {
    for (const part of parts) {
        await FilePart.create(
            {
                fileId,
                partIndex: part.partIndex,
                telegramChatId: part.telegramChatId,
                telegramMessageId: part.telegramMessageId,
                telegramFileId: part.telegramFileId,
                partSize: part.partSize,
                plainSize: part.plainSize,
                encryptionIv: part.encryptionIv,
                checksum: part.checksum,
            },
            { transaction },
        );
    }
}

function buildFileValues(file, folderId, displayFilename, uploadResult) {
    return {
        folderId: folderId || null,
        telegramChatId: uploadResult.telegramChatId,
        telegramMessageId: uploadResult.telegramMessageId,
        telegramFileId: uploadResult.telegramFileId,
        originalFilename: file.originalname,
        displayFilename,
        mimeType: file.mimetype,
        fileSize: uploadResult.plainSize,
        isChunked: uploadResult.isChunked,
        partCount: uploadResult.partCount,
        isEncrypted: uploadResult.isEncrypted,
        encryptionSalt: uploadResult.encryptionSalt,
        checksum: uploadResult.checksum,
    };
}

async function updateStorageUsage(userId, byteDelta, transaction) {
    await User.update(
        { storageUsedBytes: sequelize.literal(`GREATEST(\`storageUsedBytes\` + ${byteDelta}, 0)`) },
        { where: { id: userId }, transaction },
    );
}

async function persistUpload(userId, file, folderId, uploadResult, transaction) {
    const displayFilename = sanitizeFilename(file.originalname);
    const existing = await File.findOne({
        where: { userId, folderId: folderId || null, displayFilename, isDeleted: false },
        include: [{ model: FilePart, as: 'parts' }],
        transaction,
    });
    const values = buildFileValues(file, folderId, displayFilename, uploadResult);

    if (!existing) {
        const uploadedFile = await File.create({ userId, ...values }, { transaction });
        await createFileParts(uploadedFile.id, uploadResult.parts, transaction);
        await updateStorageUsage(userId, Number(uploadResult.plainSize), transaction);

        return { file: uploadedFile, replaced: false };
    }

    const previousSize = Number(existing.fileSize) || 0;
    await versionHistoryService.snapshotCurrent(existing, existing.parts || [], { transaction });
    await FilePart.destroy({ where: { fileId: existing.id }, transaction });
    await existing.update(values, { transaction });
    await createFileParts(existing.id, uploadResult.parts, transaction);
    await updateStorageUsage(userId, Number(uploadResult.plainSize) - previousSize, transaction);

    return { file: existing, replaced: true };
}

async function uploadFile({ userId, file, folderId, encrypt, fileLimitReached }) {
    const transaction = await sequelize.transaction();
    let uploadResult;

    try {
        await assertUploadTarget(userId, folderId, transaction);
        uploadResult = await telegramStorage.uploadStream(userId, file.stream, file.originalname, {
            encrypt,
            maxBytes: getMaxUploadBytes(),
        });

        if (file.limitReached || fileLimitReached) {
            await telegramStorage.deleteFile(userId, uploadResult.parts).catch(() => {});
            throw new FileServiceError(413, 'File too large');
        }

        const result = await persistUpload(userId, file, folderId, uploadResult, transaction);
        await transaction.commit();

        return result;
    } catch (error) {
        await transaction.rollback().catch(() => {});
        throw error;
    }
}

module.exports = { uploadFile };
