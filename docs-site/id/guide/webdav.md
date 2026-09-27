---
title: WebDAV & Rclone
description: Memasang Teldock sebagai drive OS melalui endpoint WebDAV yang kompatibel dengan Rclone menggunakan email dan password akun Teldock Anda.
---

# WebDAV & Rclone

Teldock menyediakan endpoint WebDAV minimal di `/webdav` sehingga Anda dapat memasang
penyimpanan sebagai drive di sistem operasi, atau menyinkronkannya dengan
[Rclone](https://rclone.org/) dan perkakas lain yang kompatibel WebDAV.

::: info
Endpoint ini diimplementasikan untuk kompatibilitas Rclone. Ia mendukung verb inti yang
diperlukan untuk listing, baca, tulis, dan pengelolaan file, tetapi bukan server WebDAV
lengkap — baca [Batasan](#batasan) sebelum mengandalkannya untuk sinkronisasi berat.
:::

## Autentikasi

WebDAV memakai **HTTP Basic authentication** dengan kredensial akun Teldock Anda:

- **Username:** alamat email yang Anda pakai saat mendaftar.
- **Password:** password akun Teldock Anda.

Kredensial diverifikasi terhadap hash password bcrypt yang sama dengan login web. Token bot
tidak terlibat dalam autentikasi WebDAV. Permintaan tanpa autentikasi menerima `401` dengan
challenge `WWW-Authenticate: Basic`.

## Method yang didukung

| Method | Perilaku |
| ------ | -------- |
| `OPTIONS` | Mengumumkan kemampuan: `DAV: 1, 2` dan verb yang diizinkan |
| `PROPFIND` | Menampilkan daftar file dan folder, mengikuti header `Depth` |
| `GET` | Mengunduh file, dengan dukungan HTTP `Range` |
| `HEAD` | Mengembalikan ukuran dan content type tanpa body |
| `PUT` | Mengunggah file (streamed, tidak di-buffer di memori) |
| `DELETE` | Menghapus file (soft delete) atau folder |
| `MKCOL` | Membuat folder |
| `MOVE` | Mengganti nama file |

Header `Allow` yang dikembalikan `OPTIONS` adalah:

```
OPTIONS, GET, HEAD, PUT, DELETE, PROPFIND, MKCOL, MOVE
```

## Konfigurasi Rclone

Cara termudah mengonfigurasi Rclone adalah wizard interaktif:

```bash
rclone config
```

Pilih **n** untuk remote baru, beri nama (misalnya `teldock`), lalu pilih **WebDAV** sebagai
tipe penyimpanan. Jawab prompt berikut:

```ini
[teldock]
type = webdav
url = http://your-host:3001/webdav
vendor = other
user = you@example.com
pass = your-teldock-password
```

::: tip
`rclone config` menyamarkan (obscure) password saat menulis file konfigurasi. Jika Anda
mengedit file secara manual, jalankan `rclone obscure 'your-password'` dan tempelkan hasilnya
ke `pass`.
:::

Arahkan `url` ke host dan port tempat backend mendengarkan (default `3001`), diikuti
`/webdav`. Gunakan `https://` dan reverse proxy di produksi — Basic auth mengirim kredensial
pada setiap permintaan.

## Contoh perintah

```bash
# Tampilkan folder tingkat atas
rclone lsd teldock:

# Tampilkan semua secara rekursif
rclone ls teldock:

# Unggah file ke root
rclone copy ./report.pdf teldock:

# Unduh file
rclone copy teldock:report.pdf ./downloads/

# Pasang sebagai drive (Linux/macOS, memerlukan FUSE)
mkdir -p ~/teldock
rclone mount teldock: ~/teldock --daemon
```

Di Windows, pasang dengan WinFsp terpasang:

```powershell
rclone mount teldock: T: --vfs-cache-mode writes
```

## Batasan

Berikut perilaku yang dapat Anda verifikasi pada implementasi rute WebDAV:

- **Rate limit.** Router `/webdav` mengizinkan **5000 permintaan per 15 menit** (dapat diatur
  melalui `WEBDAV_RATE_LIMIT_MAX`), cukup longgar untuk klien yang di-mount. Proteksi
  brute-force ditangani terpisah: hanya percobaan autentikasi yang **gagal** dibatasi 20 per
  15 menit, sehingga mount yang dikonfigurasi dengan benar tidak akan ter-throttle. Jika klien
  Anda tetap menerima `429`, pastikan kredensial benar lalu naikkan `WEBDAV_RATE_LIMIT_MAX`.
- **Allowlist content type saat unggah.** `PUT` hanya menerima sekumpulan tipe MIME tetap
  (`application/pdf`, `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `video/mp4`,
  `video/webm`, `audio/mpeg`, `audio/wav`, `text/plain`, `application/zip`,
  `application/gzip`). Tipe lain ditolak dengan `415 Unsupported file type`.
- **Ukuran unggahan.** `PUT` dibatasi `MAX_UPLOAD_BYTES` (default 2 GB) dan mengembalikan `413`
  bila terlampaui.
- **Unggahan tidak dienkripsi.** Penulisan via WebDAV disimpan tanpa enkripsi per file,
  berbeda dari unggahan lewat UI web.
- **Folder dialamatkan berdasarkan nama.** Sebuah path diselesaikan dari nama segmen
  terakhir, sehingga dua folder dengan nama sama menjadi ambigu.
- **`MKCOL` hanya membuat folder di root.** Pembuatan folder bersarang tidak didukung lewat
  WebDAV.
- **`MOVE` hanya mengganti nama file.** Ia membaca segmen terakhir header `Destination` dan
  mengganti nama file; ia tidak memindahkan file antar folder atau mengganti nama folder.
- **Tidak ada `LOCK` atau `COPY`.** Locking dan server-side copy WebDAV tidak
  diimplementasikan, sehingga sebagian klien akan beralih ke unduh-lalu-unggah.
- **Penghapusan bersifat nyata.** `DELETE` pada file melakukan soft delete dan menghapus pesan
  Telegram-nya; `DELETE` pada folder menghancurkan folder tersebut.

## Langkah selanjutnya

- [Multi-Bot Pool](/id/guide/multibot) — sebarkan transfer ke beberapa bot.
- [Troubleshooting & FAQ](/id/guide/troubleshooting) — masalah autentikasi dan koneksi WebDAV.
- [Referensi API](/id/reference/api) — REST API di samping WebDAV.
