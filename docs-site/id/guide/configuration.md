---
title: Konfigurasi
description: Panduan pengaturan .env backend Teldock dan konfigurasi dev frontend.
---

# Konfigurasi

Teldock membaca konfigurasi backend dari `backend/.env`. File ini dimuat dengan `dotenv` saat server dijalankan, dan `backend/src/config/secrets.js` memvalidasi secret wajib sebelum aplikasi boot.

Mulai dari templat:

```bash
cd backend
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
```

Lalu edit `.env` sesuai lingkungan Anda. Halaman ini menjelaskan setiap kelompok; daftar variabel lengkap ada di [Environment Variables](/id/reference/configuration).

## Validasi saat startup

Sebelum server HTTP berjalan, backend memanggil `assertSecrets()` di `backend/src/config/secrets.js`. Fungsi ini memeriksa bahwa `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, dan `ENCRYPTION_KEY`:

- sudah diisi,
- panjangnya minimal 32 karakter,
- bukan salah satu nilai placeholder yang ada di `.env.example`.

Jika ada pemeriksaan yang gagal, proses berhenti dengan daftar masalah alih-alih berjalan. Ini mencegah deployment diam-diam memakai secret yang publik di repositori.

## Server

| Variabel | Kegunaan |
| --- | --- |
| `NODE_ENV` | Mode runtime. `development` mengaktifkan log SQL; gunakan `production` di produksi. |
| `PORT` | Port HTTP untuk Express API (default `3001`). |
| `CORS_ORIGIN` | Origin frontend yang diizinkan; harus sama dengan URL tempat browser memuat aplikasi. |

## Database

Teldock memakai Sequelize dengan MySQL/MariaDB. Isi `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, dan `DB_PASSWORD` sesuai server Anda, lalu jalankan `npm run migrate` untuk membuat tabel. Jika `DB_PASSWORD` kosong, biarkan saja kosong.

## JWT dan autentikasi

| Variabel | Kegunaan |
| --- | --- |
| `JWT_SECRET` | Menandatangani access token berumur pendek. **Wajib.** |
| `JWT_EXPIRE` | Masa berlaku access token (default `15m`). |
| `REFRESH_TOKEN_SECRET` | Menandatangani refresh token untuk rotasi. **Wajib.** |
| `REFRESH_TOKEN_EXPIRE` | Masa berlaku refresh token (default `7d`). |
| `FILE_ACCESS_TOKEN_EXPIRE` | Masa berlaku URL preview/download bertanda tangan (default `5m`). |

## Telegram

`TELEGRAM_BOT_TOKEN` dan `TELEGRAM_STORAGE_CHAT_ID` hanya untuk kemudahan pengembangan dan pengujian lokal. Pada operasi multi-user normal, setiap akun menghubungkan bot dan channel-nya sendiri di Settings — lihat [Menghubungkan Telegram](/id/guide/telegram-setup).

`TELEGRAM_API_URL` dan `TELEGRAM_API_SERVER_URL` tidak dibaca oleh kode. Backend memanggil `https://api.telegram.org` secara langsung (hardcoded di `backend/src/services/telegram-storage.service.js`), jadi mengisi variabel ini tidak berpengaruh.

## Enkripsi

`ENCRYPTION_KEY` melindungi kredensial Telegram per pengguna saat disimpan dan, secara opsional, enkripsi file. **Wajib**, minimal 32 karakter.

::: danger Jaga ENCRYPTION_KEY tetap stabil
Mengubah `ENCRYPTION_KEY` setelah ada data membuat kredensial dan file yang sudah terenkripsi tidak dapat dibaca. Tetapkan sekali, cadangkan, dan jangan merotasinya sembarangan.
:::

## Redis (tidak dipakai)

Teldock tidak memakai Redis. `REDIS_HOST` dan `REDIS_PORT` ada di `backend/.env.example` tetapi tidak dibaca oleh kode, sehingga tidak berpengaruh. Tidak ada antrean preview: preview dihasilkan di dalam proses saat diminta (lihat `backend/src/routes/preview.routes.js`).

## Keamanan

| Variabel | Kegunaan |
| --- | --- |
| `CORS_ORIGIN` | Origin browser yang diizinkan. Harus persis sama dengan origin frontend. |
| `BCRYPT_ROUNDS` | Biaya hashing password. Dibaca oleh `backend/src/config/security.js`; nilai di luar rentang 4–15 akan kembali ke `12`. |

Nilai terkait penyimpanan:

| Variabel | Kegunaan |
| --- | --- |
| `TG_PART_SIZE` | Jumlah byte per potongan saat mengunggah ke Telegram (default `18874368`, sekitar 18 MB). |
| `MAX_UPLOAD_BYTES` | Ukuran unggahan maksimum yang diterima (default `2147483648`, 2 GB). |
| `WEBDAV_RATE_LIMIT_MAX` | Jumlah request yang diizinkan per 15 menit pada router `/webdav` (default `5000`). Percobaan autentikasi yang gagal dibatasi terpisah sebanyak 20 per 15 menit. |
| `FRONTEND_URL` | Base URL untuk membentuk tautan pendek share (misalnya `<FRONTEND_URL>/s/<token>`). Dibaca di `SharedLink`, `share.controller.js`, dan `file-management.service.js`; tanpa itu, tautan share dikembalikan sebagai path relatif. |

## Membuat secret yang kuat

Buat setiap secret wajib secara terpisah dengan Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Jalankan sekali untuk `JWT_SECRET`, sekali untuk `REFRESH_TOKEN_SECRET`, dan sekali untuk `ENCRYPTION_KEY`. Tempel setiap hasil ke `.env`.

## Nilai yang wajib diubah

Sebelum menjalankan apa pun di luar uji lokal sekadar coba-coba, ganti nilai berikut:

| Variabel | Alasan |
| --- | --- |
| `JWT_SECRET` | Nilai placeholder ditolak saat boot dan bersifat publik. |
| `REFRESH_TOKEN_SECRET` | Sama seperti di atas. |
| `ENCRYPTION_KEY` | Sama seperti di atas; juga harus tetap stabil selamanya. |
| `DB_PASSWORD` | Gunakan password database yang sebenarnya. |
| `CORS_ORIGIN` | Harus sesuai origin frontend Anda yang sebenarnya, bukan `localhost`, di produksi. |

## Konfigurasi frontend

Frontend adalah SPA Vite + React. Dalam pengembangan, `frontend/vite.config.js` mem-proxy `/api` ke backend:

```js
server: {
  proxy: {
    '/api': { target: 'http://localhost:3001' },
  },
}
```

Artinya panggilan browser ke `/api/...` diteruskan ke backend tanpa masalah CORS selama pengembangan. Karena proxy menangani hal ini, `CORS_ORIGIN` tetap penting untuk panggilan lintas-origin langsung dan untuk deployment produksi — nilainya harus sama dengan origin yang menyajikan frontend.

## Langkah selanjutnya

- [Environment Variables](/id/reference/configuration) — referensi lengkap variabel beserta default dan status wajibnya.
- [Menghubungkan Telegram](/id/guide/telegram-setup) — hubungkan bot dan channel.
