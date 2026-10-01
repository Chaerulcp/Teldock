const test = require('node:test');
const assert = require('node:assert/strict');

const { assertSecrets, requireSecret } = require('../src/config/secrets');

const SECRET_NAME = 'TELDOCK_TEST_SECRET';
const MIN_SECRET_LENGTH = 32;

function withSecret(name, value, assertion) {
    const previous = process.env[name];
    try {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
        assertion();
    } finally {
        if (previous === undefined) delete process.env[name];
        else process.env[name] = previous;
    }
}

test('requireSecret returns a configured value', () => {
    withSecret(SECRET_NAME, 'a'.repeat(MIN_SECRET_LENGTH), () => {
        assert.equal(requireSecret(SECRET_NAME), 'a'.repeat(MIN_SECRET_LENGTH));
    });
});

test('requireSecret rejects a missing secret', () => {
    withSecret(SECRET_NAME, undefined, () => {
        assert.throws(() => requireSecret(SECRET_NAME), /is not set/);
    });
});

test('requireSecret rejects the example placeholder values', () => {
    withSecret(SECRET_NAME, 'change-me', () => {
        assert.throws(() => requireSecret(SECRET_NAME), /placeholder/);
    });
});

test('requireSecret rejects secrets shorter than the minimum length', () => {
    withSecret(SECRET_NAME, 'short', () => {
        assert.throws(() => requireSecret(SECRET_NAME), /at least 32 characters/);
    });
});

test('requireSecret honors a custom minimum length', () => {
    withSecret(SECRET_NAME, 'a'.repeat(10), () => {
        assert.equal(requireSecret(SECRET_NAME, { minLength: 10 }), 'a'.repeat(10));
        assert.throws(() => requireSecret(SECRET_NAME, { minLength: 11 }), /at least 11 characters/);
    });
});

test('assertSecrets reports every missing secret at once', () => {
    const names = ['JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'ENCRYPTION_KEY'];
    const previous = {};
    for (const name of names) {
        previous[name] = process.env[name];
        delete process.env[name];
    }

    try {
        assert.throws(() => assertSecrets(), (error) => {
            for (const name of names) {
                assert.match(error.message, new RegExp(name));
            }
            return true;
        });
    } finally {
        for (const name of names) {
            if (previous[name] === undefined) delete process.env[name];
            else process.env[name] = previous[name];
        }
    }
});
