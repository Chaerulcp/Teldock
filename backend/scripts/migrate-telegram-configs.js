const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTelegramConfigsTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'tele_storage_db'
    });

    try {
        console.log('📋 Creating user_telegram_configs table...\n');

        // Check if table exists
        const [tables] = await connection.query(`
            SHOW TABLES LIKE 'user_telegram_configs'
        `);

        if (tables.length > 0) {
            console.log('⚠️  Table already exists. Skipping creation.\n');
            return;
        }

        // Create table
        await connection.query(`
            CREATE TABLE user_telegram_configs (
                id VARCHAR(36) PRIMARY KEY,
                user_id CHAR(36) NOT NULL,
                bot_token_encrypted TEXT NOT NULL,
                storage_chat_id VARCHAR(50) NOT NULL,
                chat_type ENUM('channel', 'group', 'private') DEFAULT 'channel',
                username VARCHAR(100),
                is_active TINYINT(1) DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_is_active (is_active),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✅ Table created successfully!\n');
        console.log('📊 New Database Schema:');
        console.log('  - Table: user_telegram_configs');
        console.log('  - Columns: id, user_id, token_encrypted, chat_id, chat_type, username, is_active');
        console.log('  - Constraints: Foreign key to users table\n');

        console.log('Ready for next steps: Implement TelegramConfig model...\n');

    } catch (error) {
        console.error('❌ Error creating table:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

createTelegramConfigsTable().catch(console.error);
