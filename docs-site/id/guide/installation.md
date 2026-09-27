---
title: Instalasi
description: Cara memasang dan menjalankan Teldock secara lokal, termasuk backend, frontend, dan database.
---

# Instalasi

Halaman ini menjelaskan cara menjalankan Teldock di komputer Anda sendiri: backend Node.js, frontend React, dan database MySQL/MariaDB untuk menyimpan metadata.

## Prasyarat

| Kebutuhan | Versi / keterangan |
| --- | --- |
| Node.js | 22.x atau lebih baru (20+ bisa, 22.x disarankan) |
| MySQL / MariaDB | 8.0 atau lebih baru, sudah berjalan dan dapat diakses |
| Redis | Opsional. Dipakai untuk antrean pembuatan preview. |
| FFmpeg | Opsional. Hanya diperlukan untuk thumbnail video. |
| Bot + channel Telegram | Setiap pengguna memerlukan **bot sendiri** (lewat [@BotFather](https://t.me/BotFather)) dan channel penyimpanan privat. |

::: info Model multi-user
Teldock bersifat multi-user. Setiap akun menghubungkan token bot dan channel privatnya masing-masing di **Settings → Telegram Integration**. Nilai Telegram pada `.env` hanya untuk pengembangan dan pengujian lokal. Lihat [Menghubungkan Telegram](/id/guide/telegram-setup).
:::

## 1. Clone repositori

```bash
git clone https://github.com/Chaerulcp/Teldock.git
cd Teldock
```

## 2. Siapkan backend

```bash
cd backend
npm install
cp .env.example .env      # lalu edit .env (lihat Konfigurasi)
npm run migrate           # buat semua tabel database
npm run dev               # jalankan API di http://localhost:3001
```

Biarkan terminal ini tetap terbuka. `npm run dev` menjalankan API dengan auto-reload melalui nodemon; gunakan `npm start` untuk menjalankan proses Node biasa.

::: tip Windows / PowerShell
`cp` adalah perintah Unix. Di Windows PowerShell, salin file contoh dengan:

```powershell
Copy-Item .env.example .env
```

:::

Sebelum server dijalankan, buka `backend/.env` dan isi setidaknya kredensial database serta tiga secret wajib (`JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `ENCRYPTION_KEY`). Lihat [Konfigurasi](/id/guide/configuration).

## 3. Siapkan frontend

Di terminal baru:

```bash
cd frontend
npm install
npm run dev               # jalankan SPA di http://localhost:3000
```

Vite otomatis mem-proxy permintaan `/api` ke backend, sehingga browser dapat memanggil `http://localhost:3000/api/...` selama pengembangan.

## 4. Verifikasi backend berjalan

```bash
curl http://localhost:3001/api/health
```

Respons yang diharapkan:

```json
{ "success": true, "message": "API is running", "timestamp": "..." }
```

Setelah itu buka `http://localhost:3000`, daftarkan akun, lalu lanjutkan ke [Menghubungkan Telegram](/id/guide/telegram-setup).

## Layanan dan port

| Layanan | URL | Port |
| --- | --- | --- |
| Frontend (React SPA) | `http://localhost:3000` | 3000 |
| Backend (Express API) | `http://localhost:3001/api` | 3001 |
| Database (MySQL/MariaDB) | `localhost` | 3306 |

## Perintah umum

| Lokasi | Perintah | Kegunaan |
| --- | --- | --- |
| backend | `npm run dev` | Menjalankan API dengan auto-reload |
| backend | `npm start` | Menjalankan API sebagai proses Node biasa |
| backend | `npm run migrate` | Membuat/menyinkronkan tabel database |
| backend | `npm run test-db` | Memeriksa penyiapan database |
| backend | `npm run test-auth` | Menjalankan skrip pengujian auth |
| frontend | `npm run dev` | Menjalankan dev server Vite |
| frontend | `npm run build` | Build untuk produksi |

::: warning Server menolak boot tanpa secret yang valid
Saat startup, backend memvalidasi `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, dan `ENCRYPTION_KEY`. Jika salah satunya tidak ada, kurang dari 32 karakter, atau masih berisi nilai placeholder dari `.env.example`, proses akan berhenti dengan pesan error alih-alih berjalan. Aturan ini diterapkan di `backend/src/config/secrets.js` agar deployment yang salah konfigurasi langsung gagal, bukan diam-diam memakai nilai default yang publik.
:::

::: danger Buat secret yang kuat
Jangan menjalankan Teldock dengan secret contoh. Buat nilai acak (lihat [Konfigurasi](/id/guide/configuration)) dan jaga agar tetap stabil — mengubah `ENCRYPTION_KEY` di kemudian hari membuat kredensial dan file yang sudah terenkripsi tidak dapat dibaca.
:::

## Langkah selanjutnya

- [Menghubungkan Telegram](/id/guide/telegram-setup) — buat bot dan hubungkan channel privat.
- [Konfigurasi](/id/guide/configuration) — panduan setiap pengaturan backend dan frontend.
