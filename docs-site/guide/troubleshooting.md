---
title: Troubleshooting & FAQ
description: Fix common Teldock problems — connectivity, login, uploads, Telegram rate limits, database and migration errors, previews, WebDAV, CORS, and startup failures.
---

# Troubleshooting & FAQ

Start with the [Diagnostics](#diagnostics) section, which tells you where the server reports
its state. Then match your symptom in the table below.

## Problem and solution table

| Symptom | Likely cause | What to do |
| ------- | ------------ | ---------- |
| Cannot reach the frontend | Frontend dev server not running, or wrong URL/port | Start it with `npm run dev` in `frontend/` (default `http://localhost:3000`). Check that the port is not already in use. |
| Frontend loads but API calls fail | Backend down or `CORS_ORIGIN` mismatch | Confirm the backend is listening (default `http://localhost:3001`) and that `CORS_ORIGIN` exactly matches the frontend origin. See [CORS errors](#cors-errors). |
| Login always fails | Wrong credentials, or the login rate limit is exhausted | Verify the email and password. `POST /api/auth/login` is limited to 20 attempts per hour — wait for the window to pass. |
| Login returns "Too many login attempts" | Auth rate limit hit | Wait up to an hour, then retry. The limit is 20 attempts per hour per IP. |
| `401` on every API call | Expired access token and failed refresh | Sign out and sign in again. If it persists, confirm `JWT_SECRET` and `REFRESH_TOKEN_SECRET` have not changed since the tokens were issued. |
| Upload fails immediately | No Telegram bot/channel connected | Connect a bot and channel in **Settings → Telegram Integration**. |
| Upload fails with a Telegram error | Bot is not an admin of the channel, or the chat ID is wrong | Add the bot to the channel as an admin with Post and Delete Messages rights, and re-check the chat ID (a number starting with `-100`). |
| Upload fails with `413 File too large` | File exceeds `MAX_UPLOAD_BYTES` | Raise `MAX_UPLOAD_BYTES` or upload a smaller file. Default is 2 GB. |
| Uploads stall or are very slow | Telegram rate limiting, or too few bots | Add more bots to the pool and reduce simultaneous transfers. See [Telegram 429](#telegram-429-too-many-requests). |
| Telegram returns 429 Too Many Requests | Per-bot rate limit | Teldock retries automatically; see the section below. If it persists, add more bots and slow down bulk operations. |
| Database connection errors | Wrong `DB_*` values or the database is not running | Check `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`; ensure MySQL/MariaDB is up; run `npm run test-db`. The server aborts startup if it cannot connect. |
| Migration errors or missing columns | Schema out of date | Run `npm run migrate` from `backend/`. Use the targeted `npm run migrate:*` scripts for feature-specific schema changes. |
| Image previews do not appear | Sharp failed to install, or the file is encrypted/too large | Reinstall backend dependencies to rebuild Sharp. Previews are generated in-process and the source must be under 25 MB; encrypted files cannot be previewed. |
| Video thumbnails do not generate | Not implemented | Teldock generates image previews only. The video preview service exists but is not wired to any route, so video thumbnails are not produced. |
| WebDAV returns `401` | Wrong email/password, or credentials not sent | Use the full account email as the username and your Teldock password. Ensure your client sends Basic auth. |
| WebDAV returns `429` | Too many failed auth attempts, or a very large sync | The `/webdav` router allows 5000 requests per 15 minutes, but failed authentication attempts are capped at 20 per 15 minutes. Verify the username (full account email) and password, then retry; raise `WEBDAV_RATE_LIMIT_MAX` if a bulk sync still exceeds the general limit. |
| WebDAV upload returns `415` | Content type not in the allowlist | Only a fixed set of MIME types is accepted over WebDAV. Upload other types through the web UI. |
| CORS errors in the browser console | `CORS_ORIGIN` does not match the frontend | Set `CORS_ORIGIN` to the exact frontend origin (scheme, host, and port, no trailing slash) and restart the backend. |
| Server refuses to start | Missing or placeholder secrets | Set real values for `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and `ENCRYPTION_KEY`. See [Server refuses to start](#server-refuses-to-start). |
| Preview or download link "expired" | Signed URL lifetime elapsed | Signed URLs last `FILE_ACCESS_TOKEN_EXPIRE` (default 5 minutes). Re-request the URL from the UI. |
| Share link returns `403` | Link expired, limit reached, or password required | Check the link status on the Shares page. Supply the `X-Share-Password` header if the link is protected. |

## Diagnostics

### Health check

The backend exposes an unauthenticated health endpoint:

```bash
curl http://localhost:3001/api/health
```

A healthy response looks like:

```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

If this fails, the backend process is not running or is not reachable on that host and port.

### Backend logs

Run the backend in the foreground to watch startup and request logs:

```bash
cd backend
npm run dev
```

Startup prints the MySQL connection result, the listening port, and any secret or connection
errors. Per-request errors (Telegram failures, stream errors, WebDAV errors) are logged with
the route name. Set `NODE_ENV=development` to also log SQL queries.

### Database connectivity

From the `backend/` directory, run:

```bash
npm run test-db
```

This script exercises the API and database together: it registers (or logs in) a test user,
fetches the profile, and reports the result. Run it against a backend that is already
listening on port `3001`. If it fails before reaching the API, the problem is the API or
network; if it fails on register/login, inspect the database configuration and migrations.

For a direct schema check, run the migrations:

```bash
npm run migrate
```

### Telegram 429 Too Many Requests

The Telegram Bot API rate-limits per bot. Teldock handles a `429` (or a `5xx`) by retrying
the part up to **3 times**:

- If Telegram returns `parameters.retry_after`, Teldock waits exactly that many seconds.
- Otherwise it uses exponential backoff starting at 1.5 seconds and doubling each attempt.
- Each retry selects the **next bot in the pool**, so a rate-limited bot is skipped on the
  next attempt.

To reduce 429s, add more bots to the [multi-bot pool](/guide/multibot), avoid many concurrent
transfers, and retry bulk operations later. A non-retryable error such as `400` stops the
retry loop immediately.

### Server refuses to start

Teldock validates required secrets at boot and exits rather than running with insecure
defaults. You will see an error listing each problem. The requirements are:

- `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and `ENCRYPTION_KEY` must all be set.
- Each must be at least **32 characters** long.
- Each must not be one of the example placeholder values shipped in `.env.example`.

Generate a strong value with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then set it in `backend/.env` and restart. See [Configuration](/reference/configuration) for
the full environment variable list.

### CORS errors

The backend allows a single origin, configured with `CORS_ORIGIN`, and sends credentials. If
the browser blocks requests:

1. Set `CORS_ORIGIN` to the exact origin shown in the browser address bar, including scheme
   and port (for example `http://localhost:3000`).
2. Do not add a trailing slash.
3. Restart the backend after changing it.

## FAQ

**Where are my files actually stored?**
In your own private Telegram channel, as documents sent by your bot. The server keeps only
metadata and streams content to and from Telegram on demand.

**How much storage do I get?**
There is no fixed Teldock quota. Practical capacity depends on your Telegram account and
channel. Teldock tracks bytes used for reporting but does not enforce a hard limit.

**Are files encrypted?**
Encryption is opt-in per file (AES-256-CTR with a random salt). Files uploaded without the
Encrypt option are stored unencrypted in your channel.

**Can I preview an encrypted file?**
No. Encrypted files must be downloaded and decrypted by the client, so the in-browser viewer
is disabled for them.

**What happens if a bot is removed or banned?**
Any bot in the pool can read and delete parts, so removing one from the pool is safe as long
as others remain admins. If Telegram bans all of your bots, you lose access to those files —
keep independent backups.

**Why is my upload split into several messages?**
Files are chunked into roughly 18 MB parts to stay within Telegram's document size limits.
This is normal and is shown as an `N×` badge in the UI.

**How many versions are kept?**
Up to 10 per file. Older versions are pruned automatically when a new one is created.

**Can I recover a deleted file?**
Deletion marks the file as soft-deleted, but by default the Telegram messages are removed at
the same time. Pass `?deleteFromTelegram=false` when deleting if you want the option to
recover. There is no recycle-bin screen in the current build.

**Does Teldock collect analytics?**
No. It is self-hosted software with no telemetry.

## Getting help

If the problem is not covered here, search or open an issue:

- GitHub Issues: [https://github.com/Chaerulcp/Teldock/issues](https://github.com/Chaerulcp/Teldock/issues)

When reporting a problem, include the exact error message, the backend log output, and your
`NODE_ENV`, database engine, and Node.js version. Do not paste secrets or bot tokens.

## Next steps

- [Configuration](/reference/configuration) — environment variables.
- [Multi-Bot Pool](/guide/multibot) — reduce rate-limit errors.
- [WebDAV & Rclone](/guide/webdav) — WebDAV specifics.
