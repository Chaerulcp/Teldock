const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');

// The service only reads ENCRYPTION_KEY when encryption is enabled. Supplying a
// test value keeps this file runnable without loading the deployment .env.
process.env.ENCRYPTION_KEY ||= 'test-encryption-key-that-is-long-enough-32';

const telegramStorage = require('../src/services/telegram-storage.service');
const originalUploadOnePart = telegramStorage.uploadOnePart;
const originalFetchPart = telegramStorage.fetchPart;
const originalGetStorageChatId = telegramStorage.getStorageChatId;

function stubUploader(partSize = 4) {
    telegramStorage.PART_SIZE = partSize;
    telegramStorage.getStorageChatId = async () => 'test-chat';

    const uploaded = [];
    telegramStorage.uploadOnePart = async (userId, chatId, partIndex, plain, partName) => {
        uploaded.push({ userId, chatId, partIndex, plain: Buffer.from(plain), partName });
        return {
            partIndex,
            telegramChatId: chatId,
            telegramMessageId: `message-${partIndex}`,
            telegramFileId: `file-${partIndex}`,
            partSize: plain.length,
            plainSize: plain.length,
            encryptionIv: null,
            checksum: 'test-checksum'
        };
    };
    return uploaded;
}

test('uploadStream splits chunks without buffering the complete input', async () => {
    const uploaded = stubUploader(4);
    const source = Readable.from([Buffer.from('abc'), Buffer.from('defghij')]);

    const result = await telegramStorage.uploadStream('user-1', source, 'archive.bin');

    assert.deepEqual(uploaded.map((part) => part.plain.toString()), ['abcd', 'efgh', 'ij']);
    assert.deepEqual(uploaded.map((part) => part.partName), [
        'archive.bin.part1',
        'archive.bin.part2',
        'archive.bin.part3'
    ]);
    assert.equal(result.partCount, 3);
    assert.equal(result.isChunked, true);
    assert.equal(result.plainSize, 10);
    assert.equal(result.checksum.length, 64);
});

test('uploadStream preserves the original name for a single-part file', async () => {
    const uploaded = stubUploader(4);

    const result = await telegramStorage.uploadStream(
        'user-1',
        Readable.from([Buffer.from('abc')]),
        'photo.jpg'
    );

    assert.equal(uploaded.length, 1);
    assert.equal(uploaded[0].partName, 'photo.jpg');
    assert.equal(uploaded[0].plain.toString(), 'abc');
    assert.equal(result.isChunked, false);
});

test('uploadStream creates one empty part for an empty file', async () => {
    const uploaded = stubUploader(4);

    const result = await telegramStorage.uploadStream(
        'user-1',
        Readable.from([]),
        'empty.txt'
    );

    assert.equal(uploaded.length, 1);
    assert.equal(uploaded[0].partName, 'empty.txt');
    assert.equal(uploaded[0].plain.length, 0);
    assert.equal(result.plainSize, 0);
});

test('uploadStream rejects input beyond maxBytes', async () => {
    const uploaded = stubUploader(4);

    await assert.rejects(
        telegramStorage.uploadStream(
            'user-1',
            Readable.from([Buffer.from('12345')]),
            'too-large.bin',
            { maxBytes: 4 }
        ),
        /File exceeds upload limit/
    );
    assert.equal(uploaded.length, 0);
});

test('createReadStream returns all requested bytes in order', async () => {
    telegramStorage.fetchPart = async (userId, part) => {
        telegramStorage._fetchCalls = (telegramStorage._fetchCalls || 0) + 1;
        return Buffer.from(part.content);
    };

    const { stream } = telegramStorage.createReadStream('user-1', [
        { partIndex: 0, plainSize: 8, content: '12345678' },
        { partIndex: 1, plainSize: 8, content: 'abcdefgh' }
    ]);

    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString(), '12345678abcdefgh');
    assert.equal(telegramStorage._fetchCalls, 2);
    delete telegramStorage._fetchCalls;
});

test('createReadStream honors a byte range across parts', async () => {
    telegramStorage.fetchPart = async (userId, part) => Buffer.from(part.content);

    const { stream, totalSize, start, end } = telegramStorage.createReadStream('user-1', [
        { partIndex: 0, plainSize: 4, content: 'abcd' },
        { partIndex: 1, plainSize: 4, content: 'efgh' }
    ], null, { start: 2, end: 5 });

    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    assert.equal(totalSize, 8);
    assert.equal(start, 2);
    assert.equal(end, 5);
    assert.equal(Buffer.concat(chunks).toString(), 'cdef');
});


test.after(() => {
    // Restore methods if this file is loaded alongside another test file.
    telegramStorage.uploadOnePart = originalUploadOnePart;
    telegramStorage.fetchPart = originalFetchPart;
    telegramStorage.getStorageChatId = originalGetStorageChatId;
    delete telegramStorage._fetchCalls;
});

module.exports = { stubUploader };

// Keep the helper export available for focused tests without adding a test case.
assert.equal(typeof stubUploader, 'function');


