const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const fileRoutes = require('./file.routes');

// Mount routes. The public shared-link endpoint lives in file.routes.js
// (`GET /api/files/s/:token`) — do not re-declare it here.
router.use('/auth', authRoutes);
router.use('/files', fileRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Telegram Cloud Storage API',
        version: '2.0.0'
    });
});

module.exports = router;
