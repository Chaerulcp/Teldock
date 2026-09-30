---
title: Configuration
description: Walk through the Teldock backend .env settings and the frontend dev configuration.
---

# Configuration

Teldock reads its backend configuration from `backend/.env`. The file is loaded with `dotenv` when the server starts, and `backend/src/config/secrets.js` validates the required secrets before the app boots.

Start from the template:

```bash
cd backend
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
```

Then edit `.env` for your environment. This page explains each group; for the full variable list see [Environment Variables](/reference/configuration).

## Startup validation

Before the HTTP server starts, the backend calls `assertSecrets()` in `backend/src/config/secrets.js`. It checks that `JWT_SECRET`, `REFRESH_TOKEN_SECRET` and `ENCRYPTION_KEY`:

- are present,
- are at least 32 characters long,
- are not one of the placeholder values shipped in `.env.example`.

If any check fails, the process exits with a list of the problems instead of starting. This prevents a deployment from silently running with secrets that are public in the repository.

## Server

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime mode. `development` enables SQL logging; use `production` in production. |
| `PORT` | HTTP port for the Express API (default `3001`). |
| `CORS_ORIGIN` | The allowed frontend origin; must match the URL the browser loads the app from. |

## Database

Teldock uses Sequelize against MySQL/MariaDB. Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` and `DB_PASSWORD` to match your server, then run `npm run migrate` to create the tables. If `DB_PASSWORD` is empty, leave it blank.

## JWT and authentication

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | Signs short-lived access tokens. **Required.** |
| `JWT_EXPIRE` | Access-token lifetime (default `15m`). |
| `REFRESH_TOKEN_SECRET` | Signs refresh tokens used for rotation. **Required.** |
| `REFRESH_TOKEN_EXPIRE` | Refresh-token lifetime (default `7d`). |
| `FILE_ACCESS_TOKEN_EXPIRE` | Lifetime of signed preview/download URLs (default `5m`). |

## Telegram

`TELEGRAM_BOT_TOKEN` and `TELEGRAM_STORAGE_CHAT_ID` are conveniences for local development and testing only. In normal multi-user operation, each account connects its own bot and channel in Settings — see [Connecting Telegram](/guide/telegram-setup).

`TELEGRAM_API_URL` and `TELEGRAM_API_SERVER_URL` are not read by the code. The backend calls `https://api.telegram.org` directly (hardcoded in `backend/src/services/telegram-storage.service.js`), so setting these variables has no effect.

## Encryption

`ENCRYPTION_KEY` protects per-user Telegram credentials at rest and, optionally, file encryption. **Required**, at least 32 characters.

::: danger Keep ENCRYPTION_KEY stable
Changing `ENCRYPTION_KEY` after data exists makes previously encrypted credentials and files unreadable. Set it once, back it up, and never rotate it casually.
:::

## Redis (not used)

Teldock does not use Redis. `REDIS_HOST` and `REDIS_PORT` are present in `backend/.env.example` but are not read by the code, so they have no effect. There is no preview queue: previews are generated in-process on demand (see `backend/src/routes/preview.routes.js`).

## Security

| Variable | Purpose |
| --- | --- |
| `CORS_ORIGIN` | Allowed browser origin. Must equal the frontend origin exactly. |
| `BCRYPT_ROUNDS` | Password-hashing cost. Read by `backend/src/config/security.js`; values outside 4–15 fall back to `12`. |

Additional storage-related values:

| Variable | Purpose |
| --- | --- |
| `TG_PART_SIZE` | Bytes per chunk when uploading to Telegram (default `18874368`, about 18 MB). |
| `MAX_UPLOAD_BYTES` | Maximum accepted upload size (default `2147483648`, 2 GB). |
| `WEBDAV_RATE_LIMIT_MAX` | Requests allowed per 15 minutes on the `/webdav` router (default `5000`). Failed authentication attempts are capped separately at 20 per 15 minutes. |
| `FRONTEND_URL` | Base URL used to build share short links (for example `<FRONTEND_URL>/s/<token>`). Read in `SharedLink`, `share.controller.js` and `file-management.service.js`; without it, share links are returned as relative paths. |

## Generating strong secrets

Generate each required secret independently with Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Run it once for `JWT_SECRET`, once for `REFRESH_TOKEN_SECRET`, and once for `ENCRYPTION_KEY`. Paste each result into `.env`.

## Values you must change

Before running anything beyond a throwaway local test, replace these:

| Variable | Why |
| --- | --- |
| `JWT_SECRET` | Placeholder values are rejected at boot and are public. |
| `REFRESH_TOKEN_SECRET` | Same as above. |
| `ENCRYPTION_KEY` | Same as above; also must stay stable forever. |
| `DB_PASSWORD` | Use a real database password. |
| `CORS_ORIGIN` | Must match your actual frontend origin, not `localhost`, in production. |

## Frontend configuration

The frontend is a Vite + React SPA. In development, `frontend/vite.config.js` proxies `/api` to the backend:

```js
server: {
  proxy: {
    '/api': { target: 'http://localhost:3001' },
  },
}
```

This means browser calls to `/api/...` are forwarded to the backend without CORS issues during development. Because the proxy handles this, `CORS_ORIGIN` still matters for direct cross-origin calls and for the production deployment — it must match the origin that serves the frontend.

## Next steps

- [Environment Variables](/reference/configuration) — the complete variable reference with defaults and required flags.
- [Connecting Telegram](/guide/telegram-setup) — link a bot and channel.
