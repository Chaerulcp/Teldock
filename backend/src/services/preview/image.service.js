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
    
    // Cache for generated previews
    this.cache = new Map();
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

      // Auto-orient based on EXIF data
      const orientedBuffer = await sharp(fileBuffer)
        .rotate()
        .toBuffer();

      // Generate all sizes
      const previews = {};
      
      for (const size of this.SIZES) {
        const key = `${size.name}-${metadata.width}x${metadata.height}`;
        
        if (this.cache.has(key)) {
          console.log(`✅ Serving from cache: ${key}`);
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

        // Cache result
        this.cache.set(key, previews[size.name]);
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
