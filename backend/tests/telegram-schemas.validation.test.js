const test = require('node:test');
const assert = require('node:assert/strict');

const { botTokenSchema, connectTelegramSchema, updateTelegramSchema } = require('../src/validation/telegram.validation');

test('connectTelegramSchema accepts a numeric chat id including a leading minus', () => {
    const result = connectTelegramSchema.safeParse({ botToken: 'x'.repeat(20), chatId: '-1001234567890' });

    assert.equal(result.success, true);
});

test('connectTelegramSchema bounds the bot token length', () => {
    assert.equal(connectTelegramSchema.safeParse({ botToken: 'x'.repeat(19), chatId: '123' }).success, false);
    assert.equal(connectTelegramSchema.safeParse({ botToken: 'x'.repeat(201), chatId: '123' }).success, false);
});

test('connectTelegramSchema rejects non-numeric chat ids', () => {
    assert.equal(connectTelegramSchema.safeParse({ botToken: 'x'.repeat(20), chatId: 'abc' }).success, false);
    assert.equal(connectTelegramSchema.safeParse({ botToken: 'x'.repeat(20) }).success, false);
});

test('botTokenSchema trims surrounding whitespace', () => {
    const result = botTokenSchema.safeParse(`  ${'x'.repeat(20)}  `);

    assert.equal(result.success, true);
    assert.equal(result.data, 'x'.repeat(20));
});

test('updateTelegramSchema requires the bot token and chat id together', () => {
    assert.equal(updateTelegramSchema.safeParse({ botToken: 'x'.repeat(20), chatId: '123' }).success, true);
    assert.equal(updateTelegramSchema.safeParse({ botToken: 'x'.repeat(20) }).success, false);
    assert.equal(updateTelegramSchema.safeParse({ chatId: '123' }).success, false);
    assert.equal(updateTelegramSchema.safeParse({ username: 'operator' }).success, false);
});
