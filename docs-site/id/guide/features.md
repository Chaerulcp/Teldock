---
title: Fitur
description: Ringkasan fitur Teldock yang dikelompokkan menjadi fungsionalitas inti, pengalaman pengguna, serta keamanan dan enkripsi.
---

# Fitur

Teldock memadukan penyimpanan berbasis Telegram dengan pengalaman web yang modern. Fitur-fiturnya dikelompokkan menjadi tiga area: mesin penyimpanan, alur kerja pengguna, dan lapisan keamanan.

## Fungsionalitas inti

Mesin penyimpanan dibangun di atas streaming dan chunking. File dipecah menjadi bagian berukuran tetap, diunggah melalui multi-bot pool, lalu disatukan kembali saat dibutuhkan — sehingga penggunaan memori tetap rendah, file besar didukung, dan unduhan dapat dilanjutkan.

| Fitur | Deskripsi |
| --- | --- |
| Chunked uploads | File dipecah menjadi bagian berukuran tetap (~18 MB) dan diunggah melalui multi-bot pool. |
| Streaming downloads | Bagian-bagian disatukan kembali dengan penanganan backpressure dan permintaan `Range` yang dapat dilanjutkan. |
| Multi-bot pool | Daftarkan beberapa token bot per pengguna untuk throughput lebih tinggi melalui distribusi round-robin. |
| Version history | Snapshot versi otomatis saat file ditimpa, dengan kemampuan kembali ke versi sebelumnya. |
| Soft delete | File yang dihapus masih dapat dipulihkan dan penghitungan penggunaan penyimpanan tetap konsisten. |

## Pengalaman pengguna

Penggunaan sehari-hari dilakukan melalui antarmuka web: rapikan file ke dalam folder, temukan dengan cepat lewat pencarian, tag, favorit, dan filter tersimpan, pratinjau gambar langsung di browser, bagikan melalui tautan publik, atau pasang seluruh drive melalui WebDAV.

| Fitur | Deskripsi |
| --- | --- |
| Struktur folder | Folder hierarkis dengan navigasi berbasis path. |
| Pencarian dan filter | Pencarian nama file, favorit, tag, dan filter "smart folder" tersimpan. |
| Pratinjau file | Pratinjau gambar di browser dalam beberapa ukuran (dioptimalkan WebP), plus thumbnail video (frame JPEG 640x360 pada detik ke-1 beserta durasinya bila tersedia). |
| Berbagi | Tautan publik dengan masa kedaluwarsa, batas unduhan, dan perlindungan kata sandi opsional. |
| WebDAV mount | Pasang Teldock sebagai drive OS melalui endpoint `/webdav` yang kompatibel dengan Rclone. |

## Keamanan dan enkripsi

Akses ke byte file selalu melalui API. Stream diotorisasi dengan signed URL berumur pendek, kredensial disimpan terenkripsi, dan setiap permintaan divalidasi serta dibatasi lajunya di batas API.

| Fitur | Deskripsi |
| --- | --- |
| Signed file URLs | Signed URL berumur pendek dan terikat pada satu file untuk mengotorisasi stream pratinjau dan unduhan. |
| Enkripsi AES-256-CTR | Enkripsi per file yang bersifat opsional dengan salt acak dan IV per bagian. |
| Kredensial terenkripsi | Token bot disimpan terenkripsi dan tidak pernah dikembalikan ke klien. |
| Autentikasi JWT | Access token berumur pendek dengan rotasi refresh token. |
| Validasi input | Body permintaan divalidasi di batas API menggunakan schema validator (Zod). |
| Rate limiting | Batas global untuk API ditambah batas lebih ketat pada endpoint login. |

::: tip Enkripsi bersifat per file
AES-256-CTR bersifat opsional dan ditentukan saat upload. File terenkripsi tetap dapat diunduh seperti biasa, tetapi pratinjau inline dinonaktifkan untuk file tersebut — unduh filenya sebagai gantinya.
:::

## Pelajari lebih lanjut

- [Arsitektur](/id/guide/architecture) — lapisan-lapisan di balik fitur-fitur ini.
- [Keamanan](/id/guide/security) — model ancaman lengkap dan detail pengerasan keamanan.
- [Berbagi File](/id/guide/sharing) — cara kerja tautan publik, kedaluwarsa, dan kata sandi.
