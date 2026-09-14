const { FileServiceError } = require('../services/file-service-error');
const fileManagementService = require('../services/file-management.service');
const fileQueryService = require('../services/file-query.service');
const fileStreamService = require('../services/file-stream.service');
const fileUploadService = require('../services/file-upload.service');

function sendError(res, error, fallbackMessage) {
    if (error instanceof FileServiceError) {
        if (error.statusCode === 416) {
            res.setHeader('Content-Range', `bytes */${error.totalSize || '*'}`);
            return res.status(416).end();
        }

        return res.status(error.statusCode).json({ success: false, error: error.message });
    }

    console.error(fallbackMessage, error.message);
    return res.status(500).json({ success: false, error: fallbackMessage });
}

async function uploadFile(req, res) {
    try {
        const result = await fileUploadService.uploadFile({
            userId: req.user.userId,
            file: req.file,
            folderId: req.body.folderId || null,
            encrypt: req.body.encrypt === 'true' || req.body.encrypt === true,
            fileLimitReached: req.fileLimitReached,
        });

        return res.status(201).json({
            success: true,
            message: result.replaced ? 'File updated (previous saved as version)' : 'File uploaded successfully',
            data: { file: result.file, versioned: result.replaced },
        });
    } catch (error) {
        return sendError(res, error, 'Upload failed');
    }
}

async function streamFile(req, res, disposition) {
    try {
        const plan = await fileStreamService.createStreamPlan({
            fileId: req.params.id,
            userId: req.user.userId,
            accessToken: req.query.token,
            disposition,
            rangeHeader: req.headers.range,
        });
        const encodedName = encodeURIComponent(plan.file.displayFilename);

        res.setHeader('Content-Type', plan.file.mimeType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', plan.contentLength);
        res.setHeader(
            'Content-Disposition',
            `${disposition}; filename="${plan.file.displayFilename}"; filename*=UTF-8''${encodedName}`,
        );
        if (plan.contentRange) {
            res.status(206).setHeader('Content-Range', plan.contentRange);
        }

        plan.stream.on('error', (error) => {
            console.error('Stream error:', error.message);
            if (!res.headersSent) {
                res.status(500).json({ success: false, error: 'Streaming failed' });
                return;
            }
            res.destroy(error);
        });
        plan.stream.pipe(res);
    } catch (error) {
        return sendError(res, error, 'Streaming failed');
    }
}

async function createFileAccessUrl(req, res, disposition) {
    try {
        const signature = await fileStreamService.createFileAccessToken({
            fileId: req.params.id,
            userId: req.user.userId,
            disposition,
        });
        const resource = disposition === 'inline' ? 'preview' : 'download';
        const url = `/api/files/${encodeURIComponent(req.params.id)}/${resource}?signature=${encodeURIComponent(signature)}`;

        return res.json({ success: true, data: { url } });
    } catch (error) {
        return sendError(res, error, 'Failed to create file access URL');
    }
}

function createPreviewUrl(req, res) {
    return createFileAccessUrl(req, res, 'inline');
}

function createDownloadUrl(req, res) {
    return createFileAccessUrl(req, res, 'attachment');
}

function downloadFile(req, res) {
    return streamFile(req, res, 'attachment');
}

function previewFile(req, res) {
    return streamFile(req, res, 'inline');
}

async function listFiles(req, res) {
    try {
        const result = await fileQueryService.listFiles(req.user.userId, req.query);
        return res.json({ success: true, data: result });
    } catch (error) {
        return sendError(res, error, 'Failed to list files');
    }
}

async function searchFiles(req, res) {
    try {
        const result = await fileQueryService.searchFiles(req.user.userId, req.query);
        return res.json({ success: true, data: result });
    } catch (error) {
        return sendError(res, error, 'Failed to search files');
    }
}

async function shareFile(req, res) {
    try {
        const link = await fileManagementService.createShare(req.params.id, req.user.userId, req.body);
        return res.status(201).json({ success: true, message: 'Shared link created', data: { link } });
    } catch (error) {
        return sendError(res, error, 'Failed to create share link');
    }
}

async function deleteFile(req, res) {
    try {
        await fileManagementService.deleteFile(
            req.params.id,
            req.user.userId,
            req.query.deleteFromTelegram !== 'false',
        );
        return res.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
        return sendError(res, error, 'Failed to delete file');
    }
}

async function listVersions(req, res) {
    try {
        const versions = await fileQueryService.listVersions(req.params.id, req.user.userId);
        return res.json({ success: true, data: { versions } });
    } catch (error) {
        return sendError(res, error, 'Failed to list versions');
    }
}

async function revertVersion(req, res) {
    try {
        const version = await fileQueryService.revertVersion(req.params.id, req.params.versionId, req.user.userId);
        return res.json({
            success: true,
            message: `Reverted to version ${version.versionNumber}`,
            data: { version: version.getMetadata() },
        });
    } catch (error) {
        return sendError(res, error, 'Failed to revert version');
    }
}

async function updateFile(req, res) {
    try {
        const file = await fileManagementService.updateFile(req.params.id, req.user.userId, req.body);
        return res.json({ success: true, message: 'File updated', data: { file } });
    } catch (error) {
        return sendError(res, error, 'Failed to update file');
    }
}

async function setFileTags(req, res) {
    try {
        const tags = await fileManagementService.setFileTags(req.params.id, req.user.userId, req.body.tagIds);
        return res.json({ success: true, message: 'Tags updated', data: { tags } });
    } catch (error) {
        return sendError(res, error, 'Failed to update tags');
    }
}

async function bulkAction(req, res) {
    try {
        const result = await fileManagementService.bulkAction(req.user.userId, req.body);
        const message = result.action === 'move' ? `Moved ${result.count} file(s)` : `Deleted ${result.count} file(s)`;
        return res.json({ success: true, message, data: { count: result.count } });
    } catch (error) {
        return sendError(res, error, 'Bulk action failed');
    }
}

module.exports = {
    bulkAction,
    createDownloadUrl,
    createPreviewUrl,
    deleteFile,
    downloadFile,
    listFiles,
    listVersions,
    previewFile,
    revertVersion,
    searchFiles,
    setFileTags,
    shareFile,
    updateFile,
    uploadFile,
};
