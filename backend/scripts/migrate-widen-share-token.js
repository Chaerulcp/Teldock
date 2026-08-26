require('dotenv').config();
const { sequelize } = require('../src/models');

/**
 * Widen shared_links.token to hold full JWT strings (were capped at VARCHAR(64)).
 */
async function run() {
    try {
        console.log('~ widening shared_links.token to VARCHAR(512)');
        await sequelize.query('ALTER TABLE shared_links MODIFY token VARCHAR(512) NOT NULL');
        console.log('\n✅ shared_links.token widened');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

run();
