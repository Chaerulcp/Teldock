---
title: Changelog
description: Perubahan penting pada Teldock, mengikuti Keep a Changelog dan Semantic Versioning.
---

# Changelog

Semua perubahan penting pada proyek ini didokumentasikan di sini. Formatnya mengikuti
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) dan proyek ini mematuhi
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Belum ada.

## [1.1.0]

### Added

- **Halaman share publik.** Penerima tautan berbagi kini mendarat di halaman sungguhan pada
  `/s/:token`, bukan dialihkan ke landing page. Halaman ini menangani permintaan password,
  menampilkan metadata file, dan mengunduh file tanpa perlu akun.
- **Pratinjau video.** `POST /api/previews/generate` menerima `video/*` selain gambar dan
  mengembalikan thumbnail JPEG 640x360 yang diambil pada detik pertama, beserta durasi video bila
  dapat dibaca. Memerlukan FFmpeg; video yang melebihi batas pratinjau 25 MB ditolak dengan `413`.
- **Situs dokumentasi.** Situs dokumentasi bilingual (Inggris / Bahasa Indonesia) lengkap yang
  dibangun dengan VitePress, dipublikasikan ke GitHub Pages dan di-deploy otomatis pada setiap push
  ke `main`.
- **Suite test end-to-end.** Suite Playwright mandiri di folder `e2e/` yang mencakup alur share
  publik, termasuk jalur password salah.
- **Suite test frontend.** Vitest dan Testing Library, mencakup halaman share dan klien API share
  publik.

### Changed

- `BCRYPT_ROUNDS` kini dibaca dari environment, tidak lagi dikunci di kode. Nilai di luar rentang
  aman 4-15 akan kembali ke `12` disertai peringatan.
- Rate limiting WebDAV dipecah menjadi batas umum yang longgar (5000 permintaan per 15 menit, dapat
  diatur via `WEBDAV_RATE_LIMIT_MAX`) dan batas terpisah 20 per 15 menit untuk percobaan
  autentikasi yang **gagal**, sehingga klien yang di-mount tidak lagi ter-throttle.
- Suite test backend tumbuh dari 36 menjadi 114 test, mencakup schema validasi, layanan JWT,
  middleware, dan helper nama file.
- Menghapus dependency `form-data` dan `multer` yang tidak terpakai beserta mesin upload multer yang
  sudah mati.

### Fixed

- **Tautan berbagi tidak dapat dibuat dua kali dalam detik yang sama.** Token share tidak memiliki
  nonce unik, sehingga dua tautan untuk file yang sama yang dibuat dalam satu detik menghasilkan JWT
  identik dan permintaan kedua gagal dengan `500`. Token kini menyertakan `jti` acak.
- `CORS` tidak mengizinkan `PATCH`, sehingga rename, move, dan favorite file terblokir dari browser.
- `sanitizeFilename` tidak menetralkan pemisah path atau token direktori polos, padahal
  didokumentasikan sebagai pencegah masalah keamanan.
- `FRONTEND_URL` tidak ada di `.env.example`, sehingga menghasilkan tautan share relatif.
- Dokumentasi menjelaskan fitur yang tidak diimplementasikan kode (antrean pratinjau berbasis Redis,
  thumbnail video FFmpeg, dan setelan `TELEGRAM_API_URL` / `TELEGRAM_API_SERVER_URL`).

## [1.0.0]

Rilis publik perdana Teldock, aplikasi cloud storage self-hosted yang menggunakan Telegram Bot API
sebagai backend penyimpanannya.

### Added

- **Chunked uploads.** File dipecah menjadi part berukuran terbatas (~18 MB, dapat dikonfigurasi via
  `TG_PART_SIZE`) dan di-streaming ke Telegram tanpa menampung seluruh file di memori.
- **Streaming downloads.** Part disusun ulang sesuai urutan dengan penanganan backpressure dan
  permintaan HTTP `Range` yang dapat dilanjutkan.
- **Multi-bot pool.** Pengguna dapat mendaftarkan beberapa bot token, yang didistribusikan secara
  round-robin untuk throughput lebih tinggi.
- **Version history.** Menimpa file secara otomatis menyimpan snapshot konten sebelumnya, dan versi
  mana pun dapat dipulihkan, termasuk file chunked dan terenkripsi.
- **Soft delete.** File yang dihapus dapat dipulihkan, dengan akuntansi pemakaian storage yang tetap
  konsisten.
- **Folders.** Folder hierarkis dengan navigasi berbasis path serta operasi rename/delete.
- **Search, favorites, tags, dan smart folders.** Pencarian nama file, flag favorit, tag buatan
  pengguna, dan filter tersimpan berupa "smart folder".
- **File previews.** Preview gambar di browser yang dibuat dalam beberapa ukuran.
- **Sharing.** Public link dengan opsi kedaluwarsa, batas download, dan proteksi password.
- **WebDAV endpoint.** Mount `/webdav` yang kompatibel dengan Rclone dan mendukung `OPTIONS`,
  `PROPFIND`, `GET`, `HEAD`, `PUT`, `DELETE`, `MKCOL`, dan `MOVE`.
- **JWT authentication.** Access token berumur pendek dengan rotasi refresh token.
- **Encryption.** Enkripsi file per-file yang bersifat opt-in dan enkripsi AES-256-CBC untuk
  kredensial bot saat disimpan.

### Security

- Bot token dienkripsi saat disimpan dan tidak pernah dikembalikan ke klien; identifier internal
  Telegram dihapus dari response API.
- Login memakai perbandingan bcrypt dengan waktu konstan dan tidak mengungkap apakah suatu akun
  terdaftar.
- URL bertanda tangan yang terbatas per file mengotorisasi download dan preview.
- Rate limiting global dan login, validasi input yang ketat, serta Content Security Policy Helmet
  aktif secara default.
- Secret divalidasi saat boot; API menolak start dengan nilai yang kosong atau placeholder.

### Documentation

- Menambahkan dokumentasi deployment, security, API, database schema, project structure, contributing,
  dan changelog, tersedia dalam Bahasa Inggris dan Bahasa Indonesia.

## Halaman terkait

- [Contributing](/id/contributing) — bagaimana perubahan sampai ke sebuah rilis.
- [Deployment](/id/guide/deployment) — menjalankan versi rilis di produksi.
- [Security](/id/guide/security) — model keamanan di balik hardening yang tercantum di atas.
