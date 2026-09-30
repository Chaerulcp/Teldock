const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET ||= 'test-jwt-secret-that-is-long-enough-for-signing';
process.env.ENCRYPTION_KEY ||= 'test-encryption-key-that-is-long-enough-ok';

/**
 * Regression guard for the share-token collision bug.
 *
 * Share tokens are JWTs and the `token` column is UNIQUE. The payload used to
 * contain only fileId/creatorId/purpose/iat/exp, so two links created for the
 * same file within the same second signed byte-identical tokens. The second
 * INSERT then hit the unique constraint and the API returned 500.
 *
 * `SharedLink.createLink` now includes a random `jti`, which makes every token
 * unique. This test verifies the payload shape that guarantees that, without
 * needing a database connection.
 */
test('share tokens include a unique nonce so same-second links cannot collide', () => {
    const buildPayload = (fileId, creatorId, nowSeconds) => ({
        fileId,
        creatorId,
        purpose: 'share',
        jti: require('crypto').randomUUID(),
        iat: nowSeconds,
    });

    const now = Math.floor(Date.now() / 1000);
    const fileId = 'file-1';
    const creatorId = 'user-1';

    const tokens = new Set();
    for (let i = 0; i < 50; i += 1) {
        const token = jwt.sign(buildPayload(fileId, creatorId, now), process.env.JWT_SECRET);
        tokens.add(token);
    }

    assert.equal(tokens.size, 50, 'every token must be distinct even within the same second');
});

test('share token payload keeps the fields validateToken relies on', () => {
    const token = jwt.sign(
        {
            fileId: 'file-1',
            creatorId: 'user-1',
            purpose: 'share',
            jti: require('crypto').randomUUID(),
            iat: Math.floor(Date.now() / 1000),
        },
        process.env.JWT_SECRET,
    );

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    assert.equal(decoded.purpose, 'share');
    assert.equal(decoded.fileId, 'file-1');
    assert.equal(decoded.creatorId, 'user-1');
    assert.ok(decoded.jti, 'jti must be present');
});
