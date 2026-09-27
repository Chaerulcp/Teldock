---
title: Environment Variables
description: Complete reference of every Teldock backend environment variable, with defaults and required flags.
---

# Environment Variables

The backend reads its configuration from `backend/.env` (loaded with `dotenv`). This page lists every variable, its default, whether it is required, and what it does.

The list is derived from `backend/.env.example` and from every `process.env.*` read in `backend/src`. Where the code and the example differ, the difference is called out in the description.

## Complete reference

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | `development` | No | Runtime mode. `development` enables SQL query logging in Sequelize; use `production` on a server. |
| `PORT` | `3001` | No | HTTP port the Express API listens on. |
| `DB_HOST` | `localhost` | Yes | MySQL/MariaDB hostname. |
| `DB_PORT` | `3306` | No | MySQL/MariaDB port. |
| `DB_NAME` | `tele_storage_db` | Yes | Database name (the value comes from `.env.example`; the code reads it directly). |
| `DB_USER` | `root` | Yes | Database user. |
| `DB_PASSWORD` | *(empty)* | Conditional | Database password. May be empty for a passwordless local database; required when your DB user has a password. |
| `JWT_SECRET` | *(none)* | Yes | Signs access tokens. Must be at least 32 characters and not a placeholder. Validated at boot. |
| `JWT_EXPIRE` | `15m` | No | Access-token lifetime. |
| `REFRESH_TOKEN_SECRET` | *(none)* | Yes | Signs refresh tokens. At least 32 characters, not a placeholder. Validated at boot. |
| `REFRESH_TOKEN_EXPIRE` | `7d` | No | Refresh-token lifetime. |
| `FILE_ACCESS_TOKEN_EXPIRE` | `5m` | No | Lifetime of signed preview/download URLs. Used in `jwt.service.js`. |
| `ENCRYPTION_KEY` | *(none)* | Yes | Encrypts per-user Telegram credentials at rest and optional file encryption. At least 32 characters, not a placeholder. Validated at boot. Keep it stable. |
| `TELEGRAM_BOT_TOKEN` | *(none)* | Dev only | Fallback bot token used only when `NODE_ENV` is not `production`, for local development and testing. Not a production multi-user fallback. |
| `TELEGRAM_STORAGE_CHAT_ID` | *(none)* | Dev only | Fallback storage channel ID used only when `NODE_ENV` is not `production`. |
| `TELEGRAM_API_URL` | `https://api.telegram.org/bot<token>` | No | Base URL for the Telegram Bot API. Present in `.env.example`; the current code calls `https://api.telegram.org` directly, so this is reserved for a public or local Bot API server. |
| `TELEGRAM_API_SERVER_URL` | `http://localhost:8081` | No | URL of a local Telegram Bot API server. Reserved; not read by the current code. |
| `REDIS_HOST` | `localhost` | No | Host for the optional preview-generation queue. Not required to run Teldock. |
| `REDIS_PORT` | `6379` | No | Port for the optional Redis instance. |
| `CORS_ORIGIN` | `http://localhost:3000` | No | Allowed browser origin. Must match the frontend origin exactly; set it explicitly in production. |
| `BCRYPT_ROUNDS` | `12` | No | Password-hashing cost factor. Documented in `.env.example`; the current code hardcodes `12` in `auth.controller.js`, so changing this variable has no effect yet. |
| `TG_PART_SIZE` | `18874368` (~18 MB) | No | Bytes per chunk when uploading to Telegram. Used in `telegram-storage.service.js`. |
| `MAX_UPLOAD_BYTES` | `2147483648` (2 GB) | No | Maximum accepted upload size. Used by the HTTP and WebDAV upload paths. |
| `WEBDAV_RATE_LIMIT_MAX` | `5000` | No | Requests allowed per 15 minutes on the `/webdav` router. Failed authentication attempts are limited separately to 20 per 15 minutes. |
| `FRONTEND_URL` | *(empty)* | No | Base URL used to build share short links (for example `<FRONTEND_URL>/s/<token>`). Read in `SharedLink`, `share.controller.js` and `file-management.service.js`, but **not present in `.env.example`** — add it if you want absolute share URLs. |

## Example `.env`

```ini
# Server
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tele_storage_db
DB_USER=root
DB_PASSWORD=

# Authentication secrets (required — the server refuses to boot with placeholders)
JWT_SECRET=<generate-random-secret>
JWT_EXPIRE=15m
REFRESH_TOKEN_SECRET=<generate-random-secret>
REFRESH_TOKEN_EXPIRE=7d
FILE_ACCESS_TOKEN_EXPIRE=5m

# Encryption (required, keep stable)
ENCRYPTION_KEY=<generate-random-secret>

# Telegram (local dev/testing only — production users connect their own bot in Settings)
TELEGRAM_BOT_TOKEN=
TELEGRAM_STORAGE_CHAT_ID=
TELEGRAM_API_URL=https://api.telegram.org/botYOUR_BOT_TOKEN
TELEGRAM_API_SERVER_URL=http://localhost:8081

# Storage / uploads
TG_PART_SIZE=18874368
MAX_UPLOAD_BYTES=2147483648
WEBDAV_RATE_LIMIT_MAX=5000

# Optional services
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
BCRYPT_ROUNDS=12
```

Generate the three secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Required in production

::: warning Strictly required
`JWT_SECRET`, `REFRESH_TOKEN_SECRET` and `ENCRYPTION_KEY` are mandatory. The backend validates them at startup and exits if they are missing, shorter than 32 characters, or still set to an example placeholder. See `backend/src/config/secrets.js`.
:::

The database connection variables (`DB_HOST`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` when applicable) must point at a reachable database. `CORS_ORIGIN` should be set to your real frontend origin in production rather than left at the `localhost` default.

Optional in all environments:

- `REDIS_HOST` / `REDIS_PORT` — only needed for the preview-generation queue.
- `BCRYPT_ROUNDS`, `TELEGRAM_API_URL`, `TELEGRAM_API_SERVER_URL` — documented but not read by the current code.
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_STORAGE_CHAT_ID` — development/testing fallbacks only.

## See also

- [Configuration](/guide/configuration) — a guided walkthrough of each setting group.
- [Connecting Telegram](/guide/telegram-setup) — how per-user credentials are stored.
