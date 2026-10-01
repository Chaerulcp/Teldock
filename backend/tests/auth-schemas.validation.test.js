const test = require('node:test');
const assert = require('node:assert/strict');

const { loginSchema, refreshTokenSchema, registerSchema } = require('../src/validation/auth.validation');

const MAX_PASSWORD_BYTES = 72;

test('registerSchema enforces the bcrypt password byte limit', () => {
    assert.equal(
        registerSchema.safeParse({ email: 'user@example.com', password: 'a'.repeat(MAX_PASSWORD_BYTES) }).success,
        true,
    );
    assert.equal(
        registerSchema.safeParse({ email: 'user@example.com', password: 'a'.repeat(MAX_PASSWORD_BYTES + 1) }).success,
        false,
    );
});

test('registerSchema measures password length in utf-8 bytes, not characters', () => {
    // 37 two-byte characters are 74 UTF-8 bytes and cannot be bcrypt hashed safely.
    assert.equal(registerSchema.safeParse({ email: 'user@example.com', password: '\u00e9'.repeat(37) }).success, false);
});

test('registerSchema rejects passwords shorter than six characters', () => {
    assert.equal(registerSchema.safeParse({ email: 'user@example.com', password: '12345' }).success, false);
    assert.equal(registerSchema.safeParse({ email: 'user@example.com', password: '123456' }).success, true);
});

test('registerSchema trims and bounds the optional username', () => {
    const result = registerSchema.safeParse({ email: 'user@example.com', password: '123456', username: '  teldock  ' });

    assert.equal(result.success, true);
    assert.equal(result.data.username, 'teldock');
    assert.equal(registerSchema.safeParse({ email: 'user@example.com', password: '123456', username: '' }).success, false);
});

test('loginSchema rejects an invalid email', () => {
    assert.equal(loginSchema.safeParse({ email: 'not-an-email', password: '123456' }).success, false);
});

test('refreshTokenSchema requires a non-empty bounded token', () => {
    assert.equal(refreshTokenSchema.safeParse({ refreshToken: 'a'.repeat(2048) }).success, true);
    assert.equal(refreshTokenSchema.safeParse({ refreshToken: 'a'.repeat(2049) }).success, false);
    assert.equal(refreshTokenSchema.safeParse({ refreshToken: '' }).success, false);
});
