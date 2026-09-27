const test = require('node:test');
const assert = require('node:assert/strict');

const {
    DEFAULT_BCRYPT_ROUNDS,
    resolveBcryptRounds,
} = require('../src/config/security');

/**
 * `resolveBcryptRounds` reads `process.env` at call time, so each test sets and
 * restores the variable around the assertion.
 */
function withBcryptRounds(value, assertion) {
    const previous = process.env.BCRYPT_ROUNDS;
    try {
        if (value === undefined) delete process.env.BCRYPT_ROUNDS;
        else process.env.BCRYPT_ROUNDS = value;
        assertion();
    } finally {
        if (previous === undefined) delete process.env.BCRYPT_ROUNDS;
        else process.env.BCRYPT_ROUNDS = previous;
    }
}

test('bcrypt rounds default to 12 when unset', () => {
    withBcryptRounds(undefined, () => {
        assert.equal(resolveBcryptRounds(), DEFAULT_BCRYPT_ROUNDS);
        assert.equal(resolveBcryptRounds(), 12);
    });
});

test('bcrypt rounds honor a valid override', () => {
    withBcryptRounds('10', () => {
        assert.equal(resolveBcryptRounds(), 10);
    });
});

test('bcrypt rounds fall back to the default for out-of-range values', () => {
    for (const invalid of ['3', '16', '0', '-1']) {
        withBcryptRounds(invalid, () => {
            assert.equal(resolveBcryptRounds(), DEFAULT_BCRYPT_ROUNDS, `expected fallback for "${invalid}"`);
        });
    }
});

test('bcrypt rounds fall back to the default for non-numeric values', () => {
    for (const invalid of ['abc', '12.5', ' ', 'twelve']) {
        withBcryptRounds(invalid, () => {
            assert.equal(resolveBcryptRounds(), DEFAULT_BCRYPT_ROUNDS, `expected fallback for "${invalid}"`);
        });
    }
});
