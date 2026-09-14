const test = require('node:test');
const assert = require('node:assert/strict');

const { getRetryDelayMs } = require('../src/services/telegram-storage.service');

test('getRetryDelayMs honors Telegram retry_after values', () => {
    assert.equal(getRetryDelayMs({ parameters: { retry_after: 7 } }, 1), 7_000);
});

test('getRetryDelayMs uses exponential backoff when retry_after is absent', () => {
    assert.equal(getRetryDelayMs({}, 1), 1_500);
    assert.equal(getRetryDelayMs({}, 3), 6_000);
});
