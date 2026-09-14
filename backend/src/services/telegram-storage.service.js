const crypto = require('crypto');
const { Readable, PassThrough } = require('stream');
const botPool = require('./bot-pool.service');
const secrets = require('../config/secrets');
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

function getRetryDelayMs(telegramResponse, attempt) {
    const retryAfterSeconds = Number(telegramResponse?.parameters?.retry_after);

    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
        return Math.ceil(retryAfterSeconds * 1_000);
    }

    return RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
}

function isRetryableTelegramError(error) {
    if (!error.telegramResponse) {
        return true;
    }

    return error.telegramResponse.error_code === 429 || error.telegramResponse.error_code >= 500;
}

function createTelegramError(result, status) {
    const error = new Error(result.description || 'Telegram upload failed');
    error.status = status;
    error.telegramResponse = result;

    return error;
}

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
        return crypto.scryptSync(secrets.encryptionKey, Buffer.from(salt, 'hex'), 32);
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

                throw createTelegramError(result, response.status);
            } catch (error) {
                lastError = error;

                if (attempt === MAX_RETRIES || !isRetryableTelegramError(error)) {
                    break;
                }

                const delay = getRetryDelayMs(error.telegramResponse, attempt);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }

        throw lastError;
    }

    /**
     * Upload a full file buffer as one or more parts. Thin wrapper over
     * uploadStream so both paths share one implementation.
     *
     * @returns {Object} metadata:
     *   { isChunked, partCount, checksum, isEncrypted, encryptionSalt,
     *     parts: [{ partIndex, telegramMessageId, telegramFileId, partSize, plainSize, encryptionIv, checksum }],
     *     telegramChatId }
     */
    async uploadFile(userId, buffer, originalFilename, options = {}) {
        return this.uploadStream(userId, Readable.from(buffer), originalFilename, options);
    }

    /**
     * Encrypt (if requested) and upload one part, returning its FilePart row shape.
     */
    async uploadOnePart(userId, chatId, partIndex, plain, partName, key) {
        const plainChecksum = crypto.createHash('sha256').update(plain).digest('hex');

        let payload = plain;
        let iv = null;
        if (key) {
            const ivBuf = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-ctr', key, ivBuf);
            payload = Buffer.concat([cipher.update(plain), cipher.final()]);
            iv = ivBuf.toString('hex');
        }

        const uploaded = await this.uploadPart(userId, chatId, payload, partName);

        return {
            partIndex,
            telegramChatId: chatId,
            telegramMessageId: uploaded.message_id,
            telegramFileId: uploaded.file_id,
            partSize: payload.length,
            plainSize: plain.length,
            encryptionIv: iv,
            checksum: plainChecksum
        };
    }

    /**
     * Upload a file by consuming a Readable stream, uploading each part as soon
     * as it fills. Peak memory is one part (PART_SIZE), not the whole file —
     * this is what keeps a multi-GB upload out of RSS.
     *
     * @returns {Object} same metadata shape as uploadFile()
     */
    async uploadStream(userId, source, originalFilename, options = {}) {
        const chatId = await this.getStorageChatId(userId);
        const encrypt = options.encrypt === true;
        const maxBytes = Number.isFinite(options.maxBytes) ? options.maxBytes : null;
        const safeName = this.sanitizeFilename(originalFilename);

        let key = null;
        let salt = null;
        if (encrypt) {
            salt = crypto.randomBytes(16).toString('hex');
            key = this.deriveKey(salt);
        }

        // Hash the plaintext incrementally so the full file is never buffered.
        const overallHash = crypto.createHash('sha256');
        const parts = [];
        let plainSize = 0;
        let partIndex = 0;

        const emit = async (plain, isLast) => {
            // A single-part file keeps the original filename; multi-part uses `.partN`.
            const partName = (partIndex === 0 && isLast && parts.length === 0)
                ? safeName
                : `${safeName}.part${partIndex + 1}`;
            parts.push(await this.uploadOnePart(userId, chatId, partIndex, plain, partName, key));
            partIndex++;
        };

        // Whether a part is the last one is only known once the input ends, and
        // that decides its name — so hold each completed part back by one.
        let held = null;
        const hold = async (plain) => {
            if (held !== null) await emit(held, false);
            held = plain;
        };

        let carry = [];
        let carrySize = 0;

        for await (const chunk of source) {
            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            if (maxBytes !== null && plainSize + buf.length > maxBytes) {
                throw new Error('File exceeds upload limit');
            }
            overallHash.update(buf);
            plainSize += buf.length;

            let offset = 0;
            while (offset < buf.length) {
                // Complete a partially filled part first.
                if (carrySize > 0) {
                    const needed = this.PART_SIZE - carrySize;
                    const take = Math.min(needed, buf.length - offset);
                    // Copy slices so a large source chunk is not retained by a
                    // small part's Buffer view after this iteration completes.
                    carry.push(Buffer.from(buf.subarray(offset, offset + take)));
                    carrySize += take;
                    offset += take;

                    if (carrySize === this.PART_SIZE) {
                        await hold(carry.length === 1 ? carry[0] : Buffer.concat(carry, carrySize));
                        carry = [];
                        carrySize = 0;
                    }
                    continue;
                }

                const remaining = buf.length - offset;
                if (remaining >= this.PART_SIZE) {
                    // Copy a bounded slice even when a custom source supplies a
                    // multi-gigabyte chunk in one emission.
                    await hold(Buffer.from(buf.subarray(offset, offset + this.PART_SIZE)));
                    offset += this.PART_SIZE;
                } else {
                    carry = [Buffer.from(buf.subarray(offset))];
                    carrySize = remaining;
                    offset = buf.length;
                }
            }
        }

        if (carrySize > 0) {
            await hold(carry.length === 1 ? carry[0] : Buffer.concat(carry, carrySize));
        }

        // Emit the final held part with the original filename when it is the
        // only part; earlier parts were already emitted as `.partN`.
        await emit(held === null ? Buffer.alloc(0) : held, true);

        if (parts.length === 0) {
            throw new Error('Upload produced no parts');
        }
        if (parts.some((part, index) => part.partIndex !== index)) {
            throw new Error('Upload part sequencing failed');
        }
        if (parts.length > 1 && !parts.every((part, index) => index === parts.length - 1 || part.partSize > 0)) {
            throw new Error('Upload contains an invalid empty part');
        }
        if (parts.length > 1 && parts[parts.length - 1].partIndex !== partIndex - 1) {
            throw new Error('Upload part sequencing failed');
        }

        // `plainSize` is tracked from source chunks, independently of the
        // Telegram payload sizes (which may be encrypted).

        return {
            isChunked: parts.length > 1,
            partCount: parts.length,
            checksum: overallHash.digest('hex'),
            isEncrypted: encrypt,
            encryptionSalt: salt,
            telegramChatId: chatId,
            // Convenience refs for single-part files (backward-compatible columns)
            telegramMessageId: parts[0].telegramMessageId,
            telegramFileId: parts[0].telegramFileId,
            parts,
            plainSize
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

        /**
         * Write and wait for the consumer to catch up when the buffer is full.
         * Without this, a fast Telegram CDN feeding a slow client would pile the
         * whole file into the PassThrough's internal buffer.
         */
        const writeWithBackpressure = (chunk) => {
            if (output.write(chunk)) return Promise.resolve();
            return new Promise((resolve, reject) => {
                const onDrain = () => {
                    output.off('close', onClose);
                    output.off('error', onError);
                    resolve();
                };
                const onClose = () => {
                    output.off('drain', onDrain);
                    output.off('error', onError);
                    reject(new Error('Stream closed by consumer'));
                };
                const onError = (err) => {
                    output.off('drain', onDrain);
                    output.off('close', onClose);
                    reject(err);
                };
                output.once('drain', onDrain);
                output.once('close', onClose);
                output.once('error', onError);
            });
        };

        (async () => {
            try {
                for (const entry of layout) {
                    if (entry.end < start || entry.start > end) continue; // skip parts outside range
                    if (output.destroyed) return; // consumer went away

                    const buf = await self.fetchPart(userId, entry.part, encryptionSalt);

                    // Slice within this part relative to the requested range
                    const sliceStart = Math.max(0, start - entry.start);
                    const sliceEnd = Math.min(entry.size - 1, end - entry.start);
                    await writeWithBackpressure(buf.subarray(sliceStart, sliceEnd + 1));
                }
                output.end();
            } catch (err) {
                if (!output.destroyed) output.destroy(err);
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

const telegramStorageService = new TelegramStorageService();

module.exports = telegramStorageService;
module.exports.getRetryDelayMs = getRetryDelayMs;
