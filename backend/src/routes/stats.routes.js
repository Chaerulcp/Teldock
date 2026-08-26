const express = require('express');
const router = express.Router();
const { storageStats, duplicateStats } = require('../controllers/stats.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.get('/storage', storageStats);
router.get('/duplicates', duplicateStats);

module.exports = router;
