const { FileVersion, FilePart } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Version History Service
 * Snapshots a file's Telegram part references so any version can be restored
 * exactly (works for single-message, chunked, and encrypted files).
 */
class VersionHistoryService {
    constructor() {
        this.MAX_VERSIONS_PER_FILE = 10;
    }

    async getLatestVersion(fileId, options = {}) {
        const versions = await FileVersion.findAll({
            where: { fileId },
            order: [['versionNumber', 'DESC']],
            limit: 1,
            ...options
        });
        return versions[0] || null;
    }

    /**
     * Snapshot the CURRENT state of a file (before it gets overwritten) as a version.
     * @param {Object} file  a File instance
     * @param {Array}  parts array of FilePart instances/POJOs backing the file
     */
    async snapshotCurrent(file, parts, options = {}) {
        const transaction = options.transaction;
        const latest = await this.getLatestVersion(file.id, { transaction });
        const nextVersionNumber = latest ? latest.versionNumber + 1 : 1;

        const partsSnapshot = (parts || []).map((p) => ({
            partIndex: p.partIndex,
            telegramChatId: p.telegramChatId,
            telegramMessageId: p.telegramMessageId,
            telegramFileId: p.telegramFileId,
            partSize: p.partSize,
            plainSize: p.plainSize,
            encryptionIv: p.encryptionIv,
            checksum: p.checksum
        }));

        const version = await FileVersion.create({
            fileId: file.id,
            userId: file.userId,
            versionNumber: nextVersionNumber,
            telegramMessageId: file.telegramMessageId,
            telegramFileId: file.telegramFileId,
            telegramChatId: file.telegramChatId,
            isChunked: file.isChunked,
            partCount: file.partCount,
            isEncrypted: file.isEncrypted,
            encryptionSalt: file.encryptionSalt,
            partsSnapshot: partsSnapshot.length ? JSON.stringify(partsSnapshot) : null,
            originalFilename: file.originalFilename,
            displayFilename: file.displayFilename,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
            checksum: file.checksum
        }, { transaction });

        await this.cleanupOldVersions(file.id, nextVersionNumber - this.MAX_VERSIONS_PER_FILE, { transaction });

        return version;
    }

    async getVersions(fileId) {
        const versions = await FileVersion.findAll({
            where: { fileId },
            order: [['versionNumber', 'DESC']]
        });
        return versions.map((v) => v.getMetadata());
    }

    async getVersion(versionId) {
        return FileVersion.findByPk(versionId);
    }

    /**
     * Restore a file to a stored version. The file's CURRENT state is first
     * snapshotted as a new version, then the file + its parts are rewritten
     * from the target version's snapshot.
     */
    async revertToVersion(versionId, userId) {
        const File = require('../models/File');

        const version = await this.getVersion(versionId);
        if (!version) throw new Error('Version not found');
        if (version.userId !== userId) throw new Error('Unauthorized');

        const file = await File.findByPk(version.fileId, {
            include: [{ model: FilePart, as: 'parts' }]
        });
        if (!file) throw new Error('Original file not found');

        return sequelize.transaction(async (t) => {
            // Snapshot current state before overwriting
            await this.snapshotCurrent(file, file.parts || [], { transaction: t });

            // Rewrite file metadata from the version
            file.displayFilename = version.displayFilename;
            file.originalFilename = version.originalFilename;
            file.mimeType = version.mimeType;
            file.fileSize = version.fileSize;
            file.isChunked = version.isChunked;
            file.partCount = version.partCount;
            file.isEncrypted = version.isEncrypted;
            file.encryptionSalt = version.encryptionSalt;
            file.telegramMessageId = version.telegramMessageId;
            file.telegramFileId = version.telegramFileId;
            file.telegramChatId = version.telegramChatId;
            file.checksum = version.checksum;
            await file.save({ transaction: t });

            // Rewrite parts from snapshot
            await FilePart.destroy({ where: { fileId: file.id }, transaction: t });
            const snapshot = version.partsSnapshot ? JSON.parse(version.partsSnapshot) : [];
            for (const p of snapshot) {
                await FilePart.create({
                    fileId: file.id,
                    partIndex: p.partIndex,
                    telegramChatId: p.telegramChatId,
                    telegramMessageId: p.telegramMessageId,
                    telegramFileId: p.telegramFileId,
                    partSize: p.partSize,
                    plainSize: p.plainSize,
                    encryptionIv: p.encryptionIv,
                    checksum: p.checksum
                }, { transaction: t });
            }

            console.log(`✅ Reverted file ${file.id} to version ${version.versionNumber}`);
            return version;
        });
    }

    async cleanupOldVersions(fileId, keepFromVersion, options = {}) {
        if (keepFromVersion <= 0) return;
        await FileVersion.destroy({
            where: { fileId, versionNumber: { [Op.lt]: keepFromVersion } },
            transaction: options.transaction
        });
    }

    async hasVersions(fileId) {
        const count = await FileVersion.count({ where: { fileId } });
        return count > 0;
    }
}

module.exports = new VersionHistoryService();
