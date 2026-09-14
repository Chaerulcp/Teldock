# Teldock

**Teldock** is an open-source self-hosted cloud storage application built on top of **Telegram's Bot API**. Files are chunked, optionally encrypted, and streamed directly to each user's own Telegram channel—keeping your server disk usage minimal while leveraging Telegram's infrastructure for file storage and CDN delivery.

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL%2FMariaDB-8.0+-4479A1?logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 📚 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Security & Privacy](#security--privacy)
- [Contributing](#contributing)
- [License](#license)
- [Disclaimer](#disclaimer)

---

## Overview

### How It Works

1. Each user connects their own **Telegram bot** and **storage channel** via Settings
2. Files are automatically split into ~18 MB chunks (bypassing Telegram's 50 MB Bot API limit)
3. Chunks are streamed to the user's channel using their bot token(s)
4. Database stores only metadata (filenames, references, encryption keys)—never raw files
5. Downloads reassemble chunks in order with HTTP Range support for seeking/resuming

This design achieves:

- ✅ Minimal server disk usage (only database + cache)
- ✅ Bandwidth offloaded to Telegram CDN
- ✅ Multi-user isolation (each account stores in their own channel)
- ✅ Support for arbitrarily large files

---

## Key Features

### Core Functionality

| Feature                 | Description                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------- |
| **Chunked Uploads**     | Files split into bounded parts (~18 MB), uploaded concurrently across multi-bot pools |
| **Streaming Downloads** | Parts stitched together with backpressure handling; supports resumable downloads      |
| **Multi-Bot Pool**      | Add multiple bot tokens per user for higher throughput via round-robin distribution   |
| **Version History**     | Automatic version snapshots on overwrite with revert capability                       |
| **Soft Delete**         | Files marked deleted but recoverable; tracks storage usage deltas                     |

### User Experience

| Feature              | Description                                                        |
| -------------------- | ------------------------------------------------------------------ |
| **Folder Structure** | Hierarchical folders with path-based navigation                    |
| **Search & Filter**  | Filename search, favorites, tags, smart saved filters              |
| **File Preview**     | Image previews (multiple sizes, WebP optimized) inline in browser  |
| **Sharing**          | Public links with expiration, download limits, password protection |
| **WebDAV Mount**     | Mount as OS drive via Rclone (`/webdav` endpoint)                  |

### Security & Encryption

| Feature                    | Description                                               |
| -------------------------- | --------------------------------------------------------- |
| **AES-256-CTR Encryption** | Opt-in per-file encryption with random salt + per-part IV |
| **Encrypted Credentials**  | Bot tokens stored encrypted at rest (AES-256-CBC)         |
| **JWT Authentication**     | Short-lived access tokens + refresh token rotation        |
| **Rate Limiting**          | General API limits + stricter auth login limits           |
| **No Metadata Leakage**    | Internal Telegram IDs never exposed in API responses      |

### Infrastructure

| Component            | Technology                                |
| -------------------- | ----------------------------------------- |
| **Backend Runtime**  | Node.js 22.x                              |
| **Web Framework**    | Express 5                                 |
| **Database**         | MySQL/MariaDB via Sequelize ORM           |
| **Real-time Sync**   | Socket.IO WebSocket channel               |
| **Preview Queue**    | BullMQ + Redis (optional)                 |
| **Media Processing** | Sharp (images), FFmpeg (video thumbnails) |

---

## Architecture

```
┌─────────────────────┐     ┌───────────────────────┐     ┌─────────────────────┐
│   React SPA         │ ──▶ │   Express REST API    │ ──▶ │   Telegram Bot API   │
│   (Vite + Tailwind) │ ◀── │   (Node.js + JWT)     │ ◀── │   Chat / Channel     │
└─────────────────────┘     └───────────┬───────────┘     └─────────────────────┘
                ▲                        │
                │  WebSocket (events)    ├──────────────┐
                └────────────────────────┤              │
                                         ▼              ▼
                                 ┌──────────────┐  ┌──────────────┐
                                 │  MySQL /     │  │  Redis        │
                                 │  MariaDB     │  │  (preview job)│
                                 │  (Sequelize) │  └──────────────┘
                                 └──────────────┘
```

**Layered Backend:** `routes → controllers → services → models`

---

## Quick Start

### Prerequisites

- **Node.js** 22.x+
- **MySQL** or **MariaDB** 8.0+
- Optional: **Redis**, **FFmpeg** (for video thumbnails)
- Each end user needs their own **Telegram bot** (@BotFather) + private channel

### Installation

```bash
# Clone repository
git clone https://github.com/Chaerulcp/Teldock.git
cd Teldock

# Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env with your values (see below)
npm run migrate           # Create database tables
npm start                 # Start API on port 3001

# Setup frontend (in separate terminal)
cd ../frontend
npm install
npm run dev               # Start SPA on port 3000
```

Navigate to **http://localhost:3000**, register, then connect your Telegram credentials.

### Environment Variables (backend/.env)

```ini
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_NAME=teldock_db
DB_USER=root
DB_PASSWORD=your_password

JWT_SECRET=<generate-random-secret>          # Required
JWT_EXPIRE=15m
FILE_ACCESS_TOKEN_EXPIRE=5m                 # Signed preview/download URLs
REFRESH_TOKEN_SECRET=<generate-random-secret>
REFRESH_TOKEN_EXPIRE=7d
ENCRYPTION_KEY=<generate-random-secret>      # Required for bot token encryption

TG_PART_SIZE=18874368                        # ~18MB part size
MAX_UPLOAD_BYTES=2147483648                  # 2GB max upload
REDIS_HOST=localhost
REDIS_PORT=6379                              # Optional: preview queue
CORS_ORIGIN=http://localhost:3000
```

> **Note:** `TELEGRAM_BOT_TOKEN` and `TELEGRAM_STORAGE_CHAT_ID` are for local development/testing only. In production, each user connects their own credentials via Settings.

### Next Steps After Setup

1. Register an account in the web UI
2. Go to **Settings → Telegram Integration**
3. Create a bot via [@BotFather](https://t.me/BotFather)
4. Create a private channel and add your bot as admin (needs Post Messages + Delete Messages)
5. Enter bot token and chat ID in Settings
6. Start uploading files!

For detailed setup instructions, see **[QUICK_START.md](QUICK_START.md)**.

---

## Documentation

Comprehensive documentation available:

| Document                                   | Purpose                      |
| ------------------------------------------ | ---------------------------- |
| [README.md](README.md)                     | This overview document       |
| [QUICK_START.md](QUICK_START.md)           | Step-by-step setup guide     |
| [CONTRIBUTING.md](CONTRIBUTING.md)         | Guidelines for contributors  |
| [SECURITY_CHANGES.md](SECURITY_CHANGES.md) | Recent security improvements |
| [API Reference](#api-reference)            | REST API endpoints           |

### API Endpoints

**Base URL:** `http://localhost:3001/api`

#### Authentication

```
POST   /auth/register      Register new user
POST   /auth/login         Get JWT tokens
POST   /auth/refresh       Rotate access token
GET    /auth/me            Current user profile
```

#### Files

```
POST   /files/upload       Upload file (multipart)
GET    /files              List files (paginate, filter by folder)
GET    /files/search?q=    Search by filename
POST   /files/:id/download-url Create short-lived signed download URL
GET    /files/:id/download Stream download (signed URL; supports Range)
POST   /files/:id/preview-url Create short-lived signed preview URL
GET    /files/:id/preview  Stream inline preview (signed URL; supports Range)
GET    /files/:id/versions Version history
POST   /files/:id/share    Create share link
DELETE /files/:id          Soft delete
```

Download and preview URLs are bound to one file and expire after five minutes by default. Existing clients may continue using a Bearer access token while migrating to signed URLs.

#### Folders

```
GET    /folders?parent=    List folders
POST   /folders            Create folder
PUT    /folders/:id        Rename folder
DELETE /folders/:id        Delete folder
```

#### Sharing

```
GET    /files/s/:token     Access public shared link
                         Password-protected links use X-Share-Password header
POST   /shares             Create/manage shares
GET    /shares             List my shares
DELETE /shares/:id         Revoke share
```

#### WebDAV (Rclone-compatible)

```
PROPFIND, GET, PUT, DELETE, MKCOL, MOVE /webdav/*
Authentication: HTTP Basic (email:password)
```

For full API documentation, see the comments in source code or [README](README.md#api-reference).

---

## Security & Privacy

### What We Protect

| Concern       | Protection Mechanism                                  |
| ------------- | ----------------------------------------------------- |
| Bot tokens    | Encrypted at rest (AES-256-CBC), never sent to client |
| Passwords     | Bcrypt hashed with configurable cost factor           |
| File metadata | Internal Telegram IDs excluded from API responses     |
| Rate abuse    | Rate limiting on general API + stricter auth limits   |
| XSS attacks   | Input sanitization, Content-Security-Policy headers   |
| SQL injection | Sequelize parameterized queries                       |

### Data Privacy

- **Files never touch your server disk**—they're streamed directly to/from Telegram
- **Each user isolated**: A user's files only land in their own Telegram channel
- **No third-party analytics**: Pure self-hosted software
- **Open source**: Everything visible in the repo, auditable

### Security Improvements

Recent additions ([SECURITY_CHANGES.md](SECURITY_CHANGES.md)):

- Fixed authentication bypass vulnerability
- Prevented bot token exposure via redirect leakage
- Added strict secret validation at boot time
- Implemented memory-efficient streaming uploads (no 2GB RAM buffering)
- Fixed cache collision bug that could leak user images
- Added MIME whitelist to prevent stored XSS via WebDAV

---

## Contributing

We welcome contributions! See our contribution guidelines:

- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute, coding standards, PR process
- **[GitHub Issues](https://github.com/Chaerulcp/Teldock/issues)** - Report bugs, request features

### Good First Issues

Look for issues labeled `good first issue` or `help wanted`—perfect entry points for new contributors.

### Code Style

- Conventional Commits format (`feat:`, `fix:`, `docs:`, etc.)
- ES6+ JavaScript with async/await
- Layered architecture: routes → controllers → services → models
- Test coverage for critical paths

---

## License

Licensed under the [MIT License](LICENSE).

---

## Disclaimer

> **⚠️ Important: Read before using.**

Teldock is a **non-commercial, open-source educational project**. Using Telegram's Bot API as general-purpose cloud storage is **not an intended use** of Telegram's platform and may violate Telegram's [Terms of Service](https://telegram.org/tos).

### Your Responsibilities

- Use only with data you own or have rights to store
- Do not use for mass/commercial storage
- Be aware that Telegram may rate-limit, suspend, or delete abusive accounts/files
- Keep independent backups of important data—**do not treat Teldock as reliable primary storage**

The authors are **not liable** for any damages arising from use of this software.

---

## Acknowledgments

Inspired by [teldrive](https://github.com/teldrive/teldrive)—a pioneering implementation of Telegram-based file hosting.

Built with ❤️ using Telegram Bot API, Express, React, and Sequelize.

---

_Last updated: August 29, 2026_
