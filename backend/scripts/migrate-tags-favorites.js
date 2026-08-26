require('dotenv').config();
const { sequelize } = require('../src/models');

/**
 * Adds Tags, Favorites, and Smart Folders:
 *  - files.isFavorite column
 *  - tags table
 *  - file_tags join table
 *  - smart_folders table
 */
async function run() {
    try {
        const qi = sequelize.getQueryInterface();
        const files = await qi.describeTable('files');

        if (!files.isFavorite) {
            console.log('+ adding files.isFavorite');
            await sequelize.query('ALTER TABLE files ADD COLUMN isFavorite TINYINT(1) NOT NULL DEFAULT 0');
        } else {
            console.log('= files.isFavorite exists');
        }

        // Create tags / file_tags / smart_folders via model sync (only missing tables)
        const { Tag, FileTag, SmartFolder } = require('../src/models');
        await Tag.sync();
        await FileTag.sync();
        await SmartFolder.sync();

        console.log('\n✅ tags, file_tags, smart_folders ready; files.isFavorite added');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

run();
