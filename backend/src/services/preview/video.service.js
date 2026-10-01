const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;

// A corrupt or truncated video must never hold a request open forever. Every
// ffmpeg/ffprobe operation is bounded by this budget; commands are killed and
// probes are abandoned (their callback is ignored) once it elapses.
const FFMPEG_TIMEOUT_MS = 30 * 1000;

// Temp inputs are named with an extension so ffmpeg has a format hint. The
// extension is derived from the MIME type instead of being hardcoded to `.mp4`,
// which would mislabel `.webm`/`.mov`/`.mkv` sources. ffmpeg still probes the
// actual content, so an unmapped-but-valid `video/*` type falls back to `.bin`.
const MIME_EXTENSION_MAP = {
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'video/x-matroska': '.mkv',
    'video/x-msvideo': '.avi',
    'video/mpeg': '.mpeg',
    'video/ogg': '.ogv',
    'video/3gpp': '.3gp'
};

const DEFAULT_VIDEO_EXTENSION = '.bin';

/**
 * Video Preview Generator Service
 * Extracts thumbnails and generates scrubbing previews
 */
class VideoPreviewService {
    constructor() {
        this.THUMBNAIL_SIZE = '640x360';
        this.SCRUB_FRAMES = 10;
        this.FFMPEG_TIMEOUT_MS = FFMPEG_TIMEOUT_MS;
        // Cached result of the FFmpeg presence probe. `null` means "not checked
        // yet"; once set it is a Promise<boolean> so concurrent requests share a
        // single probe instead of spawning one process each.
        this.ffmpegAvailability = null;
    }

    /**
     * Map a video MIME type to the extension used for its temp input file.
     */
    mimeToExtension(mimeType) {
        if (typeof mimeType !== 'string') {
            return DEFAULT_VIDEO_EXTENSION;
        }

        const normalized = mimeType.split(';')[0].trim().toLowerCase();
        return MIME_EXTENSION_MAP[normalized] || DEFAULT_VIDEO_EXTENSION;
    }

    /**
     * Report whether the `ffmpeg` binary is usable. The result is cached for the
     * lifetime of the process: a missing binary will not appear later, and this
     * avoids shelling out on every request.
     *
     * @returns {Promise<boolean>}
     */
    checkFfmpegAvailable() {
        if (this.ffmpegAvailability === null) {
            this.ffmpegAvailability = this.probeFfmpegAvailability();
        }
        return this.ffmpegAvailability;
    }

    /**
     * Run the actual presence probe. Overridable in tests.
     */
    probeFfmpegAvailability() {
        return new Promise((resolve) => {
            ffmpeg.getAvailableFormats((error) => {
                resolve(!error);
            });
        });
    }

    /**
     * Persist a video buffer to a temp file (fluent-ffmpeg needs a path/stream
     * input). The extension comes from the MIME type.
     */
    async writeTempVideo(videoBuffer, mimeType) {
        const tempDir = await this.getTempDir();
        const extension = this.mimeToExtension(mimeType);
        const tempFile = path.join(
            tempDir,
            `video-${Date.now()}-${Math.random().toString(16).slice(2)}${extension}`
        );
        await fs.writeFile(tempFile, videoBuffer);
        return tempFile;
    }

    /**
     * Build the dimensions object reported alongside a thumbnail.
     */
    getThumbnailDimensions() {
        const [width, height] = this.THUMBNAIL_SIZE.split('x').map(Number);
        return { width, height };
    }

    /**
     * Run a fluent-ffmpeg command with a hard timeout. On timeout the child
     * process is killed and the promise rejects.
     */
    runCommandWithTimeout(buildCommand) {
        return new Promise((resolve, reject) => {
            let settled = false;
            let command;

            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                if (command) command.kill('SIGKILL');
                reject(new Error('FFmpeg operation timed out'));
            }, this.FFMPEG_TIMEOUT_MS);

            const settle = (fn, value) => {
                if (settled) return;
                settled = true;
                globalThis.clearTimeout(timer);
                fn(value);
            };

            try {
                command = buildCommand();
            } catch (error) {
                settle(reject, error);
                return;
            }

            command.on('end', () => settle(resolve));
            command.on('error', (error) => settle(reject, error));
        });
    }

    /**
     * Probe a file with fluent-ffmpeg's own ffprobe (spawn with an argument
     * array, never a shell string) under the same timeout budget.
     */
    probeWithTimeout(inputFile) {
        return new Promise((resolve, reject) => {
            let settled = false;

            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                // The ffprobe child is not exposed by fluent-ffmpeg, so it cannot
                // be killed here; the request is released and its late callback
                // is ignored.
                reject(new Error('ffprobe timed out'));
            }, this.FFMPEG_TIMEOUT_MS);

            ffmpeg.ffprobe(inputFile, (error, data) => {
                if (settled) return;
                settled = true;
                globalThis.clearTimeout(timer);
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }

    /**
     * Extract a single thumbnail at the 1 second mark.
     */
    async extractThumbnail(videoBuffer, mimeType) {
        let inputFile;
        let outputPath;
        try {
            const tempDir = await this.getTempDir();
            outputPath = path.join(
                tempDir,
                `video-thumb-${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`
            );
            inputFile = await this.writeTempVideo(videoBuffer, mimeType);

            await this.runCommandWithTimeout(() => ffmpeg(inputFile)
                .screenshots({
                    count: 1,
                    folder: path.dirname(outputPath),
                    filename: path.basename(outputPath),
                    size: this.THUMBNAIL_SIZE,
                    timestamps: ['00:00:01']
                }));

            const data = await fs.readFile(outputPath);
            return {
                data,
                mimetype: 'image/jpeg',
                dimensions: this.getThumbnailDimensions()
            };
        } catch (error) {
            console.error('Thumbnail extraction failed:', error.message);
            throw error;
        } finally {
            if (inputFile) {
                await fs.unlink(inputFile).catch(() => {});
            }
            if (outputPath) {
                await fs.unlink(outputPath).catch(() => {});
            }
        }
    }

    /**
     * Get video duration using fluent-ffmpeg's ffprobe. Returns null when the
     * container exposes no parsable duration.
     */
    async getDuration(videoBuffer, mimeType) {
        let tempFile;
        try {
            tempFile = await this.writeTempVideo(videoBuffer, mimeType);
            const data = await this.probeWithTimeout(tempFile);
            const duration = data && data.format ? parseFloat(data.format.duration) : NaN;
            return Number.isFinite(duration) ? duration : null;
        } catch (error) {
            console.error('Duration detection failed:', error.message);
            throw error;
        } finally {
            if (tempFile) {
                await fs.unlink(tempFile).catch(() => {});
            }
        }
    }

    /**
     * Generate the thumbnail and best-effort duration for a video.
     */
    async generate(videoBuffer, mimeType) {
        const startTime = Date.now();

        const thumbnail = await this.extractThumbnail(videoBuffer, mimeType);

        let duration = null;
        try {
            duration = await this.getDuration(videoBuffer, mimeType);
        } catch (error) {
            // A missing duration must not discard the thumbnail we already have.
            console.warn('Video duration detection failed:', error.message);
        }

        return {
            success: true,
            thumbnail,
            duration,
            processingTime: Date.now() - startTime
        };
    }

    /**
     * Generate multiple frames for scrubbing bar.
     */
    async generateScrubThumbnails(videoBuffer, mimeType) {
        const duration = await this.getDuration(videoBuffer, mimeType);
        const interval = Math.max(1, Math.floor(duration / this.SCRUB_FRAMES));

        const thumbnails = [];

        for (let i = 1; i <= this.SCRUB_FRAMES; i++) {
            const time = `${interval * i}s`;
            const thumb = await this.extractAtTime(videoBuffer, time, mimeType);

            thumbnails.push({
                time,
                thumbnail: thumb.data
            });
        }

        return thumbnails;
    }

    /**
     * Extract frame at specific time.
     */
    async extractAtTime(videoBuffer, timestamp, mimeType) {
        const tempDir = await this.getTempDir();
        const outputPath = path.join(
            tempDir,
            `frame-${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`
        );
        let inputFile;

        try {
            inputFile = await this.writeTempVideo(videoBuffer, mimeType);

            await this.runCommandWithTimeout(() => ffmpeg(inputFile)
                .seekInput(timestamp)
                .frames(1)
                .size(this.THUMBNAIL_SIZE)
                .save(outputPath));

            const data = await fs.readFile(outputPath);
            return {
                data,
                mimetype: 'image/jpeg'
            };
        } finally {
            if (inputFile) {
                await fs.unlink(inputFile).catch(() => {});
            }
            await fs.unlink(outputPath).catch(() => {});
        }
    }

    /**
     * Create temporary directory if needed.
     */
    async getTempDir() {
        const tempDir = path.join(os.tmpdir(), 'tele-storage-previews');
        try {
            await fs.mkdir(tempDir, { recursive: true });
            return tempDir;
        } catch {
            // Directory exists or already created
            return tempDir;
        }
    }

    /**
     * Validate video format.
     */
    isValidVideoFormat(mimeType) {
        return typeof mimeType === 'string' && mimeType.startsWith('video/');
    }
}

const videoPreviewService = new VideoPreviewService();

module.exports = videoPreviewService;
