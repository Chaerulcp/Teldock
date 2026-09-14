const test = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');

const SharedLink = require('../src/models/SharedLink');

const sharedLinkId = '1c79d135-8866-49e3-8da4-dd440ec22038';

test('consumeDownload atomically reserves an available download slot', async () => {
    const originalUpdate = SharedLink.update;
    let updateValues;
    let updateOptions;
    SharedLink.update = async (values, options) => {
        updateValues = values;
        updateOptions = options;
        return [1];
    };

    try {
        const reserved = await SharedLink.consumeDownload(sharedLinkId);

        assert.equal(reserved, true);
        assert.ok(updateValues.usedDownloads);
        assert.ok(updateValues.accessedCount);
        assert.equal(updateOptions.where[Op.and].length, 3);
    } finally {
        SharedLink.update = originalUpdate;
    }
});

test('consumeDownload rejects a request when the conditional update has no matching slot', async () => {
    const originalUpdate = SharedLink.update;
    SharedLink.update = async () => [0];

    try {
        const reserved = await SharedLink.consumeDownload(sharedLinkId);

        assert.equal(reserved, false);
    } finally {
        SharedLink.update = originalUpdate;
    }
});
