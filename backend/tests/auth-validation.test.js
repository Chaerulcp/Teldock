const test = require('node:test');
const assert = require('node:assert/strict');

const { loginSchema, registerSchema } = require('../src/validation/auth.validation');

test('registerSchema accepts a valid local-account registration', () => {
    const result = registerSchema.safeParse({
        email: ' user@example.com ',
        password: 'SecurePass123!',
        username: ' teldock-user ',
    });

    assert.equal(result.success, true);
    assert.equal(result.data.email, 'user@example.com');
    assert.equal(result.data.username, 'teldock-user');
});

test('registerSchema rejects registrations without a valid password', () => {
    const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'short',
    });

    assert.equal(result.success, false);
});

test('loginSchema rejects malformed credentials', () => {
    const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: '',
    });

    assert.equal(result.success, false);
});
