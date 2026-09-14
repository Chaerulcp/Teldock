const bcrypt = require("bcryptjs");
const { SharedLink, File, FilePart } = require("../models");
const telegramStorage = require("../services/telegram-storage.service");

/**
 * Build the part list for a file, falling back to the legacy single-part columns.
 */
function resolveParts(file) {
  if (file.parts && file.parts.length > 0) return file.parts;

  return [
    {
      partIndex: 0,
      telegramChatId: file.telegramChatId,
      telegramMessageId: file.telegramMessageId,
      telegramFileId: file.telegramFileId,
      partSize: file.fileSize,
      plainSize: file.fileSize,
      encryptionIv: null,
    },
  ];
}

/**
 * Metadata safe to expose to an anonymous share visitor. Telegram identifiers
 * are never included.
 */
function publicFileMetadata(file) {
  return {
    id: file.id,
    originalFilename: file.originalFilename,
    displayFilename: file.displayFilename,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    isEncrypted: file.isEncrypted,
    uploadedAt: file.createdAt,
  };
}

/**
 * Verify the optional share password. Returns null when access is allowed,
 * or an { status, body } describing the rejection.
 */
function getSharePassword(req) {
  return req.get("X-Share-Password");
}

async function checkPassword(sharedLink, file, providedPassword) {
  if (!sharedLink.passwordHash) return null;

  if (!providedPassword) {
    return {
      status: 200,
      body: {
        success: true,
        requiresPassword: true,
        data: { fileName: file.originalFilename, fileId: file.id },
      },
    };
  }

  const isValid = await bcrypt.compare(
    providedPassword,
    sharedLink.passwordHash,
  );
  if (!isValid) {
    return {
      status: 401,
      body: { success: false, error: "Incorrect password" },
    };
  }

  return null;
}

/**
 * Stream the shared file bytes through this server. The Telegram bot token is
 * resolved server-side and never reaches the client.
 */
async function streamSharedFile(res, file) {
  const totalSize = Number(file.fileSize);
  const encodedName = encodeURIComponent(
    file.displayFilename || file.originalFilename,
  );

  res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
  res.setHeader("Content-Length", totalSize);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
  );

  const { stream } = telegramStorage.createReadStream(
    file.userId,
    resolveParts(file),
    file.encryptionSalt,
    { start: 0, end: totalSize - 1 },
  );

  stream.on("error", (err) => {
    console.error("❌ Shared stream error:", err.message);
    if (!res.headersSent) {
      res.status(502).json({ success: false, error: "Download failed" });
    } else {
      res.destroy(err);
    }
  });

  stream.pipe(res);
}

/**
 * GET /api/files/s/:token
 * Public shared-link access. Returns metadata by default, or streams the file
 * when `?download=true` and the link permits downloading.
 */
async function accessSharedLink(req, res) {
  try {
    const validation = await SharedLink.validateToken(req.params.token);

    if (!validation.valid) {
      return res.status(403).json({ success: false, error: validation.error });
    }

    const sharedLink = validation.data;
    const file = await File.findOne({
      where: { id: sharedLink.fileId, isDeleted: false },
      include: [{ model: FilePart, as: "parts" }],
    });

    if (!file) {
      return res
        .status(404)
        .json({ success: false, error: "File no longer available" });
    }

    // Password is checked before any counter is touched, so a wrong guess
    // cannot burn the link's download quota.
    const rejection = await checkPassword(
      sharedLink,
      file,
      getSharePassword(req),
    );
    if (rejection) {
      return res.status(rejection.status).json(rejection.body);
    }

    const wantsDownload = req.query.download === "true";

    if (wantsDownload) {
      if (!sharedLink.allowDownload) {
        return res.status(403).json({
          success: false,
          error: "This link does not allow downloading",
        });
      }

      const reserved = await SharedLink.consumeDownload(sharedLink.id);
      if (!reserved) {
        return res.status(403).json({
          success: false,
          error: "This shared link has expired or reached download limit",
        });
      }

      return streamSharedFile(res, file);
    }

    if (!sharedLink.allowPreview) {
      return res.status(403).json({
        success: false,
        error: "This link does not allow previewing",
      });
    }

    await sharedLink.recordView();

    return res.json({
      success: true,
      data: {
        file: publicFileMetadata(file),
        expiresAt: sharedLink.expiresAt,
        allowDownload: sharedLink.allowDownload,
        usedDownloads: sharedLink.usedDownloads,
        downloadLimit: sharedLink.downloadLimit,
      },
    });
  } catch (error) {
    console.error("❌ Shared link access failed:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: "Link access failed" });
    }
  }
}

module.exports = { accessSharedLink, getSharePassword };
