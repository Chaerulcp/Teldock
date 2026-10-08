require('dotenv').config();
const { sequelize } = require('../src/models');

/**
 * Add aiSummary column to files table
 */
async function run() {
    try {
        console.log('~ checking if aiSummary column exists in files table');
        const queryInterface = sequelize.getQueryInterface();
        const tableDesc = await queryInterface.describeTable('files');

        if (!tableDesc.aiSummary) {
            console.log('~ adding aiSummary column to files table');
            await queryInterface.addColumn('files', 'aiSummary', {
                type: require('sequelize').DataTypes.TEXT,
                allowNull: true,
                comment: 'AI-generated summary of the file content'
            });
            console.log('✅ aiSummary column added');
        } else {
            console.log('✅ aiSummary column already exists');
        }
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

run();
