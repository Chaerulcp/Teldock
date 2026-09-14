const { verifyAccessToken } = require('../services/jwt.service');

/**
 * Authentication middleware
 * Validates JWT token from Authorization header
 */
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access token required'
            });
        }

        const decoded = verifyAccessToken(token);

        if (!decoded) {
            return res.status(403).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

/**
 * Optional authentication middleware
 * Sets req.user if token exists, otherwise allows request to proceed
 */
const optionalAuthenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        const decoded = verifyAccessToken(token);
        if (decoded) {
            req.user = decoded;
        }
    }

    next();
};

module.exports = {
    authenticateToken,
    optionalAuthenticate
};
