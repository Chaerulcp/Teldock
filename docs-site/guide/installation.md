---
title: Installation
description: Install and run Teldock locally, including backend, frontend and database setup.
---

# Installation

This page walks through running Teldock on your own machine: the Node.js backend, the React frontend, and the MySQL/MariaDB database that stores metadata.

## Prerequisites

| Requirement | Version / notes |
| --- | --- |
| Node.js | 22.x or newer (20+ works, 22.x recommended) |
| MySQL / MariaDB | 8.0 or newer, running and reachable |
| FFmpeg | Optional. Required only for video preview generation. Image previews use Sharp and need no FFmpeg; without FFmpeg installed, video previews return `503`. |
| Telegram bot + channel | Each end user needs their **own** bot (via [@BotFather](https://t.me/BotFather)) and a private storage channel. |

::: info Multi-user model
Teldock is multi-user. Every account connects its own bot token and private channel in **Settings → Telegram Integration**. The Telegram values in `.env` are for local development and testing only. See [Connecting Telegram](/guide/telegram-setup).
:::

## 1. Clone the repository

```bash
git clone https://github.com/Chaerulcp/Teldock.git
cd Teldock
```

## 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env      # then edit .env (see Configuration)
npm run migrate           # create all database tables
npm run dev               # start the API on http://localhost:3001
```

Keep this terminal open. `npm run dev` starts the API with auto-reload via nodemon; use `npm start` for a plain Node process.

::: tip Windows / PowerShell
`cp` is a Unix command. On Windows PowerShell, copy the example file with:

```powershell
Copy-Item .env.example .env
```

:::

Before the server boots, open `backend/.env` and set at least the database credentials and the three required secrets (`JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `ENCRYPTION_KEY`). See [Configuration](/guide/configuration).

## 3. Set up the frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev               # start the SPA on http://localhost:3000
```

Vite proxies `/api` requests to the backend automatically, so the browser can call `http://localhost:3000/api/...` during development.

## 4. Verify the backend is up

```bash
curl http://localhost:3001/api/health
```

Expected response:

```json
{ "success": true, "message": "API is running", "timestamp": "..." }
```

Then open `http://localhost:3000`, register an account, and continue with [Connecting Telegram](/guide/telegram-setup).

## Services and ports

| Service | URL | Port |
| --- | --- | --- |
| Frontend (React SPA) | `http://localhost:3000` | 3000 |
| Backend (Express API) | `http://localhost:3001/api` | 3001 |
| Database (MySQL/MariaDB) | `localhost` | 3306 |

## Common commands

| Location | Command | Purpose |
| --- | --- | --- |
| backend | `npm run dev` | Start the API with auto-reload |
| backend | `npm start` | Start the API as a plain Node process |
| backend | `npm run migrate` | Create/sync database tables |
| backend | `npm run test-db` | Verify the database setup |
| backend | `npm run test-auth` | Run the auth test script |
| frontend | `npm run dev` | Start the Vite dev server |
| frontend | `npm run build` | Production build |

::: warning The server refuses to boot without real secrets
At startup the backend validates `JWT_SECRET`, `REFRESH_TOKEN_SECRET` and `ENCRYPTION_KEY`. If any of them is missing, shorter than 32 characters, or still set to a placeholder value from `.env.example`, the process exits with an error instead of starting. This is enforced in `backend/src/config/secrets.js` so a misconfigured deployment fails immediately rather than silently using a public default.
:::

::: danger Generate strong secrets
Do not run Teldock with the example secrets. Generate random values (see [Configuration](/guide/configuration)) and keep them stable — changing `ENCRYPTION_KEY` later makes previously encrypted credentials and files unreadable.
:::

## Next steps

- [Connecting Telegram](/guide/telegram-setup) — create a bot and link a private channel.
- [Configuration](/guide/configuration) — walk through every backend and frontend setting.
