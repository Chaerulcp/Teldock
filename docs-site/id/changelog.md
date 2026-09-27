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

### Changed

- Belum ada.

### Fixed

- Belum ada.

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
