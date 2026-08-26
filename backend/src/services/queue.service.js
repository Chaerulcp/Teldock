const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

// Connect to Redis
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
});

// Define queues with priority levels
const queues = {
  // High priority - immediate processing (user requests)
  high: new Queue('preview-high-priority', { connection }),
  
  // Normal priority - background processing (scheduled batches)
  normal: new Queue('preview-normal-priority', { connection }),
  
  // Low priority - cleanup/background tasks
  low: new Queue('preview-low-priority', { connection })
};

// Configure default job options
const defaultOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000
  },
  removeOnComplete: true,
  removeOnFail: false // Keep failed jobs for debugging
};

/**
 * Enqueue preview generation job
 */
async function enqueuePreviewGeneration(fileId, fileData, urgency = 'normal') {
  const jobId = `preview:${fileId}:${Date.now()}`;
  const priority = getPriority(urgency);
  
  return queues[urgency].add(jobId, { fileId, fileData }, {
    ...defaultOptions,
    priority
  });
}

/**
 * Get priority number (lower = higher priority)
 */
function getPriority(urgency) {
  switch (urgency) {
    case 'high': return 1;
    case 'normal': return 10;
    case 'low': return 50;
    default: return 10;
  }
}

/**
 * Create worker for processing image previews
 */
function createImageWorker(concurrency = 4) {
  return new Worker('preview-high-priority', async job => {
    const { fileId, fileData } = job.data;
    
    try {
      console.log(`🖼️ Processing image preview for file ${fileId}`);
      
      // Import service
      const imageService = require('./preview/image.service');
      
      // Generate previews
      const result = await imageService.generate(fileData.buffer);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Image preview failed for ${fileId}:`, error.message);
      throw error;
    }
  }, { 
    connection,
    concurrency
  });
}

/**
 * Create worker for processing video previews
 */
function createVideoWorker(concurrency = 2) {
  return new Worker('preview-video-priority', async job => {
    const { fileId, fileData } = job.data;
    
    try {
      console.log(`🎬 Processing video preview for file ${fileId}`);
      
      const videoService = require('./preview/video.service');
      
      // Extract thumbnail
      const thumbnail = await videoService.extractThumbnail(fileData.buffer);
      
      return {
        success: true,
        thumbnail: { data: thumbnail }
      };
      
    } catch (error) {
      console.error(`❌ Video preview failed for ${fileId}:`, error.message);
      throw error;
    }
  }, {
    connection,
    concurrency
  });
}

/**
 * Monitor queue status
 */
async function getQueueStats(queueName) {
  const queue = queues[queueName];
  
  if (!queue) return null;
  
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount()
  ]);
  
  return { waiting, active, completed, failed };
}

module.exports = {
  queues,
  enqueuePreviewGeneration,
  createImageWorker,
  createVideoWorker,
  getQueueStats,
  defaultOptions
};
