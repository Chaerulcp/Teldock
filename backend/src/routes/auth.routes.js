const express = require('express');
const router = express.Router();
const { register, login, refreshToken, getMe } = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

// Protected routes
router.get('/me', authenticateToken, getMe);

module.exports = router;
