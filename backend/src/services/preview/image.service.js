const sharp = require('sharp');
const crypto = require('crypto');

/**
 * Image Preview Generator Service
 * Generates multiple sizes of previews from uploaded images
 */
class ImagePreviewService {
  constructor() {
    this.SIZES = [
      { name: 'thumbnail', width: 150, height: 150 },
      { name: 'preview', width: 800, height: 600 },
      { name: 'large', width: 1920, height: 1080 }
    ];

    // Cache keyed by source-content hash. Dimensions alone are not a valid key:
    // two different images that happen to share a resolution would collide, and
    // since this cache is process-global that leaks one user's image to another.
    this.cache = new Map();
    this.MAX_CACHE_ENTRIES = 200;
  }

  /**
   * Store a preview, evicting the oldest entry once the cache is full so the
   * process does not grow without bound.
   */
  cacheSet(key, value) {
    if (this.cache.size >= this.MAX_CACHE_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }

  /**
   * Generate all sizes from image buffer
   */
  async generate(fileBuffer) {
    const startTime = Date.now();

    try {
      // Get image metadata
      const metadata = await sharp(fileBuffer).metadata();

      console.log(`🖼️  Processing image: ${metadata.width}x${metadata.height}`);

      // Identifies this exact image, so cache hits can only be the same content.
      const sourceHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Auto-orient based on EXIF data
      const orientedBuffer = await sharp(fileBuffer)
        .rotate()
        .toBuffer();

      // Generate all sizes
      const previews = {};

      for (const size of this.SIZES) {
        const key = `${sourceHash}-${size.name}`;

        if (this.cache.has(key)) {
          previews[size.name] = this.cache.get(key);
          continue;
        }

        // Resize and optimize
        const previewData = await sharp(orientedBuffer)
          .resize(size.width, size.height, {
            fit: 'inside',
            position: 'center'
          })
          .webp({ quality: 80 })
          .toBuffer();

        previews[size.name] = {
          data: previewData,
          mimetype: 'image/webp',
          dimensions: {
            width: size.width,
            height: size.height
          },
          fileSize: previewData.length,
          hash: crypto.createHash('md5').update(previewData).digest('hex')
        };

        this.cacheSet(key, previews[size.name]);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Image previews generated in ${duration}ms`);

      return {
        success: true,
        previews,
        originalDimensions: {
          width: metadata.width,
          height: metadata.height
        },
        processingTime: duration
      };

    } catch (error) {
      console.error('❌ Image preview generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate single thumbnail only (fastest)
   */
  async generateThumbnail(fileBuffer) {
    const thumbnail = await this.generate(fileBuffer);
    return thumbnail.previews.thumbnail;
  }

  /**
   * Clear cache to free memory
   */
  clearCache() {
    const count = this.cache.size;
    this.cache.clear();
    console.log(`💾 Cache cleared: ${count} items removed`);
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

module.exports = new ImagePreviewService();
