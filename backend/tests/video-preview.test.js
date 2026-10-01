const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');

const videoService = require('../src/services/preview/video.service');
const { File } = require('../src/models');
const telegramStorage = require('../src/services/telegram-storage.service');
const {
    generatePreviewHandler,
    classifyPreviewType,
    MAX_VIDEO_PREVIEW_SOURCE_BYTES
} = require('../src/routes/preview.routes');

const originalFindOne = File.findOne;
const originalCreateReadStream = telegramStorage.createReadStream;
const originalCheckFfmpegAvailable = videoService.checkFfmpegAvailable;
const originalGenerate = videoService.generate;
const originalProbeFfmpegAvailability = videoService.probeFfmpegAvailability;

/**
 * Minimal Express-like response double that records the status and JSON body.
 */
function createRes() {
    const res = {
        statusCode: 200,
        body: null,
        status(code) {
            res.statusCode = code;
            return res;
        },
        json(payload) {
            res.body = payload;
            return res;
        }
    };
    return res;
}

function fakeFile(overrides = {}) {
    return {
        id: 'file-1',
        userId: 'user-1',
        mimeType: 'video/mp4',
        fileSize: 1024,
        parts: [],
        telegramChatId: 'chat-1',
        telegramMessageId: 'msg-1',
        telegramFileId: 'tg-1',
        encryptionSalt: null,
        ...overrides
    };
}

function createReq(overrides = {}) {
    return {
        user: { userId: 'user-1' },
        body: { fileId: 'file-1' },
        ...overrides
    };
}

function stubFileRead(bytes = Buffer.from('fake-video-bytes')) {
    telegramStorage.createReadStream = () => ({ stream: Readable.from([bytes]) });
}

// --- Pure helpers ---------------------------------------------------------

test('mimeToExtension maps known containers and falls back to .bin', () => {
    assert.equal(videoService.mimeToExtension('video/mp4'), '.mp4');
    assert.equal(videoService.mimeToExtension('video/webm'), '.webm');
    assert.equal(videoService.mimeToExtension('video/quicktime'), '.mov');
    assert.equal(videoService.mimeToExtension('video/x-matroska'), '.mkv');
    assert.equal(videoService.mimeToExtension('video/mp4; codecs=avc1'), '.mp4');
    assert.equal(videoService.mimeToExtension('VIDEO/WEBM'), '.webm');
    assert.equal(videoService.mimeToExtension('video/unknown'), '.bin');
    assert.equal(videoService.mimeToExtension(undefined), '.bin');
});

test('isValidVideoFormat accepts only video MIME types', () => {
    assert.equal(videoService.isValidVideoFormat('video/mp4'), true);
    assert.equal(videoService.isValidVideoFormat('image/png'), false);
    assert.equal(videoService.isValidVideoFormat(undefined), false);
});

test('getThumbnailDimensions reports the configured thumbnail size', () => {
    assert.deepEqual(videoService.getThumbnailDimensions(), { width: 640, height: 360 });
});

test('classifyPreviewType distinguishes image, video, and unsupported', () => {
    assert.equal(classifyPreviewType('image/png'), 'image');
    assert.equal(classifyPreviewType('image/jpeg'), 'image');
    assert.equal(classifyPreviewType('video/mp4'), 'video');
    assert.equal(classifyPreviewType('video/webm'), 'video');
    assert.equal(classifyPreviewType('application/pdf'), null);
    assert.equal(classifyPreviewType(undefined), null);
});

// --- FFmpeg availability guard -------------------------------------------

test('checkFfmpegAvailable reports a missing binary', async () => {
    videoService.ffmpegAvailability = null;
    videoService.probeFfmpegAvailability = async () => false;

    assert.equal(await videoService.checkFfmpegAvailable(), false);
});

test('checkFfmpegAvailable caches the probe result across calls', async () => {
    let calls = 0;
    videoService.ffmpegAvailability = null;
    videoService.probeFfmpegAvailability = async () => {
        calls += 1;
        return true;
    };

    assert.equal(await videoService.checkFfmpegAvailable(), true);
    assert.equal(await videoService.checkFfmpegAvailable(), true);
    assert.equal(calls, 1);
});

// --- Route handler --------------------------------------------------------

test('generate handler rejects a non-image, non-video MIME type with 400', async () => {
    File.findOne = async () => fakeFile({ mimeType: 'application/pdf' });

    const res = createRes();
    await generatePreviewHandler(createReq(), res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.error, /image and video/i);
});

test('generate handler returns 503 when FFmpeg is unavailable for a video', async () => {
    File.findOne = async () => fakeFile();
    videoService.checkFfmpegAvailable = async () => false;

    const res = createRes();
    await generatePreviewHandler(createReq(), res);

    assert.equal(res.statusCode, 503);
    assert.equal(res.body.success, false);
    assert.match(res.body.error, /FFmpeg/);
});

test('generate handler accepts video/mp4 and returns a thumbnail with duration', async () => {
    File.findOne = async () => fakeFile();
    videoService.checkFfmpegAvailable = async () => true;
    stubFileRead();

    let receivedMimeType = null;
    videoService.generate = async (buffer, mimeType) => {
        receivedMimeType = mimeType;
        assert.ok(Buffer.isBuffer(buffer));
        return {
            success: true,
            thumbnail: {
                data: Buffer.from('jpeg-bytes'),
                mimetype: 'image/jpeg',
                dimensions: { width: 640, height: 360 }
            },
            duration: 12.5,
            processingTime: 7
        };
    };

    const res = createRes();
    await generatePreviewHandler(createReq(), res);

    assert.equal(res.statusCode, 200);
    assert.equal(receivedMimeType, 'video/mp4');
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.type, 'video');
    assert.equal(res.body.data.duration, 12.5);
    assert.equal(res.body.data.processingTime, 7);
    assert.match(res.body.data.previews.thumbnail.dataUrl, /^data:image\/jpeg;base64,/);
    assert.deepEqual(res.body.data.previews.thumbnail.dimensions, { width: 640, height: 360 });
    assert.equal(res.body.data.previews.thumbnail.fileSize, Buffer.from('jpeg-bytes').length);
});

test('generate handler returns a null duration when the probe cannot read it', async () => {
    File.findOne = async () => fakeFile();
    videoService.checkFfmpegAvailable = async () => true;
    stubFileRead();
    videoService.generate = async () => ({
        success: true,
        thumbnail: {
            data: Buffer.from('jpeg-bytes'),
            mimetype: 'image/jpeg',
            dimensions: { width: 640, height: 360 }
        },
        duration: null,
        processingTime: 5
    });

    const res = createRes();
    await generatePreviewHandler(createReq(), res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.duration, null);
});

test('generate handler rejects an oversized video with 413', async () => {
    File.findOne = async () => fakeFile({ fileSize: MAX_VIDEO_PREVIEW_SOURCE_BYTES + 1 });
    videoService.checkFfmpegAvailable = async () => true;

    const res = createRes();
    await generatePreviewHandler(createReq(), res);

    assert.equal(res.statusCode, 413);
    assert.equal(res.body.success, false);
    assert.match(res.body.error, /too large/i);
});

test('generate handler rejects a file the caller does not own with 403', async () => {
    File.findOne = async () => fakeFile({ userId: 'someone-else' });

    const res = createRes();
    await generatePreviewHandler(createReq(), res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.success, false);
});

test.after(() => {
    File.findOne = originalFindOne;
    telegramStorage.createReadStream = originalCreateReadStream;
    videoService.checkFfmpegAvailable = originalCheckFfmpegAvailable;
    videoService.generate = originalGenerate;
    videoService.probeFfmpegAvailability = originalProbeFfmpegAvailability;
    videoService.ffmpegAvailability = null;
});
