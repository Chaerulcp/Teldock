const crypto = require('crypto');
const { Readable, PassThrough } = require('stream');
const botPool = require('./bot-pool.service');
const { TelegramConfig } = require('../models/TelegramConfig');

/**
 * Telegram Storage Service (teldrive-style)
 *
 * Splits large files into parts, uploads each part as a separate Telegram
 * document (spread across a multi-bot pool), and reassembles them on
 * download with HTTP Range support. Optionally encrypts each part with
 * AES-256-CTR using a per-file key derived from ENCRYPTION_KEY + a random salt.
 */

// Telegram standard Bot API document limit is 50MB; keep parts safely below it.
const DEFAULT_PART_SIZE = 18 * 1024 * 1024; // 18MB
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 1500;

class TelegramStorageService {
    constructor() {
        this.PART_SIZE = parseInt(process.env.TG_PART_SIZE, 10) || DEFAULT_PART_SIZE;
    }

    /**
     * Resolve the storage chat id for a user. Uses the user's connected
     * TelegramConfig; falls back to the env value only in development/testing.
     */
    async getStorageChatId(userId) {
        const config = await TelegramConfig.findByUser(userId);
        if (config && config.storageChatId) {
            return config.storageChatId;
        }
        if (process.env.NODE_ENV !== 'production') {
            const fallback = process.env.TELEGRAM_STORAGE_CHAT_ID;
            if (fallback && fallback !== '-1001234567890') {
                return fallback;
            }
        }
        throw new Error('No Telegram storage channel connected. Set one in Settings → Telegram Integration.');
    }

    sanitizeFilename(filename) {
        return filename.replace(/[<>:"\\|?*]/g, '_').substring(0, 100).trim();
    }

    /**
     * Derive an AES-256 key from the master key + per-file salt.
     */
    deriveKey(salt) {
        const master = process.env.ENCRYPTION_KEY || 'your-secret-encryption-key-change-in-production';
        return crypto.scryptSync(master, Buffer.from(salt, 'hex'), 32);
    }

    /**
     * Split a buffer into fixed-size parts.
     */
    splitBuffer(buffer) {
        const parts = [];
        for (let offset = 0; offset < buffer.length; offset += this.PART_SIZE) {
            parts.push(buffer.subarray(offset, Math.min(offset + this.PART_SIZE, buffer.length)));
        }
        // Handle empty file as a single empty part
        if (parts.length === 0) parts.push(Buffer.alloc(0));
        return parts;
    }

    /**
     * Upload a single part buffer to Telegram, with retries + bot rotation.
     * Returns { file_id, message_id, size }.
     */
    async uploadPart(userId, chatId, partBuffer, partName) {
        let lastError;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const token = await botPool.nextToken(userId);
                const formData = new FormData();
                const blob = new Blob([partBuffer], { type: 'application/octet-stream' });
                formData.append('document', blob, partName);
                formData.append('chat_id', chatId);

                const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.ok && result.result && result.result.document) {
                    return {
                        file_id: result.result.document.file_id,
                        message_id: result.result.message_id,
                        size: partBuffer.length
                    };
                }

                throw new Error(result.description || 'Telegram upload failed');
            } catch (error) {
                lastError = error;
                if (attempt < MAX_RETRIES) {
                    const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
                    await new Promise((r) => setTimeout(r, delay));
                }
            }
        }
        throw lastError;
    }

    /**
     * Upload a full file buffer as one or more parts.
     *
     * @returns {Object} metadata:
     *   { isChunked, partCount, checksum, isEncrypted, encryptionSalt,
     *     parts: [{ partIndex, telegramMessageId, telegramFileId, partSize, plainSize, encryptionIv, checksum }],
     *     telegramChatId }
     */
    async uploadFile(userId, buffer, originalFilename, options = {}) {
        const chatId = await this.getStorageChatId(userId);
        const encrypt = options.encrypt === true;
        const safeName = this.sanitizeFilename(originalFilename);

        const overallChecksum = crypto.createHash('sha256').update(buffer).digest('hex');

        let salt = null;
        let key = null;
        if (encrypt) {
            salt = crypto.randomBytes(16).toString('hex');
            key = this.deriveKey(salt);
        }

        const rawParts = this.splitBuffer(buffer);
        const parts = [];

        for (let i = 0; i < rawParts.length; i++) {
            const plain = rawParts[i];
            const plainChecksum = crypto.createHash('sha256').update(plain).digest('hex');

            let payload = plain;
            let iv = null;
            if (encrypt) {
                const ivBuf = crypto.randomBytes(16);
                const cipher = crypto.createCipheriv('aes-256-ctr', key, ivBuf);
                payload = Buffer.concat([cipher.update(plain), cipher.final()]);
                iv = ivBuf.toString('hex');
            }

            const partName = rawParts.length > 1 ? `${safeName}.part${i + 1}` : safeName;
            const uploaded = await this.uploadPart(userId, chatId, payload, partName);

            parts.push({
                partIndex: i,
                telegramChatId: chatId,
                telegramMessageId: uploaded.message_id,
                telegramFileId: uploaded.file_id,
                partSize: payload.length,
                plainSize: plain.length,
                encryptionIv: iv,
                checksum: plainChecksum
            });
        }

        return {
            isChunked: parts.length > 1,
            partCount: parts.length,
            checksum: overallChecksum,
            isEncrypted: encrypt,
            encryptionSalt: salt,
            telegramChatId: chatId,
            // Convenience refs for single-part files (backward-compatible columns)
            telegramMessageId: parts[0].telegramMessageId,
            telegramFileId: parts[0].telegramFileId,
            parts
        };
    }

    /**
     * Resolve a Telegram file_id to a temporary download URL.
     */
    async resolveDownloadUrl(userId, fileId) {
        const token = await botPool.nextToken(userId);
        const response = await fetch(
            `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`
        );
        const result = await response.json();
        if (!result.ok || !result.result || !result.result.file_path) {
            throw new Error('Unable to resolve Telegram file path');
        }
        return {
            url: `https://api.telegram.org/file/bot${token}/${result.result.file_path}`,
            filePath: result.result.file_path
        };
    }

    /**
     * Fetch a single part's plaintext buffer (decrypting if needed).
     */
    async fetchPart(userId, part, encryptionSalt) {
        const { url } = await this.resolveDownloadUrl(userId, part.telegramFileId);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch part ${part.partIndex}: ${response.status}`);
        }
        let data = Buffer.from(await response.arrayBuffer());

        if (part.encryptionIv && encryptionSalt) {
            const key = this.deriveKey(encryptionSalt);
            const decipher = crypto.createDecipheriv(
                'aes-256-ctr',
                key,
                Buffer.from(part.encryptionIv, 'hex')
            );
            data = Buffer.concat([decipher.update(data), decipher.final()]);
        }

        return data;
    }

    /**
     * Build a Node Readable stream that yields the file bytes for the given
     * byte range [start, end] (inclusive), stitching parts together and
     * decrypting on the fly. Parts are described by `plainSize`.
     *
     * @param {Array} parts       ordered part records (ascending partIndex)
     * @param {Object} rangeOpts  { start, end } inclusive byte offsets
     */
    createReadStream(userId, parts, encryptionSalt, rangeOpts = {}) {
        const ordered = [...parts].sort((a, b) => a.partIndex - b.partIndex);

        // Compute cumulative plaintext offsets
        const layout = [];
        let cursor = 0;
        for (const p of ordered) {
            const size = Number(p.plainSize != null ? p.plainSize : p.partSize);
            layout.push({ part: p, start: cursor, end: cursor + size - 1, size });
            cursor += size;
        }
        const totalSize = cursor;

        const start = rangeOpts.start != null ? rangeOpts.start : 0;
        const end = rangeOpts.end != null ? rangeOpts.end : totalSize - 1;

        const output = new PassThrough();
        const self = this;

        (async () => {
            try {
                for (const entry of layout) {
                    if (entry.end < start || entry.start > end) continue; // skip parts outside range

                    const buf = await self.fetchPart(userId, entry.part, encryptionSalt);

                    // Slice within this part relative to the requested range
                    const sliceStart = Math.max(0, start - entry.start);
                    const sliceEnd = Math.min(entry.size - 1, end - entry.start);
                    output.write(buf.subarray(sliceStart, sliceEnd + 1));
                }
                output.end();
            } catch (err) {
                output.destroy(err);
            }
        })();

        return { stream: output, totalSize, start, end };
    }

    /**
     * Delete all Telegram messages backing a file (best-effort).
     */
    async deleteFile(userId, parts) {
        for (const part of parts) {
            try {
                const token = await botPool.nextToken(userId);
                await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: part.telegramChatId,
                        message_id: part.telegramMessageId
                    })
                });
            } catch (err) {
                console.warn(`Failed to delete part ${part.partIndex}:`, err.message);
            }
        }
    }
}

module.exports = new TelegramStorageService();
