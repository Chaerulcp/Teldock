const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Configure storage
const storage = multer.memoryStorage(); // Use memory for streaming to Telegram

// File filter function
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/zip',
        'application/x-zip-compressed',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
        'video/mp4',
        'audio/mpeg'
    ];

    // Check MIME type
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error('Invalid file type. Only documents, images, videos, and audio files allowed.'), false);
    }

    cb(null, true);
};

// Upload configuration
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max (standard Bot API limit)
    }
});

/**
 * Validate uploaded file before processing
 */
async function validateFile(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        // Additional validation can be added here
        req.file.originalname = sanitizeFilename(req.file.originalname);
        
        next();
    } catch (error) {
        console.error('File validation error:', error.message);
        return res.status(400).json({
            success: false,
            error: error.message || 'File validation failed'
        });
    }
}

/**
 * Sanitize filename to prevent security issues
 */
function sanitizeFilename(filename) {
    // Remove special characters and potential path traversal attempts
    let sanitized = filename.replace(/[<>:"\\|?*]/g, '');
    
    // Remove leading/trailing dots and spaces
    sanitized = sanitized.trim().replace(/^[.\s]+/, '').replace(/[.\s]+$/, '');
    
    // Limit length
    sanitized = sanitized.substring(0, 255);
    
    // Add timestamp prefix to avoid conflicts
    const timestamp = Date.now();
    const ext = path.extname(filename);
    const name = path.basename(filename, ext);
    
    return `${timestamp}_${sanitized}${ext}`;
}

module.exports = {
    upload,
    validateFile,
    sanitizeFilename
};
