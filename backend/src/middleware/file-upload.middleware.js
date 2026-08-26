const multer = require('multer');
const stream = require('stream');
const { pipeline } = require('stream/promises');
const fs = require('fs').promises;

/**
 * Create multer storage for memory-based file handling (for streaming)
 */
const createMemoryStorage = () => {
    return multer.memoryStorage();
};

/**
 * Create multer storage for temporary file saving (large files)
 */
const createTempFileStorage = (dir = './temp') => {
    const storage = multer.diskStorage({
        destination: async (req, file, cb) => {
            try {
                await fs.mkdir(dir, { recursive: true });
                cb(null, dir);
            } catch (error) {
                cb(error, null);
            }
        },
        filename: (req, file, cb) => {
            const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
            cb(null, uniqueName);
        }
    });

    return storage;
};

/**
 * File validation filters
 */
const ALLOWED_MIME_TYPES = {
    documents: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/json',
        'text/plain',
        'application/xml'
    ],
    images: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp'
    ],
    videos: [
        'video/mp4',
        'video/mkv',
        'video/avi',
        'video/quicktime',
        'video/x-msvideo'
    ],
    audio: [
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/flac',
        'audio/aac'
    ],
    archives: [
        'application/zip',
        'application/x-zip-compressed',
        'application/x-rar-compressed',
        'application/gzip',
        'application/x-7z-compressed'
    ]
};

const ALL_ALLOWED_TYPES = Object.values(ALLOWED_MIME_TYPES).flat();

/**
 * Custom file filter
 */
const fileFilter = (req, file, cb) => {
    if (ALL_ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${ALL_ALLOWED_TYPES.join(', ')}`), false);
    }
};

/**
 * Create upload middleware with configurable options
 */
const createUploadMiddleware = (options = {}) => {
    const {
        maxFileSize = 50 * 1024 * 1024, // 50MB default (Telegram limit)
        allowedTypes = 'all', // all, document, image, video, audio, archive
        storageType = 'memory', // memory or temp-file
        tempDir = './temp',
        limits = {}
    } = options;

    // Set storage
    const storage = storageType === 'memory' 
        ? createMemoryStorage() 
        : createTempFileStorage(tempDir);

    // Build filters
    let mimeFilter = fileFilter;
    if (allowedTypes !== 'all') {
        const allowedMimes = ALLOWED_MIME_TYPES[allowedTypes];
        if (!allowedMimes) {
            throw new Error(`Unknown allowedTypes: ${allowedTypes}`);
        }

        mimeFilter = (req, file, cb) => {
            if (allowedMimes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error(`Invalid file type. Expected: ${allowedTypes}`), false);
            }
        };
    }

    // Build multer config
    const multerConfig = {
        storage,
        fileFilter: mimeFilter,
        limits: {
            fileSize: maxFileSize,
            ...limits
        }
    };

    return multer(multerConfig);
};

/**
 * Validate file before processing
 */
async function validateFile(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        // Check file size
        if (req.file.size > 50 * 1024 * 1024) { // Telegram cloud API limit
            return res.status(413).json({
                success: false,
                error: 'File too large. Maximum size is 50MB for cloud storage.'
            });
        }

        // Sanitize filename
        req.file.originalname = sanitizeFilename(req.file.originalname);

        next();
    } catch (error) {
        console.error('File validation error:', error.message);
        res.status(400).json({
            success: false,
            error: error.message || 'File validation failed'
        });
    }
}

/**
 * Stream file from memory buffer to output stream
 */
async function streamFromBuffer(buffer, outputStream) {
    const readableStream = stream.Readable.from([buffer]);
    await pipeline(readableStream, outputStream);
}

/**
 * Stream file from disk to output stream
 */
async function streamFromFile(filePath, outputStream) {
    const readStream = fs.createReadStream(filePath);
    await pipeline(readStream, outputStream);
}

/**
 * Sanitize filename to prevent security issues
 */
function sanitizeFilename(filename) {
    const path = require('path');
    
    // Remove special characters
    let sanitized = filename.replace(/[<>:"\\|?*]/g, '_');
    
    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');
    
    // Get extension and name separately
    const ext = path.extname(sanitized);
    const name = sanitized.substring(0, sanitized.lastIndexOf(ext));
    
    // Limit name length to 200 chars
    const newName = name.substring(0, 200);
    
    return `${newName}${ext}`;
}

/**
 * Calculate file size in human-readable format
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
    createUploadMiddleware,
    validateFile,
    streamFromBuffer,
    streamFromFile,
    sanitizeFilename,
    formatFileSize,
    ALLOWED_MIME_TYPES,
    ALL_ALLOWED_TYPES
};
