const test = require('node:test');
const assert = require('node:assert/strict');

const { validateBody } = require('../src/middleware/validation.middleware');
const { updateFileSchema } = require('../src/validation/file.validation');

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

test('validateBody responds with 422 and the documented error shape when parsing fails', () => {
    const req = { body: { isDeleted: true } };
    const res = createResponse();
    let nextCalled = false;

    validateBody(updateFileSchema)(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 422);
    assert.deepEqual(res.body, { success: false, error: 'Invalid request data' });
});

test('validateBody calls next and replaces the body with the parsed value', () => {
    const req = { body: { displayFilename: '  report.pdf  ' } };
    const res = createResponse();
    let nextCalled = false;

    validateBody(updateFileSchema)(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.body.displayFilename, 'report.pdf');
    assert.equal(res.statusCode, null);
});

test('validateBody rejects unknown keys before they reach the handler', () => {
    const req = { body: { isFavorite: true, userId: 'attacker-supplied' } };
    const res = createResponse();
    let nextCalled = false;

    validateBody(updateFileSchema)(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 422);
});
