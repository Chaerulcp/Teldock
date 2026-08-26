const { FileVersion } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');

/**
 * Version History Service
 * Manages file versioning with rollback capability
 */
class VersionHistoryService {
    constructor() {
        this.MAX_VERSIONS_PER_FILE = 10; // Keep last 10 versions
    }

    /**
     * Create new version for a file
     */
    async createVersion(userId, fileId, telegramMessageId, fileInfo) {
        try {
            // Get current file's latest version number
            const currentVersion = await this.getLatestVersion(fileId);
            const nextVersionNumber = currentVersion 
                ? currentVersion.versionNumber + 1 
                : 1;

            // Calculate checksum
            const checksum = crypto.createHash('md5')
                .update(JSON.stringify(fileInfo))
                .digest('hex');

            // Create version record
            const version = await FileVersion.create({
                fileId,
                telegramMessageId,
                userId,
                versionNumber: nextVersionNumber,
                originalFilename: fileInfo.originalFilename || fileInfo.displayFilename,
                displayFilename: fileInfo.displayFilename,
                mimeType: fileInfo.mimeType,
                fileSize: fileInfo.fileSize,
                checksum
            });

            // Clean up old versions if exceeds limit
            await this.cleanupOldVersions(fileId, nextVersionNumber - this.MAX_VERSIONS_PER_FILE);

            return version;
        } catch (error) {
            console.error('Error creating version:', error.message);
            throw error;
        }
    }

    /**
     * Get all versions of a file
     */
    async getVersions(fileId) {
        const versions = await FileVersion.findAll({
            where: { fileId },
            order: [['createdAt', 'DESC']]
        });

        return versions.map(v => v.getMetadata());
    }

    /**
     * Get specific version by ID
     */
    async getVersion(versionId) {
        return FileVersion.findByPk(versionId);
    }

    /**
     * Get latest version of a file
     */
    async getLatestVersion(fileId) {
        const versions = await FileVersion.findAll({
            where: { fileId },
            order: [['versionNumber', 'DESC']],
            limit: 1
        });

        return versions[0] || null;
    }

    /**
     * Revert file to specific version
     */
    async revertToFileId(versionId, userId) {
        const version = await this.getVersion(versionId);
        
        if (!version) {
            throw new Error('Version not found');
        }

        if (version.userId !== userId) {
            throw new Error('Unauthorized');
        }

        // Revert to selected version
        await version.revertToFile();

        return version;
    }

    /**
     * Delete old versions keeping only latest N versions
     */
    async cleanupOldVersions(fileId, keepFromVersion) {
        if (keepFromVersion <= 0) return;

        await FileVersion.destroy({
            where: {
                fileId,
                versionNumber: { [Op.lt]: keepFromVersion }
            }
        });
    }

    /**
     * Check if file has multiple versions
     */
    async hasMultipleVersions(fileId) {
        const count = await FileVersion.count({ where: { fileId } });
        return count > 1;
    }
}

module.exports = new VersionHistoryService();
