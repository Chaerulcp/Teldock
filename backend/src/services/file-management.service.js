const { Op } = require("sequelize");
const { sequelize } = require("../config/database");
const { File, FilePart, Folder, SharedLink, Tag, User } = require("../models");
const { sanitizeFilename } = require("../middleware/file-upload.middleware");
const telegramStorage = require("./telegram-storage.service");
const { FileServiceError } = require("./file-service-error");

async function findOwnedFile(fileId, userId, includeParts = false) {
  const file = await File.findOne({
    where: { id: fileId, userId, isDeleted: false },
    include: includeParts ? [{ model: FilePart, as: "parts" }] : [],
  });

  if (!file) {
    throw new FileServiceError(404, "File not found");
  }

  return file;
}

function getDeleteParts(file) {
  if (file.parts && file.parts.length > 0) {
    return file.parts;
  }

  return [
    {
      partIndex: 0,
      telegramChatId: file.telegramChatId,
      telegramMessageId: file.telegramMessageId,
    },
  ];
}

async function updateStorageUsage(userId, byteDelta, transaction) {
  await User.update(
    {
      storageUsedBytes: sequelize.literal(
        `GREATEST(\`storageUsedBytes\` + ${byteDelta}, 0)`,
      ),
    },
    { where: { id: userId }, transaction },
  );
}

async function createShare(fileId, userId, data) {
  await findOwnedFile(fileId, userId);
  const sharedLink = await SharedLink.createLink(fileId, userId, {
    expiresIn: parseInt(data.expiresIn, 10) || null,
    downloadLimit: data.downloadLimit ? parseInt(data.downloadLimit, 10) : null,
    password: data.password || null,
    allowPreview: data.allowPreview !== false,
  });

  return {
    id: sharedLink.id,
    shortUrl: `${process.env.FRONTEND_URL || ""}/s/${sharedLink.token}`,
    expiresAt: sharedLink.expiresAt,
    downloadLimit: sharedLink.downloadLimit,
    usedDownloads: sharedLink.usedDownloads,
  };
}

async function deleteFile(fileId, userId, deleteFromTelegram) {
  const file = await findOwnedFile(fileId, userId, true);

  if (deleteFromTelegram) {
    try {
      await telegramStorage.deleteFile(userId, getDeleteParts(file));
    } catch (error) {
      console.warn("Failed to delete file parts from Telegram:", error.message);
    }
  }

  file.isDeleted = true;
  file.deletedAt = new Date();
  await file.save();
  await updateStorageUsage(userId, -Number(file.fileSize));
}

async function updateFile(fileId, userId, data) {
  const file = await findOwnedFile(fileId, userId);
  const { displayFilename, folderId, isFavorite } = data;

  if (folderId !== undefined) {
    if (folderId === null || folderId === "" || folderId === "root") {
      file.folderId = null;
    } else {
      const folder = await Folder.findOne({ where: { id: folderId, userId } });
      if (!folder) {
        throw new FileServiceError(404, "Destination folder not found");
      }
      file.folderId = folderId;
    }
  }

  if (displayFilename !== undefined) {
    const cleanFilename = sanitizeFilename(String(displayFilename).trim());
    if (!cleanFilename) {
      throw new FileServiceError(400, "Invalid filename");
    }
    file.displayFilename = cleanFilename;
  }

  if (isFavorite !== undefined) {
    file.isFavorite = isFavorite === true || isFavorite === "true";
  }

  await file.save();
  return file;
}

async function setFileTags(fileId, userId, tagIds) {
  const file = await findOwnedFile(fileId, userId);
  const ids = Array.isArray(tagIds) ? tagIds : [];
  const tags = ids.length
    ? await Tag.findAll({ where: { id: ids, userId } })
    : [];

  await file.setTags(tags);

  const refreshed = await File.findByPk(fileId, {
    include: [
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name", "color"],
        through: { attributes: [] },
      },
    ],
  });
  return refreshed.tags;
}

async function resolveDestinationFolder(userId, folderId, transaction) {
  if (!folderId || folderId === "root") {
    return null;
  }

  const folder = await Folder.findOne({
    where: { id: folderId, userId },
    transaction,
  });
  if (!folder) {
    throw new FileServiceError(404, "Destination folder not found");
  }

  return folderId;
}

async function bulkAction(userId, { action, fileIds, folderId }) {
  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    throw new FileServiceError(400, "No files selected");
  }
  if (!["delete", "move"].includes(action)) {
    throw new FileServiceError(400, "Invalid action");
  }

  const transaction = await sequelize.transaction();
  try {
    const files = await File.findAll({
      where: { id: { [Op.in]: fileIds }, userId, isDeleted: false },
      include: [{ model: FilePart, as: "parts" }],
      transaction,
    });
    if (files.length === 0) {
      throw new FileServiceError(404, "No matching files found");
    }

    if (action === "move") {
      const destinationFolderId = await resolveDestinationFolder(
        userId,
        folderId,
        transaction,
      );
      await File.update(
        { folderId: destinationFolderId },
        {
          where: { id: { [Op.in]: files.map((file) => file.id) }, userId },
          transaction,
        },
      );
      await transaction.commit();
      return { action, count: files.length };
    }

    const freedBytes = files.reduce(
      (total, file) => total + Number(file.fileSize),
      0,
    );
    for (const file of files) {
      file.isDeleted = true;
      file.deletedAt = new Date();
      await file.save({ transaction });
    }
    await updateStorageUsage(userId, -freedBytes, transaction);
    await transaction.commit();

    for (const file of files) {
      telegramStorage
        .deleteFile(userId, getDeleteParts(file))
        .catch((error) => {
          console.warn(
            `Failed to delete Telegram parts for file ${file.id}:`,
            error.message,
          );
        });
    }

    return { action, count: files.length };
  } catch (error) {
    await transaction.rollback().catch(() => {});
    throw error;
  }
}

module.exports = {
  bulkAction,
  createShare,
  deleteFile,
  setFileTags,
  updateFile,
};
