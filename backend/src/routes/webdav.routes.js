const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User, File, Folder, FilePart } = require('../models');
const telegramStorage = require('../services/telegram-storage.service');
const { sanitizeFilename } = require('../middleware/file-upload.middleware');
const { sequelize } = require('../config/database');

/**
 * Minimal WebDAV endpoint for Rclone compatibility.
 *
 * Supports: OPTIONS, PROPFIND (listing), GET (download with Range),
 * PUT (upload), DELETE, MKCOL (create folder), MOVE (rename/move).
 *
 * Authentication: HTTP Basic (email + password). Files are addressed by a
 * flat path model: /webdav/<folderName>/<fileName>. For simplicity folders
 * are matched by name at the root level; nested paths resolve by folder path.
 */

// ---- Basic Auth ----
async function basicAuth(req, res, next) {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="TeleStorage WebDAV"');
        return res.status(401).send('Authentication required');
    }
    try {
        const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
        const idx = decoded.indexOf(':');
        const email = decoded.slice(0, idx);
        const password = decoded.slice(idx + 1);

        const user = await User.findOne({ where: { email } });
        if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
            res.setHeader('WWW-Authenticate', 'Basic realm="TeleStorage WebDAV"');
            return res.status(401).send('Invalid credentials');
        }
        req.davUser = user;
        next();
    } catch (err) {
        res.setHeader('WWW-Authenticate', 'Basic realm="TeleStorage WebDAV"');
        return res.status(401).send('Authentication failed');
    }
}

// Decode the WebDAV path relative to the mount point
function davPath(req) {
    // req.path is everything after /webdav
    let p = decodeURIComponent(req.path || '/');
    if (!p.startsWith('/')) p = '/' + p;
    return p.replace(/\/+$/, '') || '/';
}

function xmlEscape(s) {
    return String(s).replace(/[<>&'"]/g, (c) => ({
        '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
    }[c]));
}

function propfindResponse(href, { isDir, size = 0, mtime = new Date(), ctype = 'application/octet-stream' }) {
    const collProp = isDir ? '<D:resourcetype><D:collection/></D:resourcetype>' : '<D:resourcetype/>';
    const sizeProp = isDir ? '' : `<D:getcontentlength>${size}</D:getcontentlength><D:getcontenttype>${xmlEscape(ctype)}</D:getcontenttype>`;
    return `<D:response>
  <D:href>${xmlEscape(href)}</D:href>
  <D:propstat>
    <D:prop>
      ${collProp}
      <D:getlastmodified>${new Date(mtime).toUTCString()}</D:getlastmodified>
      ${sizeProp}
    </D:prop>
    <D:status>HTTP/1.1 200 OK</D:status>
  </D:propstat>
</D:response>`;
}

router.use(basicAuth);

// OPTIONS - advertise DAV capabilities
router.options(/.*/, (req, res) => {
    res.setHeader('DAV', '1, 2');
    res.setHeader('Allow', 'OPTIONS, GET, HEAD, PUT, DELETE, PROPFIND, MKCOL, MOVE');
    res.setHeader('MS-Author-Via', 'DAV');
    res.status(200).end();
});

// PROPFIND - directory listing
router.propfind(/.*/, async (req, res) => {
    try {
        const userId = req.davUser.id;
        const p = davPath(req);
        const depth = req.headers.depth || '1';

        const responses = [];

        if (p === '/') {
            // Root: list root folders + root files
            responses.push(propfindResponse('/webdav/', { isDir: true }));

            if (depth !== '0') {
                const folders = await Folder.findAll({ where: { userId, parentFolderId: null } });
                for (const f of folders) {
                    responses.push(propfindResponse(`/webdav/${encodeURIComponent(f.name)}/`, {
                        isDir: true, mtime: f.updatedAt
                    }));
                }
                const files = await File.findAll({ where: { userId, folderId: null, isDeleted: false } });
                for (const file of files) {
                    responses.push(propfindResponse(`/webdav/${encodeURIComponent(file.displayFilename)}`, {
                        isDir: false, size: Number(file.fileSize), mtime: file.updatedAt, ctype: file.mimeType
                    }));
                }
            }
        } else {
            // Resolve folder by name path
            const segments = p.split('/').filter(Boolean);
            const folder = await Folder.findOne({ where: { userId, name: segments[segments.length - 1] } });

            if (folder) {
                responses.push(propfindResponse(`/webdav${p}/`, { isDir: true, mtime: folder.updatedAt }));
                if (depth !== '0') {
                    const files = await File.findAll({ where: { userId, folderId: folder.id, isDeleted: false } });
                    for (const file of files) {
                        responses.push(propfindResponse(`/webdav${p}/${encodeURIComponent(file.displayFilename)}`, {
                            isDir: false, size: Number(file.fileSize), mtime: file.updatedAt, ctype: file.mimeType
                        }));
                    }
                }
            } else {
                // Maybe it's a file
                const fileName = segments[segments.length - 1];
                const file = await File.findOne({ where: { userId, displayFilename: fileName, isDeleted: false } });
                if (!file) return res.status(404).end();
                responses.push(propfindResponse(`/webdav${p}`, {
                    isDir: false, size: Number(file.fileSize), mtime: file.updatedAt, ctype: file.mimeType
                }));
            }
        }

        const xml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
${responses.join('\n')}
</D:multistatus>`;

        res.status(207).setHeader('Content-Type', 'application/xml; charset=utf-8').send(xml);
    } catch (error) {
        console.error('WebDAV PROPFIND failed:', error.message);
        res.status(500).end();
    }
});

// GET / HEAD - download a file (with Range support)
async function handleGet(req, res) {
    try {
        const userId = req.davUser.id;
        const p = davPath(req);
        const fileName = p.split('/').filter(Boolean).pop();

        const file = await File.findOne({
            where: { userId, displayFilename: fileName, isDeleted: false },
            include: [{ model: FilePart, as: 'parts' }]
        });
        if (!file) return res.status(404).end();

        const totalSize = Number(file.fileSize);
        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Accept-Ranges', 'bytes');

        if (req.method === 'HEAD') {
            res.setHeader('Content-Length', totalSize);
            return res.status(200).end();
        }

        const parts = file.parts && file.parts.length > 0 ? file.parts : [{
            partIndex: 0, telegramFileId: file.telegramFileId, telegramChatId: file.telegramChatId,
            telegramMessageId: file.telegramMessageId, plainSize: totalSize, encryptionIv: null
        }];

        let start = 0, end = totalSize - 1, partial = false;
        const range = req.headers.range;
        if (range) {
            const m = /bytes=(\d*)-(\d*)/.exec(range);
            if (m) {
                if (m[1]) start = parseInt(m[1], 10);
                if (m[2]) end = parseInt(m[2], 10);
                if (isNaN(end) || end >= totalSize) end = totalSize - 1;
                partial = true;
            }
        }

        res.setHeader('Content-Length', end - start + 1);
        if (partial) {
            res.status(206).setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
        }

        const { stream } = telegramStorage.createReadStream(userId, parts, file.encryptionSalt, { start, end });
        stream.on('error', () => { if (!res.headersSent) res.status(500).end(); else res.destroy(); });
        stream.pipe(res);
    } catch (error) {
        console.error('WebDAV GET failed:', error.message);
        if (!res.headersSent) res.status(500).end();
    }
}
router.get(/.*/, handleGet);
router.head(/.*/, handleGet);

// PUT - upload a file
router.put(/.*/, express.raw({ type: '*/*', limit: process.env.MAX_UPLOAD_BYTES || '2gb' }), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const userId = req.davUser.id;
        const p = davPath(req);
        const segments = p.split('/').filter(Boolean);
        const fileName = sanitizeFilename(segments.pop());

        // Resolve folder (if nested)
        let folderId = null;
        if (segments.length > 0) {
            const folder = await Folder.findOne({ where: { userId, name: segments[segments.length - 1] }, transaction: t });
            if (folder) folderId = folder.id;
        }

        const buffer = req.body && req.body.length ? req.body : Buffer.alloc(0);
        const result = await telegramStorage.uploadFile(userId, buffer, fileName, { encrypt: false });

        const file = await File.create({
            userId, folderId,
            telegramChatId: result.telegramChatId,
            telegramMessageId: result.telegramMessageId,
            telegramFileId: result.telegramFileId,
            originalFilename: fileName,
            displayFilename: fileName,
            mimeType: req.headers['content-type'] || 'application/octet-stream',
            fileSize: buffer.length,
            isChunked: result.isChunked,
            partCount: result.partCount,
            isEncrypted: result.isEncrypted,
            encryptionSalt: result.encryptionSalt,
            checksum: result.checksum
        }, { transaction: t });

        for (const part of result.parts) {
            await FilePart.create({ fileId: file.id, ...part }, { transaction: t });
        }

        await User.update(
            { storageUsedBytes: sequelize.literal(`storage_used_bytes + ${buffer.length}`) },
            { where: { id: userId }, transaction: t }
        );

        await t.commit();
        res.status(201).end();
    } catch (error) {
        await t.rollback().catch(() => {});
        console.error('WebDAV PUT failed:', error.message);
        res.status(500).end();
    }
});

// DELETE - remove a file or folder
router.delete(/.*/, async (req, res) => {
    try {
        const userId = req.davUser.id;
        const p = davPath(req);
        const name = p.split('/').filter(Boolean).pop();

        const file = await File.findOne({
            where: { userId, displayFilename: name, isDeleted: false },
            include: [{ model: FilePart, as: 'parts' }]
        });
        if (file) {
            const parts = file.parts && file.parts.length ? file.parts : [{
                partIndex: 0, telegramChatId: file.telegramChatId, telegramMessageId: file.telegramMessageId
            }];
            await telegramStorage.deleteFile(userId, parts).catch(() => {});
            file.isDeleted = true;
            file.deletedAt = new Date();
            await file.save();
            await User.update(
                { storageUsedBytes: sequelize.literal(`GREATEST(storage_used_bytes - ${Number(file.fileSize)}, 0)`) },
                { where: { id: userId } }
            );
            return res.status(204).end();
        }

        const folder = await Folder.findOne({ where: { userId, name } });
        if (folder) {
            await folder.destroy();
            return res.status(204).end();
        }

        res.status(404).end();
    } catch (error) {
        console.error('WebDAV DELETE failed:', error.message);
        res.status(500).end();
    }
});

// MKCOL - create a folder
router.mkcol(/.*/, async (req, res) => {
    try {
        const userId = req.davUser.id;
        const p = davPath(req);
        const name = p.split('/').filter(Boolean).pop();
        if (!name) return res.status(400).end();

        const existing = await Folder.findOne({ where: { userId, path: `/${name}` } });
        if (existing) return res.status(405).end();

        await Folder.create({ userId, name, parentFolderId: null, path: `/${name}`, depth: 0 });
        res.status(201).end();
    } catch (error) {
        console.error('WebDAV MKCOL failed:', error.message);
        res.status(500).end();
    }
});

// MOVE - rename a file
router.move(/.*/, async (req, res) => {
    try {
        const userId = req.davUser.id;
        const p = davPath(req);
        const name = p.split('/').filter(Boolean).pop();
        const dest = req.headers.destination || '';
        const newName = sanitizeFilename(decodeURIComponent(dest.split('/').filter(Boolean).pop() || ''));
        if (!newName) return res.status(400).end();

        const file = await File.findOne({ where: { userId, displayFilename: name, isDeleted: false } });
        if (!file) return res.status(404).end();

        file.displayFilename = newName;
        await file.save();
        res.status(201).end();
    } catch (error) {
        console.error('WebDAV MOVE failed:', error.message);
        res.status(500).end();
    }
});

module.exports = router;
