const express = require("express");
const Busboy = require("busboy");
const { PassThrough } = require("stream");
const router = express.Router();
const {
  uploadFile,
  downloadFile,
  previewFile,
  createDownloadUrl,
  createPreviewUrl,
  listFiles,
  searchFiles,
  listVersions,
  revertVersion,
  updateFile,
  setFileTags,
  bulkAction,
  shareFile,
  deleteFile,
} = require("../controllers/file.controller");
const { accessSharedLink } = require("../controllers/public-share.controller");
const { authenticateToken } = require("../middleware/auth.middleware");
const {
  authenticateFileAccess,
} = require("../middleware/file-access.middleware");
const { sanitizeFilename } = require("../middleware/file-upload.middleware");
const { validateBody } = require("../middleware/validation.middleware");
const {
  bulkActionSchema,
  setFileTagsSchema,
  shareFileSchema,
  updateFileSchema,
} = require("../validation/file.validation");

const MAX_UPLOAD_BYTES =
  parseInt(process.env.MAX_UPLOAD_BYTES, 10) || 2 * 1024 * 1024 * 1024;

/**
 * Parse one multipart upload without buffering the file. Busboy exposes the
 * file stream directly; the controller consumes it and uploads bounded parts.
 */
function streamUpload(req, res, next) {
  if (
    !req.headers["content-type"] ||
    !req.headers["content-type"].startsWith("multipart/form-data")
  ) {
    return next(new Error("Content-Type must be multipart/form-data"));
  }

  const parser = Busboy({
    headers: req.headers,
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  });
  let fileFound = false;
  let nextCalled = false;
  const fields = {};

  // The stream is handed to the controller immediately. A bounded PassThrough
  // lets Busboy continue parsing trailing fields without buffering the file.
  parser.on("field", (name, value) => {
    fields[name] = value;
  });
  parser.on("file", (name, fileStream, info) => {
    if (fileFound) {
      fileStream.resume();
      return;
    }

    fileFound = true;
    const output = new PassThrough({ highWaterMark: 64 * 1024 });
    const fileInfo = {
      fieldname: name,
      originalname: sanitizeFilename(info.filename),
      encoding: info.encoding,
      mimetype: info.mimeType,
      size: 0,
      stream: output,
    };
    fileStream.on("data", (chunk) => {
      fileInfo.size += chunk.length;
    });
    fileStream.on("limit", () => {
      fileInfo.limitReached = true;
    });
    fileStream.on("error", (error) => output.destroy(error));
    fileStream.pipe(output);

    req.file = fileInfo;
    req.body = fields;
    nextCalled = true;
    next();
  });
  parser.on("filesLimit", () => {
    req.fileLimitReached = true;
  });
  parser.on("error", (error) => {
    if (!nextCalled) return next(error);
    if (req.file && req.file.stream) req.file.stream.destroy(error);
  });
  parser.on("finish", () => {
    if (req.file && req.file.limitReached) req.fileLimitReached = true;
    if (!nextCalled) {
      if (req.fileLimitReached)
        return res
          .status(413)
          .json({ success: false, error: "File too large" });
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });
    }
  });

  req.pipe(parser);

  // Keep the parser object private; consumers only need the completion
  // promise and the file stream attached to req.
}

const validateStreamedFile = (req, res, next) => {
  if (!req.file || !req.file.stream) {
    return res.status(400).json({ success: false, error: "No file uploaded" });
  }
  if (req.file.limitReached || req.file.size > MAX_UPLOAD_BYTES) {
    req.file.stream.resume();
    return res.status(413).json({ success: false, error: "File too large" });
  }
  next();
};

/**
 * This parser must hand off the stream before the request is fully consumed.
 * It is therefore used as the upload route middleware rather than multer.
 */
const upload = [streamUpload, validateStreamedFile];

// Protected routes
router.post("/upload", authenticateToken, upload, uploadFile);

router.post("/:id/download-url", authenticateToken, createDownloadUrl);
router.post("/:id/preview-url", authenticateToken, createPreviewUrl);

router.get("/:id/download", authenticateFileAccess("attachment"), downloadFile);
router.get("/:id/preview", authenticateFileAccess("inline"), previewFile);

router.get("/", authenticateToken, listFiles);

router.get("/search", authenticateToken, searchFiles);

// Bulk actions (delete/move) — must be before /:id routes
router.post(
  "/bulk",
  authenticateToken,
  validateBody(bulkActionSchema),
  bulkAction,
);

router.get("/:id/versions", authenticateToken, listVersions);

router.post("/:id/revert/:versionId", authenticateToken, revertVersion);

router.post(
  "/:id/share",
  authenticateToken,
  validateBody(shareFileSchema),
  shareFile,
);

router.patch(
  "/:id",
  authenticateToken,
  validateBody(updateFileSchema),
  updateFile,
);

router.put(
  "/:id/tags",
  authenticateToken,
  validateBody(setFileTagsSchema),
  setFileTags,
);

router.delete("/:id", authenticateToken, deleteFile);

// Shared link access endpoint (public — no authentication)
router.get("/s/:token", accessSharedLink);

module.exports = router;
