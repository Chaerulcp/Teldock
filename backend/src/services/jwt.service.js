const jwt = require("jsonwebtoken");
require("dotenv").config();

/**
 * Generate access token
 */
function generateAccessToken(user) {
  const payload = {
    userId: user.id,
    telegramId: user.telegramId,
    email: user.email,
    role: "user", // Can be expanded later
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "15m",
  });
}

/**
 * Generate refresh token
 */
function generateRefreshToken(user) {
  const payload = {
    userId: user.id,
    type: "refresh",
  };

  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRE || "7d",
  });
}

/**
 * Verify access token
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Sign a short-lived URL token restricted to one file and stream disposition.
 */
function generateFileAccessToken({ userId, fileId, disposition }) {
  return jwt.sign(
    {
      type: "file-access",
      userId,
      fileId,
      disposition,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.FILE_ACCESS_TOKEN_EXPIRE || "5m",
    },
  );
}

function verifyFileAccessToken(token, { fileId, disposition }) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const isValid =
      decoded.type === "file-access" &&
      decoded.fileId === fileId &&
      decoded.disposition === disposition &&
      typeof decoded.userId === "string";

    return isValid ? decoded : null;
  } catch {
    return null;
  }
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    return null;
  }
}

/**
 * Decode token without verification (for debugging)
 */
function decodeToken(token) {
  return jwt.decode(token);
}

module.exports = {
  generateAccessToken,
  generateFileAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyFileAccessToken,
  verifyRefreshToken,
  decodeToken,
};
