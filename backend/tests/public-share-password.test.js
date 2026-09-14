const test = require('node:test');
const assert = require('node:assert/strict');

const { getSharePassword } = require('../src/controllers/public-share.controller');

test('getSharePassword reads the password only from the dedicated request header', () => {
    const password = getSharePassword({
        get: (name) => (name === 'X-Share-Password' ? 'correct-horse-battery-staple' : undefined),
        query: { password: 'must-not-be-used' },
    });

    assert.equal(password, 'correct-horse-battery-staple');
});

test('getSharePassword does not fall back to a password query parameter', () => {
    const password = getSharePassword({
        get: () => undefined,
        query: { password: 'must-not-be-used' },
    });

    assert.equal(password, undefined);
});
