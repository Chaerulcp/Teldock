require('dotenv').config();
const { sequelize } = require('../src/models');

/**
 * Removes the legacy fixed 50GB storage quota. Capacity depends on the user's
 * own Telegram account/channel, so we drop the hard quota:
 *  - make storage_quota_bytes nullable
 *  - reset existing rows that still hold the old 50GB default to NULL
 */
async function run() {
    try {
        console.log('~ making storageQuotaBytes nullable');
        await sequelize.query('ALTER TABLE users MODIFY storageQuotaBytes BIGINT NULL DEFAULT NULL');

        console.log('~ clearing legacy 50GB quota from existing rows');
        await sequelize.query(
            'UPDATE users SET storageQuotaBytes = NULL WHERE storageQuotaBytes = 53687091200'
        );

        console.log('\n✅ storage quota removed (capacity now depends on Telegram)');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

run();
