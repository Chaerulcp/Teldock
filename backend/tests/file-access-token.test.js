const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET ||= 'test-jwt-secret-that-is-long-enough-for-signing';

const { generateFileAccessToken, verifyFileAccessToken } = require('../src/services/jwt.service');

test('file access tokens are bound to a file and stream disposition', () => {
    const token = generateFileAccessToken({
        userId: 'user-1',
        fileId: 'file-1',
        disposition: 'inline',
    });

    assert.equal(verifyFileAccessToken(token, { fileId: 'file-1', disposition: 'inline' }).userId, 'user-1');
    assert.equal(verifyFileAccessToken(token, { fileId: 'file-1', disposition: 'attachment' }), null);
    assert.equal(verifyFileAccessToken(token, { fileId: 'file-2', disposition: 'inline' }), null);
});

test('file access verification rejects regular access tokens', () => {
    const regularToken = require('../src/services/jwt.service').generateAccessToken({
        id: 'user-1',
        telegramId: null,
        email: 'user@example.com',
    });

    assert.equal(verifyFileAccessToken(regularToken, { fileId: 'file-1', disposition: 'inline' }), null);
});
