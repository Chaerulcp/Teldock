require('dotenv').config();
const { sequelize } = require('../src/models');

/**
 * Adds teldrive-style columns to the existing `files` table and relaxes the
 * NOT NULL constraint on single-message Telegram columns (chunked files store
 * their references in `file_parts` instead).
 */
async function run() {
    const qi = sequelize.getQueryInterface();
    const table = await qi.describeTable('files');

    const addColumn = async (name, definition) => {
        if (!table[name]) {
            console.log(`+ adding column files.${name}`);
            await sequelize.query(`ALTER TABLE files ADD COLUMN ${name} ${definition}`);
        } else {
            console.log(`= column files.${name} already exists`);
        }
    };

    try {
        await addColumn('isChunked', 'TINYINT(1) NOT NULL DEFAULT 0');
        await addColumn('partCount', 'INT NOT NULL DEFAULT 1');
        await addColumn('isEncrypted', 'TINYINT(1) NOT NULL DEFAULT 0');
        await addColumn('encryptionSalt', 'VARCHAR(64) NULL');
        await addColumn('checksum', 'VARCHAR(64) NULL');

        // Relax NOT NULL on single-message columns so chunked files can omit them
        console.log('~ relaxing NOT NULL on telegramMessageId / telegramFileId');
        await sequelize.query('ALTER TABLE files MODIFY telegramMessageId INT NULL');
        await sequelize.query('ALTER TABLE files MODIFY telegramFileId VARCHAR(255) NULL');

        console.log('\n✅ files table upgraded for chunked/encrypted storage');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

run();
