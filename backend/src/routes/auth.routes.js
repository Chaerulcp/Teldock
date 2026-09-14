const express = require('express');
const router = express.Router();
const { register, login, refreshToken, getMe } = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validation.middleware');
const { loginSchema, refreshTokenSchema, registerSchema } = require('../validation/auth.validation');

// Public routes
router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/refresh', validateBody(refreshTokenSchema), refreshToken);

// Protected routes
router.get('/me', authenticateToken, getMe);

module.exports = router;
