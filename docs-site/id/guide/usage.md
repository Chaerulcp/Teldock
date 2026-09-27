---
title: Menggunakan Teldock
description: Panduan harian Teldock — mengunggah, mengunduh, pratinjau, mengelola file, riwayat versi, soft delete, dan statistik penyimpanan.
---

# Menggunakan Teldock

Halaman ini membahas penggunaan sehari-hari aplikasi web setelah akun Anda dibuat dan bot
serta channel Telegram Anda terhubung. Jika belum, mulai dari
[Menghubungkan Telegram](/id/guide/telegram-setup) terlebih dahulu.

## Masuk ke akun

Teldock menggunakan akun email dan password. Frontend menyediakan tiga rute publik:

- `/register` — membuat akun.
- `/login` — masuk.
- `/s/:token` — membuka tautan file yang dibagikan (bekerja tanpa login). Lihat [Berbagi File](/id/guide/sharing).

Setelah berhasil login Anda diarahkan ke `/dashboard`. Access token berumur pendek dan
diperbarui otomatis di latar belakang, sehingga Anda tetap masuk sampai keluar sendiri atau
refresh token kedaluwarsa. Tombol keluar ada di bagian bawah sidebar.

::: tip
Setiap pengguna menghubungkan bot dan channel miliknya sendiri. File Anda hanya disimpan di
channel yang Anda kendalikan — tidak ada penyimpanan global bersama.
:::

## Sekilas tampilan dashboard

Tampilan utama di `/dashboard` terdiri dari:

- **Sidebar** dengan navigasi ke All Files, Favorites, Browse (tampilan mobile), Shared Links,
  Storage Stats, dan Settings.
- Daftar **tag** dan **smart folder** Anda di bawah navigasi setelah dibuat.
- **Widget penyimpanan** yang menampilkan pemakaian, plus kartu peringatan bila Telegram
  belum terhubung.
- **Top bar** berisi judul tampilan, kolom pencarian dalam folder, tombol New folder, dan
  pengalih tampilan grid/list.
- **Breadcrumb** yang menunjukkan posisi Anda di dalam hierarki folder.

## Mengunggah file

Unggahan dimulai dari drop zone di bagian atas daftar file. Anda dapat menyeret file ke
sana atau mengeklik **browse** untuk membuka file picker. Beberapa file sekaligus didukung,
dan semuanya diunggah ke folder yang sedang Anda buka (ditampilkan sebagai "into …" pada drop
zone).

Setiap unggahan dapat dienkripsi dengan mengaktifkan checkbox **Encrypt** sebelum memilih
file. Enkripsi diterapkan per file dengan AES-256-CTR dan salt acak, sehingga file terenkripsi
tidak dapat dipratinjau di browser — harus diunduh.

### Cara kerja chunking

File besar dipotong otomatis. Backend membaca unggahan sebagai stream dan mengirim bagian
berukuran `TG_PART_SIZE` (default `18874368` byte, sekitar 18 MB) sehingga tidak pernah
menyimpan seluruh file di memori. Setiap bagian diunggah ke channel Telegram Anda sebagai
dokumen terpisah; file satu bagian mempertahankan nama aslinya, sedangkan file multi-bagian
diberi akhiran `.partN`. Di UI, file yang dipecah menampilkan badge `N×` sesuai jumlah
bagiannya.

Batas unggahan maksimum dikendalikan oleh `MAX_UPLOAD_BYTES` (default `2147483648` byte, atau
2 GB). File yang melebihi batas ditolak dengan `413 File too large`.

### Progres unggahan

Progres dipantau di **Transfer Center**, panel kecil di kanan bawah jendela. Panel ini
menampilkan setiap transfer dengan progress bar, spinner saat mengunggah, tanda centang bila
selesai, dan pesan error bila gagal. Panel dapat diminimalkan atau dibersihkan; daftar file
dimuat ulang otomatis saat transfer selesai.

::: info
Jika file dengan nama yang sama sudah ada di folder yang sama, unggahan akan menggantinya dan
isi sebelumnya disimpan sebagai versi. Lihat [Riwayat versi](#riwayat-versi).
:::

## Mengunduh dan pratinjau

Unduhan dan pratinjau diotorisasi oleh **signed URL berumur pendek**. Klien memanggil endpoint
untuk membuat URL yang dibatasi pada satu file dan satu disposition, lalu membuka URL
tersebut. Tanda tangannya kedaluwarsa setelah `FILE_ACCESS_TOKEN_EXPIRE` (default 5 menit).

- **Unduh** memakai `Content-Disposition: attachment` dan mengalirkan file dengan dukungan
  HTTP `Range`, sehingga unduhan dapat dilanjutkan dan di-seek oleh browser atau download
  manager.
- **Pratinjau** memakai `Content-Disposition: inline` dengan dukungan `Range` yang sama,
  sehingga video dan audio dapat di-seek tanpa mengunduh seluruh file.

Mengeklik file akan membuka **file viewer** di browser bila tipenya dapat dipratinjau. Viewer
mendukung:

| Tipe | Cara ditampilkan |
| ---- | ---------------- |
| Gambar | Pratinjau `<img>` inline |
| Video | Pemutar HTML5 dengan kontrol dan auto-play |
| Audio | Pemutar audio HTML5 |
| PDF | Viewer PDF tersemat |

Tipe lain akan diunduh, bukan dipratinjau. File terenkripsi tidak pernah dipratinjau — viewer
menampilkan pesan dan menawarkan unduhan.

::: tip
Memilih beberapa file lalu memilih Download akan membuka satu signed URL per file. Unduhan
satu file tetap bisa dipakai setelah Anda menutup tab karena signed URL bersifat mandiri
sampai kedaluwarsa.
:::

## Mengelola file

### Folder

Folder bersifat hierarkis. Buka folder dengan mengekliknya, dan gunakan breadcrumb untuk
kembali ke folder induk mana pun atau ke Home. Tombol **New folder** di top bar membuat folder
di dalam folder saat ini. Menghapus folder memindahkan file di dalamnya kembali ke root,
bukan menghapusnya.

### Ganti nama, pindah, dan aksi massal

- **Ganti nama** file dari menu aksi pada baris/kartu. Nama dibersihkan (sanitized) sebelum
  disimpan.
- **Pindah** satu atau banyak file dengan memilihnya lalu memilih Move dan menentukan folder
  tujuan (atau Home/root).
- **Aksi massal** berlaku untuk semua yang dipilih: download, move, dan delete. Gunakan
  checkbox pemilihan dan **Select all**, lalu toolbar massal yang muncul di bawah header.

### Favorit

Tandai file dengan bintang untuk menambahkannya ke tampilan **Favorites** di sidebar. Favorit
adalah daftar datar dari semua folder.

### Tag

Tag adalah label buatan pengguna dengan warna. Buka tag picker pada file untuk menetapkan tag
yang ada atau membuat tag baru langsung di sana. Mengeklik tag di mana pun akan memfilter
dashboard ke file dengan tag tersebut, dan sidebar menampilkan daftar tag beserta jumlah
filenya.

### Pencarian dan smart folder

- Kolom pencarian di top bar memfilter file di folder saat ini seiring Anda mengetik.
- Pencarian global di semua file tersedia melalui endpoint search dan mencocokkan nama asli
  maupun nama tampilan.
- **Smart folder** adalah filter tersimpan. Sidebar menampilkan masing-masing sebagai
  pintasan yang membuka kembali dashboard dengan kriteria tersimpan (saat ini favorit dan
  tag).

## Riwayat versi

Teldock otomatis membuat snapshot file saat Anda menimpanya — yaitu ketika Anda mengunggah
file yang namanya sama dengan file yang sudah ada di folder yang sama. Keadaan sebelumnya
disimpan sebagai versi sebelum bagian baru menggantikannya.

Untuk mengelola versi:

1. Buka **version history** dari menu aksi file.
2. Modal menampilkan setiap versi dengan nomor, nama file, ukuran, dan waktunya.
3. Pilih **Restore** untuk mengembalikan. Teldock lebih dulu menyimpan keadaan saat ini
   sebagai versi baru, lalu menulis ulang file dari snapshot versi yang dipilih.

Maksimal 10 versi disimpan per file; versi lama dihapus otomatis.

::: info
Riwayat versi menyimpan referensi part dan metadata. Ini bekerja untuk file satu pesan, yang
dipecah, maupun yang terenkripsi.
:::

## Menghapus dan memulihkan file

Menghapus file menandainya sebagai soft-deleted di database (`isDeleted` dan `deletedAt`) dan
mengurangi byte dari penghitung pemakaian penyimpanan. Secara default, pesan Telegram yang
bersesuaian juga dihapus saat itu.

Karena part Telegram dihapus secara default, pemulihan hanya mungkin selama part tersebut
masih ada. Endpoint delete menerima `?deleteFromTelegram=false` untuk melakukan soft delete
pada metadata sambil membiarkan pesan Telegram tetap ada — pilihan yang lebih aman bila Anda
ingin punya opsi pemulihan. Listing mendukung `includeDeleted=true` untuk audit.

::: warning
Belum ada layar recycle bin pada versi ini. Anggap delete biasa sebagai permanen, dan simpan
backup mandiri untuk data penting.
:::

## Statistik penyimpanan

Halaman **Storage Stats** di `/dashboard/stats` merangkum akun Anda:

- Total penyimpanan terpakai, jumlah file, jumlah folder, dan jumlah file terenkripsi.
- Rincian byte dan jumlah file per kategori (gambar, video, audio, dokumen, arsip, lainnya).
- Bagian **duplicate files** yang mengelompokkan file berdasarkan checksum, menampilkan ruang
  terbuang, dan memungkinkan Anda menghapus salinan berlebih sambil mempertahankan aslinya.

## Tampilan mobile

Tata letak khusus mobile tersedia di `/dashboard/mobile`, tertaut sebagai **Browse** di
sidebar. Tampilan ini menyediakan header besar yang ramah sentuh, daftar folder dan file,
kolom pencarian, serta navigasi bawah untuk Home, Upload, Browse, dan Profile.

## Endpoint API terkait

UI adalah klien dari REST API. Endpoint di balik fitur-fitur ini didokumentasikan di
[Referensi API](/id/reference/api); yang paling relevan adalah:

| Method | Endpoint | Kegunaan |
| ------ | -------- | -------- |
| `POST` | `/api/files/upload` | Unggah multipart streamed (chunked) |
| `GET` | `/api/files` | Daftar file, dapat difilter per folder, favorit, atau tag |
| `GET` | `/api/files/search?q=` | Cari file berdasarkan nama |
| `POST` | `/api/files/bulk` | Move atau delete massal |
| `POST` | `/api/files/:id/download-url` | Buat signed download URL |
| `POST` | `/api/files/:id/preview-url` | Buat signed preview URL |
| `GET` | `/api/files/:id/download` | Alirkan unduhan (mendukung `Range`) |
| `GET` | `/api/files/:id/preview` | Alirkan pratinjau inline (mendukung `Range`) |
| `PATCH` | `/api/files/:id` | Ganti nama, pindah, atau tandai favorit |
| `PUT` | `/api/files/:id/tags` | Tetapkan tag file |
| `DELETE` | `/api/files/:id` | Soft delete file |
| `GET` | `/api/files/:id/versions` | Daftar riwayat versi |
| `POST` | `/api/files/:id/revert/:versionId` | Kembalikan ke versi tertentu |
| `GET` | `/api/stats/storage` | Statistik pemakaian penyimpanan |
| `GET` | `/api/stats/duplicates` | Statistik file duplikat |

## Langkah selanjutnya

- [Berbagi File](/id/guide/sharing) — buat dan kelola tautan publik.
- [Multi-Bot Pool](/id/guide/multibot) — tingkatkan throughput dengan lebih banyak bot.
- [WebDAV & Rclone](/id/guide/webdav) — pasang Teldock sebagai drive OS.
