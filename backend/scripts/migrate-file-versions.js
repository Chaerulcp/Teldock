const mysql = require('mysql2/promise');
require('dotenv').config();

async function createFileVersionsTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'tele_storage_db'
    });

    try {
        console.log('📋 Creating file_versions table...\n');

        // Check if table exists
        const [tables] = await connection.query(`
            SHOW TABLES LIKE 'file_versions'
        `);

        if (tables.length > 0) {
            console.log('⚠️  Table already exists. Skipping creation.\n');
            return;
        }

        // Create version tracking table
        await connection.query(`
            CREATE TABLE file_versions (
                id CHAR(36) PRIMARY KEY,
                file_id CHAR(36) NOT NULL,
                telegram_message_id INT NOT NULL,
                user_id CHAR(36) NOT NULL,
                version_number INT NOT NULL,
                original_filename VARCHAR(500),
                display_filename VARCHAR(500),
                mime_type VARCHAR(100),
                file_size BIGINT NOT NULL,
                checksum VARCHAR(64),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_file_id (file_id),
                INDEX idx_user_id (user_id),
                INDEX idx_version_number (version_number),
                FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✅ File versions table created successfully!\n');
        console.log('📊 New Database Schema:');
        console.log('  - Table: file_versions');
        console.log('  - Purpose: Track all file versions with rollback capability\n');

    } catch (error) {
        console.error('❌ Error creating table:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

createFileVersionsTable().catch(console.error);
