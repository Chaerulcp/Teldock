const test = require('node:test');
const assert = require('node:assert/strict');

const {
    bulkActionSchema,
    setFileTagsSchema,
    shareFileSchema,
    updateFileSchema,
} = require('../src/validation/file.validation');

const fileId = '9c7b5076-5d89-4fa5-9bb7-8f6fc9d6f8e3';
const folderId = '0b4dfc7b-8ce3-4a2d-9a55-21ad0b6b730b';
const tagId = 'e1d1fc4a-6f2c-4389-9c71-9e770e48e2f8';

test('shareFileSchema accepts supported share controls', () => {
    const result = shareFileSchema.safeParse({
        expiresIn: 86_400,
        downloadLimit: 5,
        password: 'share-password',
        allowPreview: false,
    });

    assert.equal(result.success, true);
});

test('shareFileSchema rejects unsupported or unsafe values', () => {
    const result = shareFileSchema.safeParse({
        expiresIn: -1,
        unexpected: true,
    });

    assert.equal(result.success, false);
});

test('updateFileSchema accepts one supported mutation', () => {
    const result = updateFileSchema.safeParse({
        displayFilename: ' report.pdf ',
        folderId,
        isFavorite: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.data.displayFilename, 'report.pdf');
});

test('updateFileSchema rejects empty or unknown updates', () => {
    assert.equal(updateFileSchema.safeParse({}).success, false);
    assert.equal(updateFileSchema.safeParse({ isDeleted: true }).success, false);
});

test('setFileTagsSchema rejects duplicate or malformed tag identifiers', () => {
    assert.equal(setFileTagsSchema.safeParse({ tagIds: [tagId] }).success, true);
    assert.equal(setFileTagsSchema.safeParse({ tagIds: [tagId, tagId] }).success, false);
    assert.equal(setFileTagsSchema.safeParse({ tagIds: ['invalid-id'] }).success, false);
});

test('bulkActionSchema validates the action and selected file identifiers', () => {
    assert.equal(bulkActionSchema.safeParse({ action: 'move', fileIds: [fileId], folderId }).success, true);
    assert.equal(bulkActionSchema.safeParse({ action: 'archive', fileIds: [fileId] }).success, false);
    assert.equal(bulkActionSchema.safeParse({ action: 'delete', fileIds: [] }).success, false);
});
