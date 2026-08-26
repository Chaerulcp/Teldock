const { sequelize } = require('../config/database');
const User = require('./User');
const Folder = require('./Folder');
const File = require('./File');
const SharedLink = require('./SharedLink');
const TelegramConfig = require('./TelegramConfig');
const FileVersion = require('./FileVersion');
const FilePart = require('./FilePart');
const { BotToken } = require('./BotToken');

// Set up associations
User.hasMany(FileVersion, { foreignKey: 'userId', as: 'fileVersions' });
FileVersion.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(File, { foreignKey: 'userId', as: 'files' });
File.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Folder, { foreignKey: 'userId', as: 'folders' });
Folder.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Folder.hasMany(Folder, { foreignKey: 'parentFolderId', as: 'children' });
Folder.belongsTo(Folder, { foreignKey: 'parentFolderId', as: 'parent' });

User.hasMany(SharedLink, { foreignKey: 'creatorId', as: 'sharedLinks' });
SharedLink.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });

File.hasMany(SharedLink, { foreignKey: 'fileId', as: 'links' });
SharedLink.belongsTo(File, { foreignKey: 'fileId', as: 'file' });

File.hasMany(FileVersion, { foreignKey: 'fileId', as: 'versions' });
FileVersion.belongsTo(File, { foreignKey: 'fileId', as: 'file' });

Folder.hasMany(File, { foreignKey: 'folderId', as: 'files' });
File.belongsTo(Folder, { foreignKey: 'folderId', as: 'folder' });

File.hasMany(FilePart, { foreignKey: 'fileId', as: 'parts' });
FilePart.belongsTo(File, { foreignKey: 'fileId', as: 'file' });

User.hasMany(BotToken, { foreignKey: 'userId', as: 'botTokens' });
BotToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
    sequelize,
    User,
    Folder,
    File,
    SharedLink,
    TelegramConfig,
    FileVersion,
    FilePart,
    BotToken
};
