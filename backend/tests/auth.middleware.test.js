const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-signing';

const { authenticateToken, optionalAuthenticate } = require('../src/middleware/auth.middleware');
const { generateAccessToken } = require('../src/services/jwt.service');

const user = { id: 'user-1', telegramId: 'telegram-1', email: 'user@example.com' };

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

test('authenticateToken rejects a request without an Authorization header', () => {
    const req = { headers: {} };
    const res = createResponse();
    let nextCalled = false;

    authenticateToken(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { success: false, error: 'Access token required' });
});

test('authenticateToken rejects an Authorization header without a bearer token', () => {
    const req = { headers: { authorization: 'Bearer' } };
    const res = createResponse();
    let nextCalled = false;

    authenticateToken(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
});

test('authenticateToken rejects an invalid token with 403', () => {
    const req = { headers: { authorization: 'Bearer not-a-token' } };
    const res = createResponse();
    let nextCalled = false;

    authenticateToken(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { success: false, error: 'Invalid or expired token' });
});

test('authenticateToken attaches the decoded user and calls next for a valid token', () => {
    const req = { headers: { authorization: `Bearer ${generateAccessToken(user)}` } };
    const res = createResponse();
    let nextCalled = false;

    authenticateToken(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.user.userId, 'user-1');
});

test('optionalAuthenticate proceeds without a token and leaves req.user unset', () => {
    const req = { headers: {} };
    const res = createResponse();
    let nextCalled = false;

    optionalAuthenticate(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.user, undefined);
});

test('optionalAuthenticate attaches a valid user but proceeds for an invalid token', () => {
    const validReq = { headers: { authorization: `Bearer ${generateAccessToken(user)}` } };
    let validNextCalled = false;

    optionalAuthenticate(validReq, createResponse(), () => {
        validNextCalled = true;
    });

    assert.equal(validNextCalled, true);
    assert.equal(validReq.user.userId, 'user-1');

    const invalidReq = { headers: { authorization: 'Bearer not-a-token' } };
    let invalidNextCalled = false;

    optionalAuthenticate(invalidReq, createResponse(), () => {
        invalidNextCalled = true;
    });

    assert.equal(invalidNextCalled, true);
    assert.equal(invalidReq.user, undefined);
});
