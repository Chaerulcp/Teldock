const test = require('node:test');
const assert = require('node:assert/strict');

const { FileServiceError } = require('../src/services/file-service-error');

test('FileServiceError exposes a safe message and HTTP status code', () => {
    const error = new FileServiceError(404, 'File not found');

    assert.equal(error.name, 'FileServiceError');
    assert.equal(error.statusCode, 404);
    assert.equal(error.message, 'File not found');
});
