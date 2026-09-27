---
title: Security
description: Pahami model keamanan Teldock, alur autentikasi, rate limit, dan checklist hardening untuk self-hosting.
---

# Security

Teldock menangani kredensial bot, akun pengguna, dan akses file. Halaman ini menjelaskan cara
melindunginya, perilaku autentikasi dan rate limit, serta langkah yang perlu diambil self-hoster agar
deployment tetap aman. Untuk perintah deployment yang dirujuk di sini, lihat
[Deployment](/id/guide/deployment).

## Model keamanan

Teldock bersifat self-hosted dan satu instance untuk satu pemilik. Setiap pengguna menghubungkan bot
dan channel Telegram miliknya sendiri, sehingga kredensial dan isi file terisolasi per akun. Server
hanya menyimpan metadata; byte file dialirkan ke dan dari Telegram saat dibutuhkan.

## Mekanisme perlindungan

| Mekanisme | Melindungi | Implementasi |
| --- | --- | --- |
| Bot token terenkripsi saat disimpan | Bot token Telegram di database | AES-256-CBC dengan IV acak per record; key diturunkan dari `ENCRYPTION_KEY` via scrypt |
| Hashing password | Password akun pengguna | bcrypt dengan 12 salt rounds |
| Signed URL berumur pendek | Akses download dan preview | JWT terbatas per file (`type: "file-access"`), masa berlaku default `FILE_ACCESS_TOKEN_EXPIRE` = 5m |
| ID internal Telegram disembunyikan | Kebocoran lokasi penyimpanan | `File.toJSON()` menghapus `telegramChatId`, `telegramMessageId`, `telegramFileId`; `TelegramConfig.toJSON()` menghapus token terenkripsi dan chat ID |
| Rate limiting | Brute force dan penyalahgunaan | Global 100 request / 15 menit; login 20 percobaan / jam; WebDAV 5000 request / 15 menit dengan proteksi autentikasi gagal terpisah |
| Validasi input | Request cacat dan berbahaya | Skema Zod divalidasi di batas route |
| Hardening output dan header | XSS, clickjacking, MIME sniffing | Helmet dengan Content Security Policy ketat |
| Pencegahan SQL injection | Integritas database | ORM Sequelize dengan query terparameterisasi |
| Kontrol akses share | Penyalahgunaan shared link | Password bcrypt opsional, masa berlaku, dan batas download |
| Validasi secret saat boot | Salah konfigurasi | `assertSecrets()` menggagalkan startup jika secret kosong atau placeholder |

## Alur autentikasi

Teldock memakai JWT access token berumur pendek plus refresh token yang lebih panjang.

1. **Register / login** mengembalikan access token dan refresh token.
2. Access token dikirim sebagai `Authorization: Bearer <access-token>` pada route terproteksi.
3. Saat kedaluwarsa, klien memanggil `POST /api/auth/refresh` dengan refresh token untuk memperoleh
   access token baru.
4. Download dan preview file memakai signed URL terpisah yang berumur pendek.

| Token | Secret | Masa berlaku default | Environment variable |
| --- | --- | --- | --- |
| Access token | `JWT_SECRET` | 15 menit | `JWT_EXPIRE` |
| Refresh token | `REFRESH_TOKEN_SECRET` | 7 hari | `REFRESH_TOKEN_EXPIRE` |
| File access URL | `JWT_SECRET` | 5 menit | `FILE_ACCESS_TOKEN_EXPIRE` |

Payload access token memuat user ID dan email. File access token terikat pada satu `fileId` dan satu
disposition stream (`attachment` untuk download, `inline` untuk preview), sehingga URL yang bocor
tidak dapat dipakai ulang untuk file lain atau untuk disposition yang berbeda.

::: info
Login selalu menjalankan perbandingan bcrypt, bahkan saat email tidak terdaftar, agar waktu respons
tidak mengungkap apakah suatu akun terdaftar.
:::

## Rate limit

| Cakupan | Batas | Jendela | Respons saat terlampaui |
| --- | --- | --- | --- |
| API global (`/api/`) | 100 request | 15 menit | `429` dengan `{ success: false, error: "Too many requests, please try again later." }` |
| Login (`/api/auth/login`) | 20 percobaan | 1 jam | `429` dengan `{ success: false, error: "Too many login attempts, please try again after 1 hour." }` |
| WebDAV (`/webdav`) | 5000 request | 15 menit | `429` dengan `{ success: false, error: "WebDAV requests are limited" }` |
| Autentikasi WebDAV gagal | 20 percobaan | 15 menit | `429` dengan `{ success: false, error: "Too many failed WebDAV authentication attempts" }` |

Batas ini ditegakkan di `backend/src/app.js` (global dan login) serta
`backend/src/routes/webdav.routes.js` (WebDAV). WebDAV digerakkan oleh klien yang di-mount dan
mengirim banyak request per operasi, sehingga batas umumnya dibuat longgar dan dapat diatur
melalui `WEBDAV_RATE_LIMIT_MAX`. Proteksi brute-force diterapkan terpisah hanya pada percobaan
autentikasi yang **gagal** (`skipSuccessfulRequests`), sehingga klien yang terautentikasi dengan
benar tidak akan ter-throttle.

## Privasi data

- **Tidak ada byte file di disk.** Server tidak pernah menyimpan konten unggahan; konten dialirkan ke
  Telegram dan hanya metadata yang disimpan di MySQL.
- **Isolasi per pengguna.** Setiap file, folder, tag, bot token, dan konfigurasi Telegram milik satu
  pengguna, dan query selalu dibatasi oleh `userId`.
- **Tanpa analitik pihak ketiga.** Aplikasi tidak menyematkan tracker atau telemetry.
- **Open source.** Seluruh kode dapat diaudit; tidak ada panggilan jaringan tersembunyi selain
  Telegram Bot API.

## Checklist hardening operasional

Untuk siapa pun yang self-hosting Teldock:

- [ ] **Rotasi secret.** Buat nilai unik untuk `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, dan
      `ENCRYPTION_KEY`; jangan pakai placeholder contoh.
- [ ] **Jaga `ENCRYPTION_KEY` tetap stabil dan rahasia.** Backup terpisah. Mengubahnya membuat
      kredensial dan part file terenkripsi tidak bisa dibaca.
- [ ] **Batasi user database.** Beri user aplikasi hanya privilege yang dibutuhkan pada skema
      Teldock; jangan jalankan API sebagai `root`.
- [ ] **Jalankan di balik HTTPS.** Access token dan signed URL dikirim melalui header dan query
      string.
- [ ] **Setel `CORS_ORIGIN` secara ketat.** Arahkan tepat ke origin frontend publik.
- [ ] **Patch dependency.** Jalankan `npm audit` secara berkala dan terapkan pembaruan.
- [ ] **Batasi eksposur WebDAV.** WebDAV memakai HTTP Basic auth; batasi di proxy jika tidak perlu
      diakses publik.
- [ ] **Backup database.** Lihat [Deployment](/id/guide/deployment).

## Catatan hardening

Perubahan keamanan proyek dicatat di `SECURITY_CHANGES.md` pada root repositori, yang mendokumentasikan
perbaikan untuk authentication bypass, kebocoran bot token, streaming hemat memori, pencegahan stored
XSS, dan rate limiting. Ringkasan per rilis tersedia di [Changelog](/id/changelog).

::: danger
Teldock bergantung pada Telegram Bot API dan akun/channel Telegram Anda sendiri. Terms of Service
Telegram tetap berlaku, dan Telegram dapat mengubah batas atau menghapus fungsionalitas kapan saja.
Jangan jadikan Teldock sebagai penyimpanan utama yang andal: simpan backup independen untuk data
penting dan sadari bahwa ketersediaan bergantung pada layanan pihak ketiga di luar kendali Anda.
:::

## Halaman terkait

- [Deployment](/id/guide/deployment) — topologi produksi dan penyiapan Nginx/HTTPS.
- [API Reference](/id/reference/api) — header autentikasi dan penggunaan signed URL.
- [Configuration](/id/reference/configuration) — secret dan variabel terkait keamanan.
