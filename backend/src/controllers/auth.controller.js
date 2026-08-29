const User = require('../models').User;
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateAccessToken, generateRefreshToken } = require('../services/jwt.service');

const BCRYPT_ROUNDS = 12;

// Hash of a random secret, compared against when the account does not exist so
// that login timing is identical for unknown and known emails.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), BCRYPT_ROUNDS);

/**
 * POST /api/auth/register
 * Register new user with email/password or Telegram auth
 */
async function register(req, res) {
    console.log('📝 Registration attempt:', req.body.email || req.body.telegramId);
    
    try {
        const { email, password, telegramId, username, firstName, lastName } = req.body;

        // Validate input
        if (!email && !telegramId) {
            return res.status(400).json({
                success: false,
                error: 'Email or Telegram ID is required'
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({
            where: {
                email: email || null,
                telegramId: telegramId || null
            }
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'User already exists'
            });
        }

        // Hash password if provided
        let passwordHash = null;
        if (password) {
            passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        }

        // Create user
        const user = await User.create({
            email: email || null,
            telegramId: telegramId || null,
            username: username || null,
            firstName: firstName || null,
            lastName: lastName || null,
            passwordHash,
            avatarUrl: req.body.avatarUrl || null
        });

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    telegramId: user.telegramId,
                    username: user.username,
                    firstName: user.firstName,
                    storageQuotaBytes: user.storageQuotaBytes,
                    storageUsedBytes: user.storageUsedBytes
                },
                accessToken,
                refreshToken,
                expiresAt: Date.now() + (15 * 60 * 1000)
            }
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        console.error('Error stack:', error.stack);
        
        res.status(500).json({
            success: false,
            error: 'Registration failed: ' + error.message
        });
    }
}

/**
 * POST /api/auth/login
 * Login existing user
 */
async function login(req, res) {
    try {
        const { email, password } = req.body;

        // Email + password is the only supported login. Telegram login is not
        // implemented: verifying it requires checking Telegram's login-widget
        // HMAC, and accepting a bare telegramId would be an authentication bypass.
        if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        const user = await User.findOne({ where: { email } });

        // Always run a bcrypt comparison so response timing does not reveal
        // whether the account exists.
        const storedHash = user && user.passwordHash ? user.passwordHash : DUMMY_PASSWORD_HASH;
        const isValid = await bcrypt.compare(password, storedHash);

        if (!user || !user.passwordHash || !isValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    telegramId: user.telegramId,
                    username: user.username,
                    firstName: user.firstName,
                    storageQuotaBytes: user.storageQuotaBytes,
                    storageUsedBytes: user.storageUsedBytes
                },
                accessToken,
                refreshToken,
                expiresAt: Date.now() + (15 * 60 * 1000)
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Login failed: ' + error.message
        });
    }
}

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
async function refreshToken(req, res) {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token required'
            });
        }

        // Verify refresh token
        const decoded = require('../services/jwt.service').verifyRefreshToken(refreshToken);

        if (!decoded) {
            return res.status(403).json({
                success: false,
                error: 'Invalid refresh token'
            });
        }

        // Get user from DB
        const user = await User.findByPk(decoded.userId);

        if (!user || !user.isActive) {
            return res.status(403).json({
                success: false,
                error: 'User not found or inactive'
            });
        }

        // Generate new access token
        const newAccessToken = generateAccessToken(user);

        res.json({
            success: true,
            data: {
                accessToken: newAccessToken,
                expiresAt: Date.now() + (15 * 60 * 1000)
            }
        });

    } catch (error) {
        console.error('❌ Refresh token error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Token refresh failed'
        });
    }
}

/**
 * GET /api/auth/me
 * Get current user info (protected route)
 */
async function getMe(req, res) {
    try {
        const user = await User.findByPk(req.user.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    telegramId: user.telegramId,
                    username: user.username,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    avatarUrl: user.avatarUrl,
                    storageQuotaBytes: user.storageQuotaBytes,
                    storageUsedBytes: user.storageUsedBytes,
                    isPremium: user.isPremium,
                    premiumUntil: user.premiumUntil
                }
            }
        });

    } catch (error) {
        console.error('❌ Get me error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to get user info'
        });
    }
}

module.exports = {
    register,
    login,
    refreshToken,
    getMe
};

