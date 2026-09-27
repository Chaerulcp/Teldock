---
title: Security
description: Understand Teldock's security model, authentication flow, rate limits, and self-hosting hardening checklist.
---

# Security

Teldock handles bot credentials, user accounts, and file access. This page explains how those are
protected, the authentication and rate-limiting behavior, and the steps a self-hoster should take to
keep a deployment safe. For the deployment commands referenced here, see [Deployment](/guide/deployment).

## Security model

Teldock is self-hosted and single-tenant per instance. Each user connects their own Telegram bot and
storage channel, so credentials and file content are isolated per account. The server stores only
metadata; raw file bytes are streamed to and from Telegram on demand.

## Protection mechanisms

| Mechanism | What it protects | Implementation |
| --- | --- | --- |
| Encrypted bot tokens at rest | Telegram bot tokens in the database | AES-256-CBC with a per-record random IV; key derived from `ENCRYPTION_KEY` via scrypt |
| Password hashing | User account passwords | bcrypt with 12 salt rounds |
| Short-lived signed URLs | Download and preview access | File-scoped JWTs (`type: "file-access"`), default lifetime `FILE_ACCESS_TOKEN_EXPIRE` = 5m |
| Internal Telegram IDs hidden | Storage location disclosure | `File.toJSON()` strips `telegramChatId`, `telegramMessageId`, `telegramFileId`; `TelegramConfig.toJSON()` strips the encrypted token and chat ID |
| Rate limiting | Brute force and abuse | Global 100 requests / 15 min; login 20 attempts / hour; WebDAV 5000 requests / 15 min with separate failed-auth protection |
| Input validation | Malformed and hostile requests | Zod schemas validated at the route boundary |
| Output and header hardening | XSS, clickjacking, MIME sniffing | Helmet with a strict Content Security Policy |
| SQL injection prevention | Database integrity | Sequelize ORM with parameterized queries |
| Share access control | Shared-link abuse | Optional bcrypt password, expiration, and download limits |
| Secret validation at boot | Misconfiguration | `assertSecrets()` fails startup on missing or placeholder secrets |

## Authentication flow

Teldock uses short-lived JWT access tokens plus a longer-lived refresh token.

1. **Register / login** returns an access token and a refresh token.
2. The access token is sent as `Authorization: Bearer <access-token>` on protected routes.
3. When it expires, the client calls `POST /api/auth/refresh` with the refresh token to obtain a new
   access token.
4. File downloads and previews use a separate, short-lived signed URL.

| Token | Secret | Default lifetime | Environment variable |
| --- | --- | --- | --- |
| Access token | `JWT_SECRET` | 15 minutes | `JWT_EXPIRE` |
| Refresh token | `REFRESH_TOKEN_SECRET` | 7 days | `REFRESH_TOKEN_EXPIRE` |
| File access URL | `JWT_SECRET` | 5 minutes | `FILE_ACCESS_TOKEN_EXPIRE` |

The access token payload includes the user ID and email. The file access token is bound to a single
`fileId` and a stream disposition (`attachment` for download, `inline` for preview), so a leaked URL
cannot be replayed against another file or used for the other disposition.

::: info
Login always performs a bcrypt comparison, even when the email does not exist, so response timing
does not reveal whether an account is registered.
:::

## Rate limits

| Scope | Limit | Window | Response on exceed |
| --- | --- | --- | --- |
| Global API (`/api/`) | 100 requests | 15 minutes | `429` with `{ success: false, error: "Too many requests, please try again later." }` |
| Login (`/api/auth/login`) | 20 attempts | 1 hour | `429` with `{ success: false, error: "Too many login attempts, please try again after 1 hour." }` |
| WebDAV (`/webdav`) | 5000 requests | 15 minutes | `429` with `{ success: false, error: "WebDAV requests are limited" }` |
| WebDAV failed auth | 20 attempts | 15 minutes | `429` with `{ success: false, error: "Too many failed WebDAV authentication attempts" }` |

The limits are enforced in `backend/src/app.js` (global and login) and
`backend/src/routes/webdav.routes.js` (WebDAV). WebDAV is driven by mounted clients that issue
many requests per operation, so its general limit is generous and configurable through
`WEBDAV_RATE_LIMIT_MAX`. Brute-force protection is applied separately to *failed* authentication
attempts only (`skipSuccessfulRequests`), so legitimate mounted clients are never throttled.

## Data privacy

- **No file bytes on disk.** The server never persists uploaded content; it streams to Telegram and
  keeps only metadata in MySQL.
- **Per-user isolation.** Every file, folder, tag, bot token, and Telegram configuration belongs to a
  single user, and queries are scoped by `userId`.
- **No third-party analytics.** The application does not embed trackers or telemetry.
- **Open source.** The full source is auditable; there are no hidden network calls beyond the Telegram
  Bot API.

## Operational hardening checklist

For anyone self-hosting Teldock:

- [ ] **Rotate secrets.** Generate unique values for `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and
      `ENCRYPTION_KEY`; never reuse the example placeholders.
- [ ] **Keep `ENCRYPTION_KEY` stable and secret.** Back it up separately. Changing it makes encrypted
      credentials and encrypted file parts unreadable.
- [ ] **Restrict the database user.** Grant the application user only the privileges it needs on the
      Teldock schema; do not run the API as `root`.
- [ ] **Run behind HTTPS.** Access tokens and signed URLs travel in headers and query strings.
- [ ] **Set `CORS_ORIGIN` tightly.** Point it at the exact public frontend origin.
- [ ] **Patch dependencies.** Run `npm audit` regularly and apply updates.
- [ ] **Limit WebDAV exposure.** WebDAV uses HTTP Basic auth; restrict it at the proxy if you do not
      need it publicly.
- [ ] **Back up the database.** See [Deployment](/guide/deployment).

## Hardening log

The project's security changes are tracked in `SECURITY_CHANGES.md` at the repository root, which
documents fixes for authentication bypass, bot-token exposure, memory-efficient streaming, stored XSS
prevention, and rate limiting. Release-level summaries live in the [Changelog](/changelog).

::: danger
Teldock relies on the Telegram Bot API and your own Telegram account/channel. Telegram's Terms of
Service apply, and Telegram may change limits or remove functionality at any time. Do not treat
Teldock as reliable primary storage: keep independent backups of anything important and expect that
availability depends on a third-party service outside your control.
:::

## Related pages

- [Deployment](/guide/deployment) — production topology and Nginx/HTTPS setup.
- [API Reference](/reference/api) — authentication headers and signed-URL usage.
- [Configuration](/reference/configuration) — secrets and security-related variables.
