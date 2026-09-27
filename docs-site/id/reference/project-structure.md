---
title: Project Structure
description: Peta beranotasi repositori Teldock, layer backend, folder frontend, skrip npm, dan CI.
---

# Project Structure

Teldock adalah monorepo dengan tiga bagian utama: API Node.js (`backend/`), aplikasi React
single-page (`frontend/`), dan situs dokumentasi VitePress (`docs-site/`). Halaman ini menjelaskan
bagaimana kode sumber diorganisasi dan bagaimana pemeriksaan otomatis dirangkai.

## Pohon direktori

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

## Layer backend

Backend mengikuti arsitektur berlapis yang ketat:

```text
routes → controllers → services → models
```

| Layer | Direktori | Tanggung jawab |
| --- | --- | --- |
| Routes | `src/routes` | Mendeklarasikan path URL, memasang middleware autentikasi dan validasi. |
| Controllers | `src/controllers` | Menangani siklus request/response HTTP dan menerjemahkan error service menjadi kode status. |
| Services | `src/services` | Menyimpan logika bisnis: chunking, streaming, pemilihan bot, preview, riwayat versi. |
| Models | `src/models` | Mendefinisikan tabel, asosiasi, dan helper persistensi melalui Sequelize. |
| Middleware | `src/middleware` | Concern lintas potong: verifikasi JWT, validasi Zod, tanda tangan file-access, parsing upload. |
| Validation | `src/validation` | Skema Zod yang mendeskripsikan request body yang valid. |
| Config | `src/config` | Koneksi database dan resolusi secret terpusat. |

## Folder frontend

| Folder | Peran |
| --- | --- |
| `src/pages` | Layar tingkat route yang dirender oleh konfigurasi React Router di `App.jsx`. |
| `src/components` | Komponen UI yang dapat dipakai ulang seperti layout shell, file viewer, tag picker, dan transfer center. |
| `src/services` | Klien API Axios beserta interceptor request/response-nya. |
| `src/store` | Store Zustand untuk state auth, theme, dan transfer. |

## Skrip npm backend

Jalankan dari direktori `backend`.

| Skrip | Perintah | Fungsi |
| --- | --- | --- |
| `start` | `node server.js` | Menjalankan API pada environment saat ini. |
| `dev` | `nodemon server.js` | Menjalankan dengan auto-reload untuk pengembangan. |
| `migrate` | `node scripts/migrate.js` | Membuat/memperbarui seluruh tabel database. |
| `migrate:chunked` | `node scripts/migrate-chunked-storage.js` | Menambah kolom chunked/encrypted. |
| `migrate:drop-quota` | `node scripts/migrate-drop-quota.js` | Menghapus kuota tetap lama. |
| `migrate:widen-share-token` | `node scripts/migrate-widen-share-token.js` | Melebarkan kolom share token. |
| `migrate:version-snapshots` | `node scripts/migrate-version-snapshots.js` | Menambah part snapshot versi. |
| `migrate:tags-favorites` | `node scripts/migrate-tags-favorites.js` | Menambah tag, favorit, smart folder. |
| `test` | `node --test tests/*.test.js` | Menjalankan suite unit/integration test. |
| `test-auth` | `node tests/test-auth.js` | Menjalankan skrip tes auth lama. |
| `test-db` | `node scripts/test-database.js` | Memverifikasi konektivitas dan skema database. |
| `lint` | `eslint "src/**/*.js" "tests/**/*.js" "scripts/**/*.js" "*.js"` | Analisis statis. |
| `format` | `prettier --write ...` | Memformat source, test, dan skrip. |

## Skrip npm frontend

Jalankan dari direktori `frontend`.

| Skrip | Perintah | Fungsi |
| --- | --- | --- |
| `dev` | `vite --host 0.0.0.0 --port 3000` | Menjalankan dev server pada port 3000. |
| `build` | `vite build` | Menghasilkan bundle produksi di `dist/`. |
| `preview` | `vite preview` | Menyajikan bundle hasil build secara lokal. |

## Continuous integration

`.github/workflows/ci.yml` berjalan pada setiap push ke `main`, pada setiap pull request, dan pada
dispatch manual. Workflow ini memiliki dua job independen:

| Job | Langkah |
| --- | --- |
| `backend` | Check out, menyiapkan Node.js 22, `npm ci --ignore-scripts`, `npm run lint`, `npm test`. |
| `frontend` | Check out, menyiapkan Node.js 22, `npm ci --ignore-scripts`, `npm run build`. |

::: tip
CI berjalan pada setiap push ke `main` dan setiap pull request. Pastikan `npm run lint` dan `npm test`
hijau di `backend`, serta `npm run build` hijau di `frontend`, sebelum membuka PR.
:::

Situs dokumentasi dibangun dan dideploy oleh workflow **terpisah**,
`.github/workflows/deploy-docs.yml`. Workflow ini dipicu hanya saat ada perubahan di bawah `docs-site/`
(atau saat dijalankan manual), menjalankan `npm run docs:build` di `docs-site`, lalu mempublikasikan
hasilnya ke GitHub Pages.

## Halaman terkait

- [Architecture](/id/guide/architecture) — bagaimana semua bagian saling terhubung saat runtime.
- [Database Schema](/id/reference/database-schema) — model yang dirujuk di atas.
- [Contributing](/id/contributing) — standar kode dan pemeriksaan lokal.
