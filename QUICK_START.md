# Quick Start

Get the app running locally in a few minutes.

## Prerequisites

- Node.js 20+ (22.x recommended)
- MySQL / MariaDB running
- Each user account needs its own Telegram bot ([@BotFather](https://t.me/BotFather)) + a private storage channel, connected **in the app** (not in `.env`). The `.env` Telegram values are for local dev/testing only.

---

## 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # edit values (DB credentials, JWT secrets, etc.)
npm run migrate           # create all database tables
npm run dev               # API on http://localhost:3001
```

Keep this terminal open.

## 2. Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev               # SPA on http://localhost:3000
```

Vite proxies `/api` to the backend automatically.

## 3. Use the app

1. Open http://localhost:3000
2. Register a new account.
3. Go to **Settings → Telegram Integration** and connect **your own** bot token + storage channel ID
   (create a bot with @BotFather, make a private channel, add the bot as an admin).
4. Upload, download, share, and organize files.

> Teldock is **multi-user**: each account connects its own bot + channel and stores files in its own
> Telegram channel. Several people (e.g. a family) can share one self-hosted instance while staying isolated.
> See "How Telegram credentials work" in the [README](README.md#how-telegram-credentials-work).

---

## Verify the backend is up

```bash
curl http://localhost:3001/api/health
```

Expected:

```json
{ "success": true, "message": "API is running", "timestamp": "..." }
```

---

## Common Commands

| Location | Command | Purpose |
|----------|---------|---------|
| backend | `npm run dev` | Start API with auto-reload |
| backend | `npm run migrate` | Create/sync database tables |
| backend | `npm run test-db` | Verify database setup |
| backend | `npm run test-auth` | Run auth test script |
| frontend | `npm run dev` | Start Vite dev server |
| frontend | `npm run build` | Production build |

---

## Services Overview

| Service | URL | Port |
|---------|-----|------|
| Frontend (React SPA) | http://localhost:3000 | 3000 |
| Backend (Express API) | http://localhost:3001/api | 3001 |
| Database (MySQL/MariaDB) | localhost | 3306 |

---

## Troubleshooting

- **Can't reach the frontend** — ensure `npm run dev` is running in `frontend/`.
- **Auth failing** — confirm the backend is on port 3001; the client refreshes tokens automatically.
- **Uploads failing** — connect your own bot in Settings; the bot must be an admin of your storage channel (with Post + Delete Messages).
- **Database errors** — start MySQL, verify `.env` credentials, then re-run `npm run migrate`.

For full documentation, see [README.md](README.md).
