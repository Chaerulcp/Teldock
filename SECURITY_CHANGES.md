# Security & Streaming Improvements

This document summarizes security fixes and streaming implementations made to address P0 and P1 findings from the AGENTS.md audit.

## Completed Changes

### 1. Authentication Bypass (P0) - FIXED
**File:** `backend/src/controllers/auth.controller.js`

- Login now requires both `email` AND `password` as non-empty strings
- Telegram login without password verification was removed entirely (requires proper HMAC signature check)
- Added constant-time bcrypt comparison against dummy hash when user doesn't exist (prevents timing attacks)

### 2. Bot Token Exposure Prevention (P0) - FIXED
**Files:** `backend/src/routes/file.routes.js`, `backend/src/routes/index.js`, `backend/src/controllers/share.controller.js`, `backend/src/controllers/public-share.controller.js`

- Removed 3 `res.redirect()` calls that leaked bot tokens via HTTP `Location` header
- Implemented server-side streaming proxy for shared links using `telegramStorage.createReadStream()`
- Created dedicated share controller to centralize secure access handling

### 3. Secret Configuration Validation (P0) - FIXED
**Files:** `backend/src/config/secrets.js`, `backend/src/app.js`

- Created centralized secret resolver with `requireSecret()` function
- Added validation at boot time (via `assertSecrets()`) to fail fast on placeholder values
- Blocks deployment with unsafe fallback secrets like `'default-secret'`

### 4. Memory-Efficient Upload (P0 #5) - FIXED
**Files:** `backend/src/routes/file.routes.js`, `backend/src/services/telegram-storage.service.js`

- Replaced `multer.memoryStorage()` with custom Busboy stream parser
- `uploadStream()` consumes input in bounded PART_SIZE chunks (18MB default)
- Never buffers entire file in memory; peak RSS ≈ one part + network buffers

### 5. Download Backpressure (P0 #6) - FIXED
**File:** `backend/src/services/telegram-storage.service.js`

- Added `writeWithBackpressure()` helper that waits for `'drain'` event before sending next chunk
- Prevents memory buildup when client is slower than Telegram CDN

### 6. Cache Key Collision Fix (P1) - FIXED
**File:** `backend/src/services/preview/image.service.js`

- Changed cache key from `{size, width, height}` to `{sourceHash, size}`
- Uses SHA-256 of file content to ensure cache hits only for identical images across users
- Added LRU eviction (max 200 entries) to prevent unbounded memory growth

### 7. Legacy Helper Cleanup (P1) - COMPLETED
**Removed:** `backend/src/services/telegram.service.js`

- This file was orphaned (no importers after streaming migration)
- Contained `TELEGRAM_BOT_TOKEN` global reference
- Preview routes migrated to use `telegramStorage` per-user service

### 8. File Metadata Sanitization (P1) - FIXED
**Files:** `backend/src/models/File.js`, `backend/src/models/TelegramConfig.js`

- Added `toJSON()` override to `File` model that strips `telegramChatId`, `telegramMessageId`, `telegramFileId`
- Added `toJSON()` override to `TelegramConfig` to strip `botTokenEncrypted`
- Prevents accidental exposure via spread operator (`...config.toJSON()`)

### 9. Temp File Leak (P1) - FIXED
**File:** `backend/src/services/preview/video.service.js`

- Fixed: thumbnail output file wasn't deleted after extraction
- Output path now included in cleanup `finally` block
- Also added random hex suffix to prevent filename collision

### 10. Stored XSS Prevention (P1) - FIXED
**File:** `backend/src/routes/webdav.routes.js`

- Added MIME type whitelist for WebDAV PUT endpoint
- Rejects risky types like `text/html`, `application/javascript`
- Only safe document/image/video/audio types are accepted

### 11. Rate Limiting (P1) - ADDED
**File:** `backend/src/routes/webdav.routes.js`

- Added dedicated 20 req/15min rate limiter for WebDAV
- Basic auth is vulnerable to offline brute-force — needs stricter limits than general API

### 12. Unit Tests (Foundation) - ADDED
**File:** `backend/tests/streaming.test.js`

- Tests for `uploadStream()`: chunk splitting, single-part naming, empty files, maxBytes enforcement
- Tests for `createReadStream()`: byte order, range requests
- All tests pass via `node --test tests/*.test.js`

## Files Modified

### Core Infrastructure
- `backend/src/app.js` - added secret validation, removed unused multer import/error handler
- `backend/src/config/database.js` - re-throws DB connection errors so boot fails if DB unavailable
- `backend/src/config/secrets.js` - NEW: centralized secret resolver with validation

### Controllers
- `backend/src/controllers/auth.controller.js` - fixed auth bypass, bcrypt round constant
- `backend/src/controllers/file.controller.js` - migrate to streaming upload, delete unused multer error handling
- `backend/src/controllers/public-share.controller.js` - NEW: secure shared link streaming

### Models
- `backend/src/models/File.js` - added `toJSON()` sanitization, fixed `includeDeleted` filter
- `backend/src/models/Folder.js` - fixed Sequelize `$or:` syntax → `[Op.or]`
- `backend/src/models/BotToken.js` - removed hardcoded fallback encryption key
- `backend/src/models/TelegramConfig.js` - removed hardcoded fallback, added `toJSON()` sanitization
- `backend/src/models/SharedLink.js` - removed hardcoded secrets, split view/download counters

### Services
- `backend/src/services/telegram-storage.service.js` - NEW `uploadStream()`, backpressure fix, validation checks
- `backend/src/services/preview/image.service.js` - content-hash cache keys, eviction policy
- `backend/src/services/preview/video.service.js` - output temp file cleanup
- `backend/src/services/telegram.service.js` - REMOVED (orphaned legacy file)

### Routes
- `backend/src/routes/file.routes.js` - Busboy streaming parser, remove multer dependency
- `backend/src/routes/index.js` - removed duplicate `/api/files/s/:token` route
- `backend/src/routes/webdav.routes.js` - added MIME whitelist, rate limiter, remove raw body buffer
- `backend/src/routes/user.routes.js` - unchanged, still safely exposes sanitized config
- `backend/src/routes/preview.routes.js` - migrated from `telegramFileService.downloadFromTelegram` to per-user streaming

### Build & Test
- `backend/package.json` - removed dead dependencies, updated test script
- `backend/package-lock.json` - updated after dependency cleanup
- `backend/tests/streaming.test.js` - NEW: unit tests for streaming implementation

## Verification Status

✅ **All P0 findings addressed**
✅ **Core streaming implemented** (6/6 unit tests passing)
✅ **Syntax validation passed** (all changed files)
✅ **Backend modules load successfully**
✅ **Secret validation passes** (JWT_SECRET, REFRESH_TOKEN_SECRET rotated; ENCRYPTION_KEY verified)
⏳ **Frontend build pending** (ready to run: `npm run build`)

## Next Steps

The following P1 items remain for future review:

1. **Retry-after handling** - Telegram 429 responses need `retry_after` header respect across all download endpoints
2. **CI/CD pipeline** - GitHub Actions workflow never created despite AGENTS.md §4 claim
3. **ESLint/prettier** - No linting configured; would help catch bugs pre-commit
4. **Response error messages** - Some places leak detailed error text in production
5. **Share link quota** - Consumes one unit before password verification
6. **Test framework expansion** - Only streaming has unit tests; add API integration tests

## Commands to Verify

```bash
# Unit tests
cd backend
node --test tests/streaming.test.js

# Module load check (quick smoke)
node -e "require('./src/config/secrets').assertSecrets(); console.log('secrets: OK')"

# Full build
cd ..
npm run build
```

## Deployment Notes

After these changes, restart backend to apply new behavior. The process will fail loudly if environment secrets aren't properly configured, preventing silent deployment with compromised credentials.

No database migrations required — all changes are code-only (new files, deletions, logic updates).

---

Generated during Teldock security hardening session.  
Date: 2026-08-29
