---
title: Project Structure
description: Annotated map of the Teldock repository, its backend layers, frontend folders, npm scripts, and CI.
---

# Project Structure

Teldock is a monorepo with three top-level parts: a Node.js API (`backend/`), a React single-page
app (`frontend/`), and a VitePress documentation site (`docs-site/`). This page explains how the
source is organized and how the automated checks are wired.

## Directory tree

```text
Teldock/
├── backend/                         Node.js API (Express 5)
│   ├── server.js                    Process entry point
│   ├── src/
│   │   ├── app.js                   Express setup, middleware, route mounting
│   │   ├── config/
│   │   │   ├── database.js          Sequelize/MySQL connection
│   │   │   └── secrets.js           Secret resolver and boot-time validation
│   │   ├── routes/                  Endpoint definitions + middleware binding
│   │   │   ├── index.js             Mounts /auth, /files, /health
│   │   │   ├── auth.routes.js
│   │   │   ├── file.routes.js       Streaming multipart upload, file CRUD
│   │   │   ├── folder.routes.js
│   │   │   ├── user.routes.js       Telegram connect/config/status/unlink
│   │   │   ├── bot.routes.js        Multi-bot pool
│   │   │   ├── share.routes.js
│   │   │   ├── tag.routes.js
│   │   │   ├── smart-folder.routes.js
│   │   │   ├── preview.routes.js
│   │   │   ├── stats.routes.js
│   │   │   └── webdav.routes.js     Rclone-compatible WebDAV
│   │   ├── controllers/             HTTP request/response handling
│   │   ├── services/                Business logic
│   │   │   ├── telegram-storage.service.js   Chunking, streaming, Telegram I/O
│   │   │   ├── bot-pool.service.js           Round-robin bot selection
│   │   │   ├── file-upload.service.js
│   │   │   ├── file-stream.service.js
│   │   │   ├── file-query.service.js
│   │   │   ├── file-management.service.js
│   │   │   ├── version-history.service.js
│   │   │   ├── jwt.service.js
│   │   │   ├── realtime-sync.service.js      Socket.IO real-time sync
│   │   │   ├── file-service-error.js
│   │   │   └── preview/
│   │   │       ├── image.service.js
│   │   │       └── video.service.js
│   │   ├── models/                  Sequelize models + associations
│   │   │   ├── index.js
│   │   │   ├── User.js
│   │   │   ├── BotToken.js
│   │   │   ├── File.js
│   │   │   ├── FilePart.js
│   │   │   ├── FileVersion.js
│   │   │   ├── FileTag.js
│   │   │   ├── Folder.js
│   │   │   ├── SharedLink.js
│   │   │   ├── SmartFolder.js
│   │   │   ├── Tag.js
│   │   │   └── TelegramConfig.js
│   │   ├── middleware/              Auth, validation, file access, upload
│   │   ├── validation/              Zod schemas (auth, file, telegram)
│   │   └── utils/                   Shared helpers (currently empty)
│   ├── scripts/                     Migration and diagnostic scripts
│   └── tests/                       node:test unit and integration tests
├── frontend/                        React 18 + Vite SPA
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx                 App bootstrap + auth initialization
│       ├── App.jsx                  Router configuration
│       ├── index.css
│       ├── pages/                   Route-level views
│       │   ├── Landing.jsx
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Dashboard.jsx
│       │   ├── MobileDashboard.jsx
│       │   ├── Settings.jsx
│       │   ├── Shares.jsx
│       │   └── Stats.jsx
│       ├── components/              Reusable UI
│       │   ├── Layout.jsx
│       │   ├── FileViewer.jsx
│       │   ├── TagPicker.jsx
│       │   ├── TransferCenter.jsx
│       │   └── VersionHistory.jsx
│       ├── services/
│       │   └── api.js               Axios client + interceptors
│       └── store/
│           ├── auth-store.js        Zustand auth state
│           ├── theme-store.js       Dark/light theme state
│           └── transfer-context.jsx Upload/download transfer state
├── docs-site/                       VitePress documentation (this site)
├── .github/workflows/
│   ├── ci.yml                       Lint, test, and frontend build
│   └── deploy-docs.yml              Build and deploy the docs site
└── README.md
```

## Backend layers

The backend follows a strict layered architecture:

```text
routes → controllers → services → models
```

| Layer | Directory | Responsibility |
| --- | --- | --- |
| Routes | `src/routes` | Declare URL paths, attach authentication and validation middleware. |
| Controllers | `src/controllers` | Handle the HTTP request/response cycle and translate service errors into status codes. |
| Services | `src/services` | Hold business logic: chunking, streaming, bot selection, previews, version history. |
| Models | `src/models` | Define tables, associations, and persistence helpers via Sequelize. |
| Middleware | `src/middleware` | Cross-cutting concerns: JWT verification, Zod validation, file-access signatures, upload parsing. |
| Validation | `src/validation` | Zod schemas that describe valid request bodies. |
| Config | `src/config` | Database connection and centralized secret resolution. |

## Frontend folders

| Folder | Role |
| --- | --- |
| `src/pages` | Route-level screens rendered by the React Router configuration in `App.jsx`. |
| `src/components` | Reusable UI pieces such as the layout shell, file viewer, tag picker, and transfer center. |
| `src/services` | The Axios API client and its request/response interceptors. |
| `src/store` | Zustand stores for auth, theme, and transfer state. |

## Backend npm scripts

Run these from the `backend` directory.

| Script | Command | Purpose |
| --- | --- | --- |
| `start` | `node server.js` | Start the API in the current environment. |
| `dev` | `nodemon server.js` | Start with auto-reload for development. |
| `migrate` | `node scripts/migrate.js` | Create/update all database tables. |
| `migrate:chunked` | `node scripts/migrate-chunked-storage.js` | Add chunked/encrypted columns. |
| `migrate:drop-quota` | `node scripts/migrate-drop-quota.js` | Remove the legacy fixed quota. |
| `migrate:widen-share-token` | `node scripts/migrate-widen-share-token.js` | Widen the share token column. |
| `migrate:version-snapshots` | `node scripts/migrate-version-snapshots.js` | Add version part snapshots. |
| `migrate:tags-favorites` | `node scripts/migrate-tags-favorites.js` | Add tags, favorites, smart folders. |
| `test` | `node --test tests/*.test.js` | Run the unit/integration test suite. |
| `test-auth` | `node tests/test-auth.js` | Run the legacy auth test script. |
| `test-db` | `node scripts/test-database.js` | Verify database connectivity and schema. |
| `lint` | `eslint "src/**/*.js" "tests/**/*.js" "scripts/**/*.js" "*.js"` | Static analysis. |
| `format` | `prettier --write ...` | Format source, tests, and scripts. |

## Frontend npm scripts

Run these from the `frontend` directory.

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `vite --host 0.0.0.0 --port 3000` | Start the dev server on port 3000. |
| `build` | `vite build` | Produce the production bundle in `dist/`. |
| `preview` | `vite preview` | Serve the built bundle locally. |

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main`, on every pull request, and on manual
dispatch. It has two independent jobs:

| Job | Steps |
| --- | --- |
| `backend` | Check out, set up Node.js 22, `npm ci --ignore-scripts`, `npm run lint`, `npm test`. |
| `frontend` | Check out, set up Node.js 22, `npm ci --ignore-scripts`, `npm run build`. |

::: tip
CI runs on every push to `main` and on every pull request. Keep `npm run lint` and `npm test` green
in `backend`, and `npm run build` green in `frontend`, before opening a PR.
:::

The documentation site is built and deployed by a **separate** workflow,
`.github/workflows/deploy-docs.yml`. It triggers only when files under `docs-site/` change (or when
run manually), runs `npm run docs:build` in `docs-site`, and publishes the result to GitHub Pages.

## Related pages

- [Architecture](/guide/architecture) — how the pieces fit together at runtime.
- [Database Schema](/reference/database-schema) — the models referenced above.
- [Contributing](/contributing) — coding standards and local checks.
