const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-signing';

const { generateAccessToken, generateFileAccessToken } = require('../src/services/jwt.service');
const { authenticateFileAccess } = require('../src/middleware/file-access.middleware');

function createResponse() {
    return {
        statusCode: null,
        body: null,
        status(statusCode) {
            this.statusCode = statusCode;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };
}

test('authenticateFileAccess rejects a request with no signature and no Authorization header', () => {
    const req = { params: { id: 'file-1' }, query: {}, headers: {} };
    const res = createResponse();
    let nextCalled = false;

    authenticateFileAccess('inline')(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { success: false, error: 'File access signature or access token required' });
});

test('authenticateFileAccess rejects a non-bearer Authorization header', () => {
    const req = { params: { id: 'file-1' }, query: {}, headers: { authorization: 'Token abc' } };
    const res = createResponse();
    let nextCalled = false;

    authenticateFileAccess('inline')(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
});

test('authenticateFileAccess rejects a signature bound to another file', () => {
    const signature = generateFileAccessToken({ userId: 'user-1', fileId: 'file-2', disposition: 'inline' });
    const req = { params: { id: 'file-1' }, query: { signature }, headers: {} };
    const res = createResponse();
    let nextCalled = false;

    authenticateFileAccess('inline')(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { success: false, error: 'Invalid or expired file access signature' });
});

test('authenticateFileAccess rejects an expired signature with 403', () => {
    const previous = process.env.FILE_ACCESS_TOKEN_EXPIRE;
    process.env.FILE_ACCESS_TOKEN_EXPIRE = '-1s';
    let signature;
    try {
        signature = generateFileAccessToken({ userId: 'user-1', fileId: 'file-1', disposition: 'inline' });
    } finally {
        if (previous === undefined) delete process.env.FILE_ACCESS_TOKEN_EXPIRE;
        else process.env.FILE_ACCESS_TOKEN_EXPIRE = previous;
    }

    const req = { params: { id: 'file-1' }, query: { signature }, headers: {} };
    const res = createResponse();
    let nextCalled = false;

    authenticateFileAccess('inline')(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
});

test('authenticateFileAccess rejects an invalid Bearer access token with 401', () => {
    const req = { params: { id: 'file-1' }, query: {}, headers: { authorization: 'Bearer not-a-token' } };
    const res = createResponse();
    let nextCalled = false;

    authenticateFileAccess('inline')(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
});

test('authenticateFileAccess accepts a valid Bearer access token and exposes the user', () => {
    const token = generateAccessToken({ id: 'user-1', telegramId: null, email: 'user@example.com' });
    const req = { params: { id: 'file-1' }, query: {}, headers: { authorization: `Bearer ${token}` } };
    const res = createResponse();
    let nextCalled = false;

    authenticateFileAccess('attachment')(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.user.userId, 'user-1');
});
