require('dotenv').config();
const {
    sequelize,
    User,
    Folder,
    File,
    SharedLink,
    TelegramConfig,
    FileVersion,
    FilePart,
    BotToken
} = require('../src/models');

async function runMigrations() {
    try {
        console.log('🚀 Starting migrations...\n');

        // Sync all models (associations are registered via models/index.js)
        await sequelize.sync({ force: false });

        console.log('✅ All tables created successfully!\n');
        console.log('Tables created:');
        console.log('  - users (id, email, telegramId, username, passwordHash, storage quotas...)');
        console.log('  - folders (id, user_id, parent_folder_id, name, telegram_topic_id...)');
        console.log('  - files (id, user_id, folder_id, telegram metadata, sharing options...)');
        console.log('  - shared_links (id, file_id, creator_id, token, expiration, limits...)');
        console.log('  - user_telegram_configs (id, user_id, bot token, storage chat id...)');
        console.log('  - file_versions (id, file_id, user_id, version_number, checksum...)');
        console.log('  - file_parts (id, file_id, part_index, telegram refs, encryption iv...)');
        console.log('  - bot_tokens (id, user_id, encrypted token, bot username...)');
        console.log('\nRelationships:');
        console.log('  • Users → Folders (One-to-Many, CASCADE delete)');
        console.log('  • Folders → Files (One-to-Many, SET NULL on delete)');
        console.log('  • Users → Files (One-to-Many, CASCADE delete)');
        console.log('  • Files → SharedLinks (One-to-Many, CASCADE delete)');
        console.log('  • Users → SharedLinks (One-to-Many, CASCADE delete)');
        console.log('  • Files → FileVersions (One-to-Many, CASCADE delete)');
        console.log('  • Users → TelegramConfigs (One-to-Many, CASCADE delete)');
        console.log('\n📝 Migration completed at', new Date().toLocaleString());

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

runMigrations();
