class FileServiceError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.name = 'FileServiceError';
        this.statusCode = statusCode;
    }
}

module.exports = { FileServiceError };
