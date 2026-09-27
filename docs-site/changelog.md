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

### Changed

- Nothing yet.

### Fixed

- Nothing yet.

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
