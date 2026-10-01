const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-signing';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-that-is-long-enough-for-signing';

const {
    decodeToken,
    generateAccessToken,
    generateFileAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyFileAccessToken,
    verifyRefreshToken,
} = require('../src/services/jwt.service');

const user = { id: 'user-1', telegramId: 'telegram-1', email: 'user@example.com' };

function tamper(token) {
    const suffix = token.endsWith('aa') ? 'bb' : 'aa';
    return `${token.slice(0, -2)}${suffix}`;
}

test('access tokens carry the user identity and role', () => {
    const decoded = verifyAccessToken(generateAccessToken(user));

    assert.equal(decoded.userId, 'user-1');
    assert.equal(decoded.email, 'user@example.com');
    assert.equal(decoded.role, 'user');
});

test('refresh tokens verify only with the refresh secret', () => {
    const token = generateRefreshToken(user);

    assert.equal(verifyRefreshToken(token).type, 'refresh');
    assert.equal(verifyAccessToken(token), null);
});

test('access tokens are rejected by the refresh-token verifier', () => {
    assert.equal(verifyRefreshToken(generateAccessToken(user)), null);
});

test('file access tokens verify only for their file and disposition', () => {
    const token = generateFileAccessToken({ userId: 'user-1', fileId: 'file-1', disposition: 'inline' });

    assert.equal(verifyFileAccessToken(token, { fileId: 'file-1', disposition: 'inline' }).userId, 'user-1');
    assert.equal(verifyFileAccessToken(token, { fileId: 'file-2', disposition: 'inline' }), null);
    assert.equal(verifyFileAccessToken(token, { fileId: 'file-1', disposition: 'attachment' }), null);
});

test('refresh tokens are rejected by the file-access verifier', () => {
    assert.equal(
        verifyFileAccessToken(generateRefreshToken(user), { fileId: 'file-1', disposition: 'inline' }),
        null,
    );
});

test('tampered tokens are rejected by every verifier', () => {
    const token = tamper(generateAccessToken(user));

    assert.equal(verifyAccessToken(token), null);
    assert.equal(verifyFileAccessToken(token, { fileId: 'file-1', disposition: 'inline' }), null);
    assert.equal(verifyRefreshToken(token), null);
});

test('tokens signed with a different secret are rejected', () => {
    const forged = jwt.sign(
        { type: 'file-access', userId: 'user-1', fileId: 'file-1', disposition: 'inline' },
        'a-different-secret-that-is-long-enough-for-signing',
    );

    assert.equal(verifyFileAccessToken(forged, { fileId: 'file-1', disposition: 'inline' }), null);
});

test('malformed tokens are rejected without throwing', () => {
    assert.equal(verifyAccessToken('not-a-token'), null);
    assert.equal(verifyRefreshToken('not-a-token'), null);
    assert.equal(verifyFileAccessToken('not-a-token', { fileId: 'file-1', disposition: 'inline' }), null);
});

test('expired access tokens are rejected', () => {
    const expired = jwt.sign({ userId: 'user-1' }, process.env.JWT_SECRET, { expiresIn: '-1s' });

    assert.equal(verifyAccessToken(expired), null);
});

test('expired file access tokens are rejected', () => {
    const previous = process.env.FILE_ACCESS_TOKEN_EXPIRE;
    process.env.FILE_ACCESS_TOKEN_EXPIRE = '-1s';
    try {
        const token = generateFileAccessToken({ userId: 'user-1', fileId: 'file-1', disposition: 'inline' });
        assert.equal(verifyFileAccessToken(token, { fileId: 'file-1', disposition: 'inline' }), null);
    } finally {
        if (previous === undefined) delete process.env.FILE_ACCESS_TOKEN_EXPIRE;
        else process.env.FILE_ACCESS_TOKEN_EXPIRE = previous;
    }
});

test('decodeToken exposes the payload without verifying the signature', () => {
    const token = tamper(generateAccessToken(user));

    assert.equal(decodeToken(token).userId, 'user-1');
    assert.equal(verifyAccessToken(token), null);
});
