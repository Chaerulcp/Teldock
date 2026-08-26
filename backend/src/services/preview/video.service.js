const ffmpeg = require('fluent-ffmpeg');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;

const execAsync = promisify(exec);

/**
 * Video Preview Generator Service
 * Extracts thumbnails and generates scrubbing previews
 */
class VideoPreviewService {
  constructor() {
    this.THUMBNAIL_SIZE = '640x360';
    this.SCRUB_FRAMES = 10;
  }

  /**
   * Persist a video buffer to a temp file (fluent-ffmpeg needs a path/stream input)
   */
  async writeTempVideo(videoBuffer) {
    const tempDir = await this.getTempDir();
    const tempFile = path.join(tempDir, `video-${Date.now()}-${Math.random().toString(16).slice(2)}.mp4`);
    await fs.writeFile(tempFile, videoBuffer);
    return tempFile;
  }

  /**
   * Extract single thumbnail at 1 second mark
   */
  async extractThumbnail(videoBuffer) {
    let inputFile;
    try {
      const timestamp = '00:00:01';
      const tempDir = await this.getTempDir();
      const outputPath = path.join(tempDir, `video-thumb-${Date.now()}.jpg`);
      inputFile = await this.writeTempVideo(videoBuffer);

      return await new Promise((resolve, reject) => {
        ffmpeg(inputFile)
          .screenshots({
            count: 1,
            folder: path.dirname(outputPath),
            filename: path.basename(outputPath),
            size: this.THUMBNAIL_SIZE,
            timestamps: [timestamp]
          })
          .on('end', () => {
            resolve(fs.readFile(outputPath));
          })
          .on('error', reject);
      });
    } catch (error) {
      console.error('❌ Thumbnail extraction failed:', error.message);
      throw error;
    } finally {
      if (inputFile) {
        await fs.unlink(inputFile).catch(() => {});
      }
    }
  }

  /**
   * Get video duration using ffprobe
   */
  async getDuration(videoBuffer) {
    let tempFile;
    try {
      tempFile = await this.writeTempVideo(videoBuffer);

      // Use ffprobe via ffmpeg command
      const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempFile}"`;
      const { stdout } = await execAsync(cmd);

      const duration = parseFloat(stdout.trim());

      return duration;
    } catch (error) {
      console.error('❌ Duration detection failed:', error.message);
      throw error;
    } finally {
      if (tempFile) {
        await fs.unlink(tempFile).catch(() => {});
      }
    }
  }

  /**
   * Generate multiple frames for scrubbing bar
   */
  async generateScrubThumbnails(videoBuffer) {
    const duration = await this.getDuration(videoBuffer);
    const interval = Math.floor(duration / this.SCRUB_FRAMES);
    
    const thumbnails = [];
    
    for (let i = 1; i <= this.SCRUB_FRAMES; i++) {
      const time = `${interval * i}s`;
      const thumb = await this.extractAtTime(videoBuffer, time);
      
      thumbnails.push({
        time,
        thumbnail: thumb.data
      });
    }
    
    return thumbnails;
  }

  /**
   * Extract frame at specific time
   */
  async extractAtTime(videoBuffer, timestamp) {
    const tempDir = await this.getTempDir();
    const outputPath = path.join(tempDir, `frame-${Date.now()}-${timestamp}.jpg`);
    let inputFile;

    try {
      inputFile = await this.writeTempVideo(videoBuffer);

      return await new Promise((resolve, reject) => {
        ffmpeg(inputFile)
          .seekInput(timestamp)
          .frames(1)
          .size(this.THUMBNAIL_SIZE)
          .save(outputPath)
          .on('end', async () => {
            const data = await fs.readFile(outputPath);
            resolve({
              data,
              mimetype: 'image/jpeg'
            });
          })
          .on('error', reject);
      });
    } finally {
      if (inputFile) {
        await fs.unlink(inputFile).catch(() => {});
      }
    }
  }

  /**
   * Create temporary directory if needed
   */
  async getTempDir() {
    const tempDir = path.join(os.tmpdir(), 'tele-storage-previews');
    try {
      await fs.mkdir(tempDir, { recursive: true });
      return tempDir;
    } catch (error) {
      // Directory exists or already created
      return tempDir;
    }
  }

  /**
   * Validate video format
   */
  isValidVideoFormat(mimeType) {
    return mimeType.startsWith('video/');
  }
}

module.exports = new VideoPreviewService();
