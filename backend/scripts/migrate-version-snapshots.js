require('dotenv').config();
const { sequelize } = require('../src/models');

/**
 * Upgrade file_versions to store full part snapshots (chunked/encrypted support).
 * Adds new columns and relaxes telegramMessageId to nullable.
 */
async function run() {
    const qi = sequelize.getQueryInterface();
    const table = await qi.describeTable('file_versions');

    const add = async (name, ddl) => {
        if (!table[name]) {
            console.log(`+ adding file_versions.${name}`);
            await sequelize.query(`ALTER TABLE file_versions ADD COLUMN ${name} ${ddl}`);
        } else {
            console.log(`= file_versions.${name} exists`);
        }
    };

    try {
        await add('telegramFileId', 'VARCHAR(255) NULL');
        await add('telegramChatId', 'BIGINT NULL');
        await add('isChunked', 'TINYINT(1) NOT NULL DEFAULT 0');
        await add('partCount', 'INT NOT NULL DEFAULT 1');
        await add('isEncrypted', 'TINYINT(1) NOT NULL DEFAULT 0');
        await add('encryptionSalt', 'VARCHAR(64) NULL');
        await add('partsSnapshot', 'LONGTEXT NULL');

        console.log('~ relaxing telegramMessageId to nullable');
        await sequelize.query('ALTER TABLE file_versions MODIFY telegramMessageId INT NULL');

        console.log('\n✅ file_versions upgraded for part snapshots');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

run();
