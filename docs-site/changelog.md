---
title: Changelog
description: Notable changes to Teldock, following Keep a Changelog and Semantic Versioning.
---

# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Nothing yet.

## [1.1.0]

### Added

- **Public share page.** Recipients of a share link now land on a real page at `/s/:token` instead
  of being redirected to the landing page. It handles password prompts, shows file metadata, and
  downloads the file without requiring an account.
- **Video previews.** `POST /api/previews/generate` accepts `video/*` in addition to images and
  returns a 640x360 JPEG thumbnail captured at the one-second mark, plus the video duration when it
  can be read. Requires FFmpeg; videos over the 25 MB preview cap are rejected with `413`.
- **Documentation site.** A complete bilingual (English / Bahasa Indonesia) documentation site built
  with VitePress, published to GitHub Pages and deployed automatically on every push to `main`.
- **End-to-end test suite.** A self-contained Playwright suite under `e2e/` covering the public
  share flow, including the wrong-password path.
- **Frontend test suite.** Vitest and Testing Library, covering the share page and the public share
  API client.

### Changed

- `BCRYPT_ROUNDS` is now read from the environment instead of being hardcoded. Values outside the
  safe 4-15 range fall back to `12` with a warning.
- WebDAV rate limiting is split into a generous general limit (5000 requests per 15 minutes,
  configurable via `WEBDAV_RATE_LIMIT_MAX`) and a separate 20-per-15-minute cap on *failed*
  authentication attempts, so mounted clients are no longer throttled.
- The backend test suite grew from 36 to 114 tests, covering validation schemas, the JWT service,
  middleware, and filename helpers.
- Removed the unused `form-data` and `multer` dependencies and the dead multer upload machinery.

### Fixed

- **Share links could not be created twice in the same second.** Share tokens contained no unique
  nonce, so two links for the same file created within one second produced byte-identical JWTs and
  the second request failed with `500`. Tokens now include a random `jti`.
- `CORS` did not allow `PATCH`, which blocked file rename, move, and favorite from the browser.
- `sanitizeFilename` did not neutralize path separators or bare directory tokens, despite being
  documented as preventing security issues.
- `FRONTEND_URL` was missing from `.env.example`, producing relative share links.
- Documentation described features that no code implemented (a Redis-backed preview queue, FFmpeg
  video thumbnails, and the `TELEGRAM_API_URL` / `TELEGRAM_API_SERVER_URL` settings).

## [1.0.0]

The initial public release of Teldock, a self-hosted cloud storage application that uses the Telegram
Bot API as its storage backend.

### Added

- **Chunked uploads.** Files are split into bounded parts (~18 MB, configurable via `TG_PART_SIZE`)
  and streamed to Telegram without buffering the whole file in memory.
- **Streaming downloads.** Parts are reassembled in order with backpressure handling and resumable
  HTTP `Range` requests.
- **Multi-bot pool.** Users can register multiple bot tokens, distributed round-robin for higher
  throughput.
- **Version history.** Overwriting a file automatically snapshots the previous content, and any
  version can be restored, including chunked and encrypted files.
- **Soft delete.** Deleted files are recoverable, with storage-usage accounting kept consistent.
- **Folders.** Hierarchical folders with path-based navigation and rename/delete operations.
- **Search, favorites, tags, and smart folders.** Filename search, a favorite flag, user-defined
  tags, and saved filter "smart folders".
- **File previews.** In-browser image previews generated in multiple sizes.
- **Sharing.** Public links with optional expiration, download limits, and password protection.
- **WebDAV endpoint.** An Rclone-compatible `/webdav` mount supporting `OPTIONS`, `PROPFIND`, `GET`,
  `HEAD`, `PUT`, `DELETE`, `MKCOL`, and `MOVE`.
- **JWT authentication.** Short-lived access tokens with refresh-token rotation.
- **Encryption.** Opt-in per-file encryption and AES-256-CBC encryption of bot credentials at rest.

### Security

- Bot tokens are encrypted at rest and never returned to clients; internal Telegram identifiers are
  stripped from API responses.
- Login uses constant-time bcrypt comparison and does not reveal whether an account exists.
- Signed, file-scoped URLs authorize downloads and previews.
- Global and login rate limiting, strict input validation, and a Helmet Content Security Policy are
  enabled by default.
- Secrets are validated at boot; the API refuses to start with missing or placeholder values.

### Documentation

- Added deployment, security, API, database schema, project structure, contributing, and changelog
  documentation, available in English and Bahasa Indonesia.

## Related pages

- [Contributing](/contributing) — how changes reach a release.
- [Deployment](/guide/deployment) — running a released version in production.
- [Security](/guide/security) — the security model behind the hardening listed above.
