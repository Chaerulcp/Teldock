require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const http = require("http");

const routes = require("./routes/index");
const userRoutes = require("./routes/user.routes"); // New
const folderRoutes = require("./routes/folder.routes"); // New
const previewRoutes = require("./routes/preview.routes"); // New
const botRoutes = require("./routes/bot.routes"); // Multi-bot pool
const shareRoutes = require("./routes/share.routes"); // Share management
const statsRoutes = require("./routes/stats.routes"); // Storage stats
const tagRoutes = require("./routes/tag.routes"); // Tags
const smartFolderRoutes = require("./routes/smart-folder.routes"); // Saved filters
const webdavRouter = require("./routes/webdav.routes"); // Rclone/WebDAV
const { testConnection } = require("./config/database");
const { assertSecrets } = require("./config/secrets");
const RealTimeSyncService = require("./services/realtime-sync.service");

// Fail fast on missing or placeholder secrets rather than falling back to
// values that are public in the repository.
assertSecrets();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        baseUri: ["'self'"],
        connectSrc: ["'self'"],
        defaultSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        imgSrc: ["'self'", "blob:", "data:"],
        mediaSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  }),
);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Share-Password"],
  }),
);

// Body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 login attempts per hour
  message: {
    success: false,
    error: "Too many login attempts, please try again after 1 hour.",
  },
});

// Apply rate limiting to specific routes
app.use("/api/auth/login", authLimiter);
app.use("/api/", generalLimiter);

// WebDAV endpoint (Rclone-compatible) - mounted before JSON rate limiter noise
app.use("/webdav", webdavRouter);

// API routes
app.use("/api", routes);
app.use("/api/user", userRoutes); // Add user-specific routes
app.use("/api/folders", folderRoutes); // Add folder routes
app.use("/api/previews", previewRoutes); // Add preview routes
app.use("/api/bots", botRoutes); // Multi-bot token pool
app.use("/api/shares", shareRoutes); // Share management
app.use("/api/stats", statsRoutes); // Storage stats
app.use("/api/tags", tagRoutes); // Tags
app.use("/api/smart-folders", smartFolderRoutes); // Saved filters

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error("Error:", err.stack);

  // Handle validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  // Generic error
  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection first
    await testConnection();

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize real-time sync service
    const realtimeSync = new RealTimeSyncService(server);

    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════╗
║  🚀 Telegram Cloud Storage API                         ║
║  Server running on port ${PORT}                        ║
║  Environment: ${process.env.NODE_ENV || "development"}               ║
║  API Base URL: http://localhost:${PORT}/api           ║
║  WebSocket: Enabled for real-time sync                 ║
╚════════════════════════════════════════════════════════╝
            `);
    });

    return { server, realtimeSync };
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

// `startServer()` is async, so the server/realtimeSync handles only exist once
// it resolves. Export the promise and let consumers await it.
const serverReady = startServer();

module.exports = { app, serverReady };
