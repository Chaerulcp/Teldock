---
title: Environment Variables
description: Referensi lengkap setiap environment variable backend Teldock, beserta default dan status wajibnya.
---

# Environment Variables

Backend membaca konfigurasinya dari `backend/.env` (dimuat dengan `dotenv`). Halaman ini mencantumkan setiap variabel, default-nya, apakah wajib, dan kegunaannya.

Daftar ini disusun dari `backend/.env.example` dan dari setiap pembacaan `process.env.*` di `backend/src`. Jika kode dan contoh berbeda, perbedaannya dijelaskan pada kolom deskripsi.

## Referensi lengkap

| Variabel | Default | Wajib | Deskripsi |
| --- | --- | --- | --- |
| `NODE_ENV` | `development` | Tidak | Mode runtime. `development` mengaktifkan log query SQL di Sequelize; gunakan `production` di server. |
| `PORT` | `3001` | Tidak | Port HTTP tempat Express API mendengarkan. |
| `DB_HOST` | `localhost` | Ya | Hostname MySQL/MariaDB. |
| `DB_PORT` | `3306` | Tidak | Port MySQL/MariaDB. |
| `DB_NAME` | `tele_storage_db` | Ya | Nama database (nilai berasal dari `.env.example`; kode membacanya langsung). |
| `DB_USER` | `root` | Ya | User database. |
| `DB_PASSWORD` | *(kosong)* | Bersyarat | Password database. Boleh kosong untuk database lokal tanpa password; wajib bila user DB Anda memakai password. |
| `JWT_SECRET` | *(tidak ada)* | Ya | Menandatangani access token. Minimal 32 karakter dan bukan placeholder. Divalidasi saat boot. |
| `JWT_EXPIRE` | `15m` | Tidak | Masa berlaku access token. |
| `REFRESH_TOKEN_SECRET` | *(tidak ada)* | Ya | Menandatangani refresh token. Minimal 32 karakter, bukan placeholder. Divalidasi saat boot. |
| `REFRESH_TOKEN_EXPIRE` | `7d` | Tidak | Masa berlaku refresh token. |
| `FILE_ACCESS_TOKEN_EXPIRE` | `5m` | Tidak | Masa berlaku URL preview/download bertanda tangan. Dipakai di `jwt.service.js`. |
| `ENCRYPTION_KEY` | *(tidak ada)* | Ya | Mengenkripsi kredensial Telegram per pengguna saat disimpan dan enkripsi file opsional. Minimal 32 karakter, bukan placeholder. Divalidasi saat boot. Jaga agar tetap stabil. |
| `TELEGRAM_BOT_TOKEN` | *(tidak ada)* | Dev saja | Token bot fallback yang hanya dipakai saat `NODE_ENV` bukan `production`, untuk pengembangan dan pengujian lokal. Bukan fallback produksi multi-user. |
| `TELEGRAM_STORAGE_CHAT_ID` | *(tidak ada)* | Dev saja | Chat ID channel penyimpanan fallback yang hanya dipakai saat `NODE_ENV` bukan `production`. |
| `TELEGRAM_API_URL` | `https://api.telegram.org/bot<token>` | Tidak | Base URL untuk Telegram Bot API. Ada di `.env.example`; kode saat ini memanggil `https://api.telegram.org` secara langsung, jadi ini disediakan untuk Bot API server publik atau lokal. |
| `TELEGRAM_API_SERVER_URL` | `http://localhost:8081` | Tidak | URL untuk Telegram Bot API server lokal. Disediakan; belum dibaca kode saat ini. |
| `REDIS_HOST` | `localhost` | Tidak | Host untuk antrean pembuatan preview yang opsional. Tidak wajib untuk menjalankan Teldock. |
| `REDIS_PORT` | `6379` | Tidak | Port untuk instance Redis opsional. |
| `CORS_ORIGIN` | `http://localhost:3000` | Tidak | Origin browser yang diizinkan. Harus persis sama dengan origin frontend; tetapkan secara eksplisit di produksi. |
| `BCRYPT_ROUNDS` | `12` | Tidak | Faktor biaya hashing password. Dibaca oleh `backend/src/config/security.js`; nilai di luar rentang 4–15 akan kembali ke `12` disertai peringatan. |
| `TG_PART_SIZE` | `18874368` (~18 MB) | Tidak | Jumlah byte per potongan saat mengunggah ke Telegram. Dipakai di `telegram-storage.service.js`. |
| `MAX_UPLOAD_BYTES` | `2147483648` (2 GB) | Tidak | Ukuran unggahan maksimum yang diterima. Dipakai oleh jalur unggah HTTP dan WebDAV. |
| `WEBDAV_RATE_LIMIT_MAX` | `5000` | Tidak | Jumlah request yang diizinkan per 15 menit pada router `/webdav`. Percobaan autentikasi yang gagal dibatasi terpisah sebanyak 20 per 15 menit. |
| `FRONTEND_URL` | `http://localhost:3000` | Tidak | Base URL untuk membentuk tautan pendek share absolut (misalnya `<FRONTEND_URL>/s/<token>`). Dibaca di `SharedLink`, `share.controller.js`, dan `file-management.service.js`. Setel ke origin frontend publik Anda di produksi; tanpa itu, tautan share dikembalikan sebagai path relatif. |

## Contoh `.env`

```ini
# Server
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tele_storage_db
DB_USER=root
DB_PASSWORD=

# Authentication secrets (required — the server refuses to boot with placeholders)
JWT_SECRET=<generate-random-secret>
JWT_EXPIRE=15m
REFRESH_TOKEN_SECRET=<generate-random-secret>
REFRESH_TOKEN_EXPIRE=7d
FILE_ACCESS_TOKEN_EXPIRE=5m

# Encryption (required, keep stable)
ENCRYPTION_KEY=<generate-random-secret>

# Telegram (local dev/testing only — production users connect their own bot in Settings)
TELEGRAM_BOT_TOKEN=
TELEGRAM_STORAGE_CHAT_ID=
TELEGRAM_API_URL=https://api.telegram.org/botYOUR_BOT_TOKEN
TELEGRAM_API_SERVER_URL=http://localhost:8081

# Storage / uploads
TG_PART_SIZE=18874368
MAX_UPLOAD_BYTES=2147483648
WEBDAV_RATE_LIMIT_MAX=5000

# Optional services
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
BCRYPT_ROUNDS=12
```

Buat ketiga secret dengan:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Wajib di produksi

::: warning Wajib mutlak
`JWT_SECRET`, `REFRESH_TOKEN_SECRET`, dan `ENCRYPTION_KEY` bersifat wajib. Backend memvalidasinya saat startup dan berhenti bila tidak ada, kurang dari 32 karakter, atau masih berisi placeholder contoh. Lihat `backend/src/config/secrets.js`.
:::

Variabel koneksi database (`DB_HOST`, `DB_NAME`, `DB_USER`, dan `DB_PASSWORD` bila berlaku) harus menunjuk ke database yang dapat diakses. `CORS_ORIGIN` sebaiknya diisi dengan origin frontend Anda yang sebenarnya di produksi, bukan dibiarkan pada default `localhost`.

Opsional di semua lingkungan:

- `REDIS_HOST` / `REDIS_PORT` — hanya diperlukan untuk antrean pembuatan preview.
- `BCRYPT_ROUNDS` — faktor biaya hashing password (4–15; default `12`).
- `TELEGRAM_API_URL`, `TELEGRAM_API_SERVER_URL` — didokumentasikan tetapi belum dibaca kode saat ini.
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_STORAGE_CHAT_ID` — hanya fallback pengembangan/pengujian.

## Lihat juga

- [Konfigurasi](/id/guide/configuration) — panduan tiap kelompok pengaturan.
- [Menghubungkan Telegram](/id/guide/telegram-setup) — cara kredensial per pengguna disimpan.
