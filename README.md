# Teldock

**Teldock** is an open-source, self-hosted cloud storage application that uses **Telegram's Bot API** as its storage backend. Files are split into chunks, optionally encrypted, and streamed directly to each user's own Telegram channel — keeping your server's disk usage minimal while leveraging Telegram's infrastructure for durable storage and CDN delivery.

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL%2FMariaDB-8.0+-4479A1?logo=mysql&logoColor=white)
![CI](https://github.com/Chaerulcp/Teldock/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Release](https://img.shields.io/badge/release-v1.0.0-blue)

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Security & Privacy](#security--privacy)
- [Project Structure](#project-structure)
- [Development](#development)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)
- [Disclaimer](#disclaimer)

---

## Overview

Teldock turns a Telegram bot and a private channel into a personal cloud drive. Your server never persists the raw file bytes — it only keeps metadata in a relational database and proxies file content to and from Telegram on demand.

### How It Works

1. Each user connects their own **Telegram bot** and **storage channel** through the Settings page.
2. On upload, files are split into bounded parts (~18 MB) to stay within the Telegram Bot API limits.
3. Parts are streamed to the user's channel using their bot token(s), distributed across a multi-bot pool for throughput.
4. The database stores only metadata — filenames, part references, sizes, and encryption parameters — never raw file content.
5. On download, parts are reassembled in order, with HTTP `Range` support for seeking and resuming.

### Why This Design

- **Minimal server storage** — only the database and optional cache live on your disk.
- **Bandwidth offload** — file transfer is handled by Telegram's infrastructure.
- **Per-user isolation** — each account stores content in its own channel with its own credentials.
- **Large-file support** — chunking removes the practical per-file size ceiling.

---

## Key Features

### Core Functionality

| Feature                 | Description                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| **Chunked Uploads**     | Files are split into bounded parts (~18 MB) and uploaded across a multi-bot pool.           |
| **Streaming Downloads** | Parts are stitched back together with backpressure handling and resumable `Range` requests. |
| **Multi-Bot Pool**      | Register multiple bot tokens per user for higher throughput via round-robin distribution.   |
| **Version History**     | Automatic version snapshots on overwrite, with the ability to revert to a prior version.    |
| **Soft Delete**         | Deleted files are recoverable and storage-usage accounting is kept consistent.              |

### User Experience

| Feature              | Description                                                                      |
| -------------------- | -------------------------------------------------------------------------------- |
| **Folder Structure** | Hierarchical folders with path-based navigation.                                 |
| **Search & Filter**  | Filename search, favorites, tags, and saved "smart folder" filters.              |
| **File Preview**     | In-browser image previews in multiple sizes (WebP-optimized).                    |
| **Sharing**          | Public links with optional expiration, download limits, and password protection. |
| **WebDAV Mount**     | Mount Teldock as an OS drive through the Rclone-compatible `/webdav` endpoint.   |

### Security & Encryption

| Feature                    | Description                                                                  |
| -------------------------- | ---------------------------------------------------------------------------- |
| **Signed File URLs**       | Short-lived, file-scoped signed URLs authorize preview and download streams. |
| **AES-256-CTR Encryption** | Opt-in per-file encryption using a random salt and per-part IV.              |
| **Encrypted Credentials**  | Bot tokens are encrypted at rest and never returned to the client.           |
| **JWT Authentication**     | Short-lived access tokens with refresh-token rotation.                       |
| **Input Validation**       | Request bodies are validated at the API boundary with schema validators.     |
| **Rate Limiting**          | Global API limits plus stricter limits on the login endpoint.                |

---

## Architecture

```
┌─────────────────────┐     ┌───────────────────────┐     ┌─────────────────────┐
│   React SPA         │ ──▶ │   Express REST API    │ ──▶ │   Telegram Bot API   │
│   (Vite + Tailwind) │ ◀── │   (Node.js + JWT)     │ ◀── │   Private Channel    │
└─────────────────────┘     └───────────┬───────────┘     └─────────────────────┘
             ▲                           │
             │  WebSocket (events)       ├───────────────┐
             └───────────────────────────┤               │
                                         ▼               ▼
                                 ┌──────────────┐  ┌──────────────┐
                                 │  MySQL /     │  │  Redis        │
                                 │  MariaDB     │  │  (optional)   │
                                 │  (Sequelize) │  └──────────────┘
                                 └──────────────┘
```

The backend follows a layered architecture with clear separation of concerns:

```
routes → controllers → services → models
```

- **Routes** define endpoints and attach authentication/validation middleware.
- **Controllers** handle the HTTP request/response cycle.
- **Services** hold business logic (Telegram gateway, chunking, streaming, previews).
- **Models** handle persistence via Sequelize.

---

## Technology Stack

| Layer                | Technology                                          |
| -------------------- | --------------------------------------------------- |
| **Backend runtime**  | Node.js 22.x                                        |
| **Web framework**    | Express 5                                           |
| **Database**         | MySQL / MariaDB 8.0+ via Sequelize ORM              |
| **Authentication**   | JSON Web Tokens (access + refresh)                  |
| **Validation**       | Zod schema validation                               |
| **Real-time sync**   | Socket.IO WebSocket channel                         |
| **Media processing** | Sharp (images), FFmpeg (video thumbnails)           |
| **Cache / queue**    | Redis (optional)                                    |
| **Frontend**         | React 18, Vite, Tailwind CSS, Zustand, React Router |

---

## Quick Start

### Prerequisites

- **Node.js** 22.x or newer
- **MySQL** or **MariaDB** 8.0+
- Optional: **Redis** and **FFmpeg** (for video thumbnails)
- Each end user needs their own **Telegram bot** (via [@BotFather](https://t.me/BotFather)) and a private channel

### Installation

```bash
# Clone the repository
git clone https://github.com/Chaerulcp/Teldock.git
cd Teldock

# Set up the backend
cd backend
npm install
cp .env.example .env      # then edit .env (see Configuration)
npm run migrate           # create database tables
npm start                 # start the API on port 3001

# Set up the frontend (in a separate terminal)
cd ../frontend
npm install
npm run dev               # start the SPA on port 3000
```

Open **http://localhost:3000**, register an account, then connect your Telegram credentials.

### First-Time Setup

1. Register an account in the web UI.
2. Go to **Settings → Telegram Integration**.
3. Create a bot with [@BotFather](https://t.me/BotFather) and copy its token.
4. Create a private channel and add your bot as an admin with **Post Messages** and **Delete Messages** permissions.
5. Enter the bot token and chat ID in Settings.
6. Start uploading files.

For a detailed walkthrough, see **[QUICK_START.md](QUICK_START.md)**.

---

## Configuration

Backend configuration is provided via `backend/.env`. Copy `.env.example` and set the values below.

```ini
# Server
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=teldock_db
DB_USER=root
DB_PASSWORD=your_password

# Authentication secrets (required — the server refuses to boot with placeholders)
JWT_SECRET=<generate-random-secret>
JWT_EXPIRE=15m
REFRESH_TOKEN_SECRET=<generate-random-secret>
REFRESH_TOKEN_EXPIRE=7d
FILE_ACCESS_TOKEN_EXPIRE=5m            # lifetime of signed preview/download URLs
ENCRYPTION_KEY=<generate-random-secret> # required for bot-token encryption at rest

# Storage / uploads
TG_PART_SIZE=18874368                  # ~18 MB per part
MAX_UPLOAD_BYTES=2147483648            # 2 GB max upload

# Optional services
REDIS_HOST=localhost
REDIS_PORT=6379
```

> **Note:** The server validates secrets at startup and fails fast if any required secret is missing or left at a placeholder value. Generate strong random values for `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and `ENCRYPTION_KEY`.

> **Production credentials:** `TELEGRAM_BOT_TOKEN` / `TELEGRAM_STORAGE_CHAT_ID` are intended for local development and testing only. In production, each user connects their own credentials through Settings.

---

## API Reference

**Base URL:** `http://localhost:3001/api`

### Conventions

- All responses use a consistent envelope: `{ "success": true, "data": ... }` on success or `{ "success": false, "error": "..." }` on failure.
- Protected endpoints require an `Authorization: Bearer <access-token>` header.
- Rate limits: **100 requests / 15 minutes** globally, and **20 attempts / hour** on `POST /auth/login`.

### Authentication — `/api/auth`

| Method | Endpoint         | Auth   | Description                                   |
| ------ | ---------------- | ------ | --------------------------------------------- |
| `POST` | `/auth/register` | Public | Register a new user                           |
| `POST` | `/auth/login`    | Public | Obtain access and refresh tokens              |
| `POST` | `/auth/refresh`  | Public | Rotate the access token using a refresh token |
| `GET`  | `/auth/me`       | Bearer | Get the current user's profile                |

### Files — `/api/files`

| Method   | Endpoint                       | Auth                | Description                                   |
| -------- | ------------------------------ | ------------------- | --------------------------------------------- |
| `POST`   | `/files/upload`                | Bearer              | Upload a file (streamed multipart)            |
| `GET`    | `/files`                       | Bearer              | List files (paginated, filterable by folder)  |
| `GET`    | `/files/search?q=`             | Bearer              | Search files by name                          |
| `POST`   | `/files/bulk`                  | Bearer              | Bulk delete or move selected files            |
| `POST`   | `/files/:id/download-url`      | Bearer              | Create a short-lived signed download URL      |
| `GET`    | `/files/:id/download`          | Signed URL / Bearer | Stream a download (supports `Range`)          |
| `POST`   | `/files/:id/preview-url`       | Bearer              | Create a short-lived signed preview URL       |
| `GET`    | `/files/:id/preview`           | Signed URL / Bearer | Stream an inline preview (supports `Range`)   |
| `GET`    | `/files/:id/versions`          | Bearer              | List version history                          |
| `POST`   | `/files/:id/revert/:versionId` | Bearer              | Revert a file to a previous version           |
| `POST`   | `/files/:id/share`             | Bearer              | Create a public share link for a file         |
| `PATCH`  | `/files/:id`                   | Bearer              | Update file metadata (rename, move, favorite) |
| `PUT`    | `/files/:id/tags`              | Bearer              | Set the tags on a file                        |
| `DELETE` | `/files/:id`                   | Bearer              | Soft-delete a file                            |
| `GET`    | `/files/s/:token`              | Public              | Access a public shared link                   |

> Signed preview/download URLs are bound to a single file and disposition and expire after `FILE_ACCESS_TOKEN_EXPIRE` (default 5 minutes). Existing clients may continue using a Bearer access token while migrating to signed URLs. Password-protected shares are accessed by supplying the `X-Share-Password` header.

### Folders — `/api/folders`

| Method   | Endpoint           | Auth   | Description                 |
| -------- | ------------------ | ------ | --------------------------- |
| `GET`    | `/folders?parent=` | Bearer | List folders under a parent |
| `POST`   | `/folders`         | Bearer | Create a folder             |
| `PUT`    | `/folders/:id`     | Bearer | Rename a folder             |
| `DELETE` | `/folders/:id`     | Bearer | Delete a folder             |

### Telegram Integration — `/api/user`

| Method   | Endpoint                 | Auth   | Description                             |
| -------- | ------------------------ | ------ | --------------------------------------- |
| `POST`   | `/user/telegram/connect` | Bearer | Connect a bot token and storage channel |
| `PUT`    | `/user/telegram/config`  | Bearer | Update the Telegram configuration       |
| `GET`    | `/user/telegram/status`  | Bearer | Get the connection status               |
| `DELETE` | `/user/telegram/unlink`  | Bearer | Disconnect Telegram                     |

### Multi-Bot Pool — `/api/bots`

| Method   | Endpoint    | Auth   | Description                           |
| -------- | ----------- | ------ | ------------------------------------- |
| `GET`    | `/bots`     | Bearer | List the user's bot pool              |
| `POST`   | `/bots`     | Bearer | Add a validated bot token to the pool |
| `DELETE` | `/bots/:id` | Bearer | Remove a bot from the pool            |

### Sharing — `/api/shares`

| Method   | Endpoint      | Auth   | Description                   |
| -------- | ------------- | ------ | ----------------------------- |
| `GET`    | `/shares`     | Bearer | List the user's active shares |
| `DELETE` | `/shares/:id` | Bearer | Revoke a share                |

> Share links are **created** with `POST /files/:id/share`; `/api/shares` manages existing shares.

### Tags — `/api/tags`

| Method   | Endpoint    | Auth   | Description  |
| -------- | ----------- | ------ | ------------ |
| `GET`    | `/tags`     | Bearer | List tags    |
| `POST`   | `/tags`     | Bearer | Create a tag |
| `PUT`    | `/tags/:id` | Bearer | Update a tag |
| `DELETE` | `/tags/:id` | Bearer | Delete a tag |

### Smart Folders — `/api/smart-folders`

| Method   | Endpoint             | Auth   | Description           |
| -------- | -------------------- | ------ | --------------------- |
| `GET`    | `/smart-folders`     | Bearer | List saved filters    |
| `POST`   | `/smart-folders`     | Bearer | Create a saved filter |
| `DELETE` | `/smart-folders/:id` | Bearer | Delete a saved filter |

### Previews & Stats

| Method | Endpoint             | Auth   | Description                                       |
| ------ | -------------------- | ------ | ------------------------------------------------- |
| `POST` | `/previews/generate` | Bearer | Generate resized image previews for an owned file |
| `GET`  | `/stats/storage`     | Bearer | Storage usage statistics                          |
| `GET`  | `/stats/duplicates`  | Bearer | Duplicate-file statistics                         |

### WebDAV (Rclone-compatible) — `/webdav`

```
PROPFIND, GET, PUT, DELETE, MKCOL, MOVE  /webdav/*
Authentication: HTTP Basic (email:password)
```

### Health

| Method | Endpoint      | Description          |
| ------ | ------------- | -------------------- |
| `GET`  | `/api/health` | Service health check |

---

## Security & Privacy

### Protection Mechanisms

| Concern       | Mechanism                                                    |
| ------------- | ------------------------------------------------------------ |
| Bot tokens    | Encrypted at rest; never returned to the client              |
| Passwords     | Bcrypt-hashed with a configurable cost factor                |
| File streams  | Authorized via short-lived, file-scoped signed URLs          |
| File metadata | Internal Telegram IDs are excluded from API responses        |
| Abuse         | Rate limiting on the global API and stricter limits on login |
| XSS           | Input sanitization and a strict Content-Security-Policy      |
| SQL injection | Parameterized queries via Sequelize                          |

### Data Privacy

- **Files never persist on your server disk** — content is streamed to and from Telegram.
- **Per-user isolation** — a user's files land only in their own channel via their own credentials.
- **No third-party analytics** — Teldock is pure self-hosted software.
- **Open source** — the entire implementation is auditable in this repository.

Recent hardening work is tracked in **[SECURITY_CHANGES.md](SECURITY_CHANGES.md)**.

---

## Project Structure

```
Teldock/
├── backend/
│   ├── src/
│   │   ├── routes/         # Endpoint definitions + middleware
│   │   ├── controllers/    # HTTP request/response handling
│   │   ├── services/       # Business logic (Telegram, streaming, previews)
│   │   ├── models/         # Sequelize models
│   │   ├── middleware/     # Auth, validation, file access
│   │   └── validation/     # Zod schemas
│   ├── scripts/            # Database migrations & utilities
│   └── tests/              # Node test suite
├── frontend/
│   └── src/
│       ├── pages/          # Route-level views
│       ├── components/     # Reusable UI components
│       └── services/       # API client
└── .github/workflows/      # CI pipeline
```

---

## Development

### Backend

```bash
cd backend
npm run dev        # start with hot reload (nodemon)
npm test           # run the test suite
npm run lint       # run ESLint
npm run format     # apply Prettier formatting
```

### Frontend

```bash
cd frontend
npm run dev        # start the Vite dev server
npm run build      # produce a production build
npm run preview    # preview the production build
```

### Continuous Integration

Every push to `main` and every pull request runs the GitHub Actions pipeline in
[`.github/workflows/ci.yml`](.github/workflows/ci.yml): backend lint and tests, plus a frontend production build.

---

## Documentation

| Document                                   | Purpose                               |
| ------------------------------------------ | ------------------------------------- |
| [README.md](README.md)                     | Project overview (this document)      |
| [QUICK_START.md](QUICK_START.md)           | Step-by-step setup guide              |
| [USER_GUIDE.md](USER_GUIDE.md)             | End-user usage guide                  |
| [DEPLOYMENT.md](DEPLOYMENT.md)             | Production deployment guide           |
| [CONTRIBUTING.md](CONTRIBUTING.md)         | Contribution guidelines and standards |
| [SECURITY_CHANGES.md](SECURITY_CHANGES.md) | Security improvement log              |

---

## Contributing

Contributions are welcome.

- Read **[CONTRIBUTING.md](CONTRIBUTING.md)** for coding standards and the PR process.
- Browse **[GitHub Issues](https://github.com/Chaerulcp/Teldock/issues)** to report bugs or request features.
- Look for issues labeled `good first issue` or `help wanted` for entry points.

### Code Style

- [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, etc.)
- Modern JavaScript with `async`/`await`
- Layered architecture: `routes → controllers → services → models`
- Tests for critical paths; keep the CI pipeline green

---

## License

Licensed under the [MIT License](LICENSE).

---

## Disclaimer

> **Important: read before using.**

Teldock is a **non-commercial, open-source educational project**. Using Telegram's Bot API as general-purpose cloud storage is **not an intended use** of Telegram's platform and may violate Telegram's [Terms of Service](https://telegram.org/tos).

### Your Responsibilities

- Use it only with data you own or have the rights to store.
- Do not use it for mass or commercial storage.
- Be aware that Telegram may rate-limit, suspend, or delete abusive accounts and files.
- Keep independent backups of important data — **do not treat Teldock as reliable primary storage.**

The authors are **not liable** for any damages arising from use of this software.

---

## Acknowledgments

Inspired by [teldrive](https://github.com/teldrive/teldrive), a pioneering implementation of Telegram-based file hosting.

Built with the Telegram Bot API, Express, React, and Sequelize.
