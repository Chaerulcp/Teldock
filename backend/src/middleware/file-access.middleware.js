const {
  verifyAccessToken,
  verifyFileAccessToken,
} = require("../services/jwt.service");

function authenticateFileAccess(disposition) {
  return (req, res, next) => {
    const signature = req.query.signature;
    if (typeof signature === "string") {
      const token = verifyFileAccessToken(signature, {
        fileId: req.params.id,
        disposition,
      });

      if (!token) {
        return res
          .status(403)
          .json({
            success: false,
            error: "Invalid or expired file access signature",
          });
      }

      req.user = { userId: token.userId };
      return next();
    }

    const authorization = req.headers.authorization;
    const accessToken =
      authorization?.startsWith("Bearer ") && authorization.slice(7);
    const user = accessToken && verifyAccessToken(accessToken);
    if (!user) {
      return res
        .status(401)
        .json({
          success: false,
          error: "File access signature or access token required",
        });
    }

    req.user = user;
    next();
  };
}

module.exports = { authenticateFileAccess };
