const path = require('path');

/**
 * Filename helpers shared by the upload paths.
 *
 * The multer-based upload middleware that used to live here was removed: the
 * upload route streams the request body with busboy
 * (`backend/src/routes/file.routes.js`) and the WebDAV route streams directly,
 * so no caller ever used it. Only the helpers below are imported elsewhere.
 */

/**
 * Sanitize filename to prevent security issues.
 *
 * Strips characters that are unsafe on common filesystems, removes control
 * characters, and — critically — neutralizes path separators so a supplied
 * name can never address another directory. Callers persist the result as
 * display metadata, so a traversal sequence reaching a future path-mapping
 * caller would otherwise escape the intended directory.
 */
function sanitizeFilename(filename) {
    if (typeof filename !== 'string' || filename.length === 0) {
        return 'unnamed-file';
    }

    // Unsafe filename characters plus both path separators.
    let sanitized = filename.replace(/[<>:"\\|?*/]/g, '_');

    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');

    // A name made only of dots is a directory token ("." or ".."), not a file.
    if (/^\.+$/.test(sanitized)) {
        return 'unnamed-file';
    }

    // Get extension and name separately
    const ext = path.extname(sanitized);
    const name = sanitized.substring(0, sanitized.lastIndexOf(ext));

    // Limit name length to 200 chars
    const newName = name.substring(0, 200);

    return `${newName}${ext}` || 'unnamed-file';
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
    sanitizeFilename,
    formatFileSize,
};
