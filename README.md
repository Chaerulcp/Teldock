# Telegram Cloud Storage

A full-stack cloud storage application that uses the **Telegram Bot API** as its file storage backend. Files are streamed to a private Telegram chat/channel, while the application database stores only lightweight metadata (filenames, MIME types, sizes, Telegram references, sharing tokens). This keeps local/VPS disk usage minimal while leveraging Telegram's infrastructure for the actual file bytes.

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL%2FMariaDB-8.0+-4479A1?logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**How it works:**

1. A file is uploaded through the web interface.
2. The backend splits the file into parts (~18 MB each) and streams each part to a Telegram chat/channel via the Bot API (`sendDocument`), spreading parts across the user's bot pool.
3. Telegram returns metadata (`file_id`, `message_id`) for every part.
4. The database stores only that metadata plus ownership, ordering, and (optional) encryption info — never the raw file.
5. On download, the backend resolves each part's Telegram `file_path`, fetches and (if needed) decrypts the parts, and streams them back in order — honoring HTTP `Range` requests for seeking/resuming.

This design avoids storing large files on the server disk and offloads bandwidth to Telegram's CDN.

---

## Features

**Authentication**
- Email/password registration and login
- Optional Telegram ID based accounts
- JWT access tokens (short-lived) with refresh tokens
- Protected routes with bearer-token middleware

**File management**
- Upload files of **any size** — large files are automatically split into ~18 MB parts across multiple Telegram messages (bypasses the 50 MB Bot API limit)
- Streaming download that stitches parts back together, with **HTTP Range/seek** support (resumable downloads, in-browser media seeking)
- List files with pagination, sorting, and folder filtering
- Filename-based search (`/api/files/search`)
- Soft delete (recoverable) with per-user storage quota accounting
- File version history with revert support

**Performance & scale (teldrive-inspired)**
- **Multi-bot token pool** — add several bot tokens and requests are spread round-robin across them for higher upload/download throughput
- Chunked, retryable part uploads with exponential backoff
- **WebDAV endpoint** (`/webdav`) for Rclone / native OS mounting

**Encryption**
- Opt-in **AES-256-CTR** encryption per file, with a random salt per file and a random IV per part

**Folders**
- Hierarchical folder tree (create, rename, delete)
- Path-based lookups; deleting a folder detaches contained files to the root

**Sharing**
- Signed shared links with optional expiration, download limits, and password protection
- Public link endpoint that requires no authentication

**Per-user Telegram configuration**
- Each user can connect their own bot token + storage chat via the Settings page
- Credentials are encrypted at rest (AES-256-CBC)

**Media previews**
- On-demand image preview generation (multiple sizes, WebP) using `sharp`
- Video thumbnail extraction scaffolding using `ffmpeg` (requires ffmpeg installed)

**Real-time & background processing**
- WebSocket channel (`socket.io`) for per-user real-time events
- Optional BullMQ + Redis queue for preview generation

---

## Architecture

```
┌──────────────────┐     ┌───────────────────────┐     ┌──────────────────────┐
│   React SPA      │ ──▶ │   Express REST API     │ ──▶ │   Telegram Bot API    │
│   (Vite + TW)    │ ◀── │   (Node.js)            │ ◀── │   Chat / Channel      │
└──────────────────┘     └───────────┬───────────┘     └──────────────────────┘
        ▲                            │
        │  WebSocket (socket.io)     ├──────────────┐
        └────────────────────────────┤              │
                                      ▼              ▼
                              ┌──────────────┐  ┌──────────────┐
                              │  MySQL /     │  │  Redis        │
                              │  MariaDB     │  │  (optional,   │
                              │  (Sequelize) │  │  preview jobs)│
                              └──────────────┘  └──────────────┘
```

The backend is layered: **routes → controllers → services → models**. The Telegram gateway, metadata/database layer, and file streaming logic are kept in separate service modules.

---

## Tech Stack

### Backend
| Purpose | Technology |
|---------|------------|
| Runtime | Node.js 22.x |
| Web framework | Express 5 |
| Database | MySQL / MariaDB |
| ORM | Sequelize 6 |
| Auth | jsonwebtoken (JWT) + bcryptjs |
| Security | Helmet, CORS, express-rate-limit |
| Uploads | Multer (memory storage) + form-data |
| Real-time | socket.io |
| Queue (optional) | BullMQ + ioredis |
| Media | sharp (images), fluent-ffmpeg (video) |

### Frontend
| Purpose | Technology |
|---------|------------|
| Framework | React 18 |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| State | Zustand |
| HTTP | Axios |
| Routing | React Router 6 |
| Icons | lucide-react |
| Notifications | react-toastify |

---

## Project Structure

```
tele-storage-app/
├── backend/
│   ├── src/
│   │   ├── config/          # Database & Telegram configuration
│   │   ├── controllers/     # auth, file, folder request handlers
│   │   ├── middleware/       # auth, upload, telegram-gateway
│   │   ├── models/          # Sequelize models + associations (index.js)
│   │   ├── routes/          # auth, file, folder, user, preview routes
│   │   ├── services/        # telegram, jwt, versioning, previews, queue, realtime
│   │   └── app.js           # Express app + server bootstrap
│   ├── scripts/             # migrate.js and table migration scripts
│   ├── tests/               # standalone test scripts
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Layout, VersionHistory
│   │   ├── pages/           # Login, Register, Dashboard, MobileDashboard, Settings
│   │   ├── services/        # api.js (Axios client + interceptors)
│   │   ├── store/           # auth-store.js (Zustand)
│   │   └── App.jsx / main.jsx
│   ├── vite.config.js       # dev server + /api proxy to backend
│   └── package.json
│
├── README.md
├── QUICK_START.md
└── LICENSE
```

---

## Getting Started

### Prerequisites

- Node.js 20+ (22.x recommended)
- MySQL or MariaDB (8.0+)
- Optional: Redis (for the preview queue), `ffmpeg` (for video thumbnails)
- A Telegram bot token from [@BotFather](https://t.me/BotFather) and a storage chat/channel ID (only needed for real uploads)

### 1. Clone

```bash
git clone https://github.com/Chaerulcp/tele-storage-app.git
cd tele-storage-app
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env      # then edit .env with your values
npm run migrate           # creates all database tables
npm run dev               # starts API on http://localhost:3001
```

### 3. Frontend setup

In a separate terminal:

```bash
cd frontend
npm install
npm run dev               # starts SPA on http://localhost:3000
```

The Vite dev server proxies `/api` requests to the backend at `http://localhost:3001`, so no extra CORS setup is needed in development.

### 4. Open the app

Navigate to **http://localhost:3000**, register an account, then open **Settings** to connect your Telegram bot before uploading files.

---

## Environment Variables

Configure these in `backend/.env` (see `backend/.env.example`):

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` or `production` |
| `PORT` | Backend port (default `3001`) |
| `DB_HOST` / `DB_PORT` | Database host and port |
| `DB_NAME` | Database name (e.g. `tele_storage_db`) |
| `DB_USER` / `DB_PASSWORD` | Database credentials |
| `JWT_SECRET` | Secret for access tokens |
| `JWT_EXPIRE` | Access token lifetime (e.g. `15m`) |
| `REFRESH_TOKEN_SECRET` | Secret for refresh tokens |
| `REFRESH_TOKEN_EXPIRE` | Refresh token lifetime (e.g. `7d`) |
| `TELEGRAM_BOT_TOKEN` | Global bot token (fallback) |
| `TELEGRAM_STORAGE_CHAT_ID` | Global storage chat/channel ID |
| `TELEGRAM_API_URL` | Base Bot API URL, e.g. `https://api.telegram.org/bot<token>` |
| `ENCRYPTION_KEY` | Key for encrypting per-user Telegram credentials & files |
| `TG_PART_SIZE` | Chunk size in bytes for large-file splitting (default 18 MB) |
| `MAX_UPLOAD_BYTES` | Max accepted upload size (default 2 GB) |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection (optional, preview queue) |
| `CORS_ORIGIN` | Allowed frontend origin (default `http://localhost:3000`) |
| `BCRYPT_ROUNDS` | bcrypt cost factor |

> **Never commit `.env`.** It is git-ignored. Bot tokens and chat IDs must never be exposed to the client or returned in public API responses.

---

## Available Scripts

### Backend (`/backend`)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Start in production mode |
| `npm run migrate` | Create/sync all database tables |
| `npm run test-db` | Verify database setup |
| `npm run test-auth` | Run the authentication test script |

### Frontend (`/frontend`)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |

---

## API Reference

Base URL: `http://localhost:3001/api`

All protected endpoints require an `Authorization: Bearer <accessToken>` header.

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Log in and receive tokens |
| `POST` | `/auth/refresh` | Exchange a refresh token for a new access token |
| `GET` | `/auth/me` | Get the current user profile (protected) |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/files/upload` | Upload a file (multipart, field `file`) |
| `GET` | `/files` | List files (pagination, `folderId`, sorting) |
| `GET` | `/files/search?q=` | Search files by filename |
| `GET` | `/files/:id/download` | Stream download (stitched parts, supports Range) |
| `GET` | `/files/:id/versions` | List version history for a file |
| `POST` | `/files/:id/revert/:versionId` | Revert a file to a version |
| `POST` | `/files/:id/share` | Create a shared link |
| `DELETE` | `/files/:id` | Soft delete a file |
| `GET` | `/files/s/:token` | Access a shared link (public) |

### Folders
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/folders?parentFolderId=` | List folders (root when `null`) |
| `POST` | `/folders` | Create a folder |
| `PUT` | `/folders/:id` | Rename a folder |
| `DELETE` | `/folders/:id` | Delete a folder (files detached to root) |

### Bot pool (multi-bot throughput)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/bots` | List bots in the pool |
| `POST` | `/bots` | Add a bot token (validated) |
| `DELETE` | `/bots/:id` | Remove a bot from the pool |

### WebDAV (Rclone-compatible)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `PROPFIND/GET/PUT/DELETE/MKCOL/MOVE` | `/webdav/*` | Mount as a remote via Rclone (HTTP Basic auth) |

### Telegram configuration (per user)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/user/telegram/status` | Get connection status |
| `POST` | `/user/telegram/connect` | Connect a bot token + storage chat |
| `PUT` | `/user/telegram/config` | Update the configuration |
| `DELETE` | `/user/telegram/unlink` | Disconnect |

### Previews
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/previews/generate` | Generate image previews for a file |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/` | API info/version |

### Example

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'

# Upload (after logging in)
curl -X POST http://localhost:3001/api/files/upload \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/file.pdf"
```

---

## Database Schema

Six tables managed by Sequelize (`npm run migrate`):

| Table | Purpose |
|-------|---------|
| `users` | Accounts, credentials, storage quota tracking |
| `folders` | Hierarchical folder tree (path, depth, parent) |
| `files` | File metadata + Telegram references + chunk/encryption flags + sharing/download tracking |
| `file_parts` | Per-part Telegram references for chunked files (order, IV, checksum) |
| `bot_tokens` | Encrypted per-user bot tokens for the multi-bot pool |
| `shared_links` | Signed link tokens with expiry, limits, password |
| `file_versions` | Version history per file with checksums |
| `user_telegram_configs` | Per-user encrypted Telegram credentials |

Primary keys are UUIDs. Foreign keys enforce cascade/detach behavior for data integrity.

> After pulling updates that add chunked storage, run `npm run migrate:chunked` to add the new columns/tables to an existing database.

---

## Security

- Passwords hashed with bcrypt.
- JWT access tokens are short-lived; refresh tokens rotate access tokens via an Axios interceptor on the client.
- SQL injection mitigated through Sequelize parameterized queries.
- `helmet` sets protective HTTP headers; CORS restricted to the configured origin.
- Rate limiting: general API and stricter auth-login limits.
- Filenames sanitized to prevent path traversal.
- Per-user storage quotas enforced on upload/delete.
- Per-user Telegram credentials encrypted at rest; bot tokens and chat IDs are never sent to the client.

---

## Troubleshooting

| Symptom | Resolution |
|---------|------------|
| Cannot connect to database | Ensure MySQL/MariaDB is running and `.env` credentials are correct; re-run `npm run migrate`. |
| Migration fails on foreign keys | Ensure existing tables use matching UUID/`CHAR(36)` id types; drop stale tables and re-run. |
| Uploads fail | Connect a valid bot token + storage chat in Settings; confirm the bot is an admin of the channel. |
| 401 on protected routes | Send `Authorization: Bearer <token>`; the client auto-refreshes on expiry. |
| Preview/video errors | Install `ffmpeg` and (optionally) run Redis for the preview queue. |
| Frontend can't reach API | Confirm the backend runs on `:3001` and Vite proxy is intact in `vite.config.js`. |

---

## Contributing

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:      new feature
fix:       bug fix
docs:      documentation
refactor:  code change that neither fixes a bug nor adds a feature
chore:     tooling/maintenance
test:      tests
```

Workflow:

1. Create a feature branch.
2. Make focused, granular commits.
3. Open a pull request against `main`.

---

## License

Licensed under the [MIT License](LICENSE).
