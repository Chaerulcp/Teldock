const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const {
    bulkActionSchema,
    setFileTagsSchema,
    shareFileSchema,
    updateFileSchema,
} = require('../src/validation/file.validation');

const fileId = '9c7b5076-5d89-4fa5-9bb7-8f6fc9d6f8e3';
const MAX_SHARE_DURATION_SECONDS = 31_536_000;
const MAX_DOWNLOAD_LIMIT = 1_000_000;
const MAX_PASSWORD_BYTES = 72;
const MAX_SELECTED_FILES = 100;
const MAX_TAGS_PER_FILE = 100;

function uniqueIds(count) {
    return Array.from({ length: count }, () => randomUUID());
}

test('shareFileSchema accepts share durations up to one year', () => {
    assert.equal(shareFileSchema.safeParse({ expiresIn: MAX_SHARE_DURATION_SECONDS }).success, true);
    assert.equal(shareFileSchema.safeParse({ expiresIn: MAX_SHARE_DURATION_SECONDS + 1 }).success, false);
});

test('shareFileSchema requires a positive integer share duration', () => {
    for (const invalid of [0, -1, 1.5, 'not-a-number']) {
        assert.equal(
            shareFileSchema.safeParse({ expiresIn: invalid }).success,
            false,
            `expected "${invalid}" to be rejected`,
        );
    }
});

test('shareFileSchema coerces numeric share duration strings', () => {
    const result = shareFileSchema.safeParse({ expiresIn: '3600' });

    assert.equal(result.success, true);
    assert.equal(result.data.expiresIn, 3600);
});

test('shareFileSchema bounds the download limit', () => {
    assert.equal(shareFileSchema.safeParse({ downloadLimit: MAX_DOWNLOAD_LIMIT }).success, true);
    assert.equal(shareFileSchema.safeParse({ downloadLimit: MAX_DOWNLOAD_LIMIT + 1 }).success, false);
});

test('shareFileSchema enforces the bcrypt password byte limit', () => {
    assert.equal(shareFileSchema.safeParse({ password: 'a'.repeat(MAX_PASSWORD_BYTES) }).success, true);
    assert.equal(shareFileSchema.safeParse({ password: 'a'.repeat(MAX_PASSWORD_BYTES + 1) }).success, false);
    // 37 two-byte characters are 74 UTF-8 bytes and cannot be bcrypt hashed safely.
    assert.equal(shareFileSchema.safeParse({ password: '\u00e9'.repeat(37) }).success, false);
});

test('shareFileSchema rejects an empty password and non-boolean preview flag', () => {
    assert.equal(shareFileSchema.safeParse({ password: '' }).success, false);
    assert.equal(shareFileSchema.safeParse({ allowPreview: 'yes' }).success, false);
});

test('shareFileSchema rejects unknown keys and accepts an empty control set', () => {
    assert.equal(shareFileSchema.safeParse({ unexpected: true }).success, false);
    assert.equal(shareFileSchema.safeParse({}).success, true);
});

test('updateFileSchema accepts root, empty, null and uuid folder identifiers', () => {
    assert.equal(updateFileSchema.safeParse({ folderId: 'root' }).success, true);
    assert.equal(updateFileSchema.safeParse({ folderId: '' }).success, true);
    assert.equal(updateFileSchema.safeParse({ folderId: null }).success, true);
    assert.equal(updateFileSchema.safeParse({ folderId: fileId }).success, true);
});

test('updateFileSchema rejects a folder id that is not a uuid or root marker', () => {
    assert.equal(updateFileSchema.safeParse({ folderId: 'not-a-uuid' }).success, false);
});

test('updateFileSchema bounds and trims the display filename', () => {
    const result = updateFileSchema.safeParse({ displayFilename: `  ${'a'.repeat(500)}  ` });
    assert.equal(result.success, true);
    assert.equal(result.data.displayFilename.length, 500);

    assert.equal(updateFileSchema.safeParse({ displayFilename: '' }).success, false);
    assert.equal(updateFileSchema.safeParse({ displayFilename: 'a'.repeat(501) }).success, false);
});

test('bulkActionSchema accepts at most 100 unique file ids', () => {
    assert.equal(bulkActionSchema.safeParse({ action: 'delete', fileIds: uniqueIds(MAX_SELECTED_FILES) }).success, true);
    assert.equal(
        bulkActionSchema.safeParse({ action: 'delete', fileIds: uniqueIds(MAX_SELECTED_FILES + 1) }).success,
        false,
    );
});

test('bulkActionSchema requires a supported action and unique file ids', () => {
    assert.equal(bulkActionSchema.safeParse({ action: 'archive', fileIds: [fileId] }).success, false);
    assert.equal(bulkActionSchema.safeParse({ action: 'delete', fileIds: [fileId, fileId] }).success, false);
});

test('bulkActionSchema accepts a move into the root folder', () => {
    assert.equal(bulkActionSchema.safeParse({ action: 'move', fileIds: [fileId], folderId: 'root' }).success, true);
});

test('setFileTagsSchema accepts at most 100 unique tag ids', () => {
    assert.equal(setFileTagsSchema.safeParse({ tagIds: uniqueIds(MAX_TAGS_PER_FILE) }).success, true);
    assert.equal(setFileTagsSchema.safeParse({ tagIds: uniqueIds(MAX_TAGS_PER_FILE + 1) }).success, false);
});
