const test = require('node:test');
const assert = require('node:assert/strict');

const { parseRange } = require('../src/services/file-stream.service');

test('parseRange returns a complete response without a Range header', () => {
    assert.deepEqual(parseRange(undefined, 10), {
        start: 0,
        end: 9,
        isPartial: false,
    });
});

test('parseRange bounds an open-ended byte range to the file size', () => {
    assert.deepEqual(parseRange('bytes=4-', 10), {
        start: 4,
        end: 9,
        isPartial: true,
    });
});

test('parseRange rejects ranges outside the available file bytes', () => {
    assert.throws(() => parseRange('bytes=10-', 10), {
        statusCode: 416,
        message: 'Requested range is not satisfiable',
    });
});
