---
title: Pengantar
description: Teldock adalah aplikasi penyimpanan cloud self-hosted yang memakai bot Telegram dan channel privat Anda sebagai backend penyimpanan.
---

# Pengantar

Teldock adalah aplikasi penyimpanan cloud open-source yang di-host sendiri dan mengubah **bot Telegram** serta **channel privat** menjadi cloud drive pribadi. File dipecah menjadi bagian-bagian berukuran tetap, opsional dienkripsi, lalu di-stream ke channel Telegram milik pengguna — sehingga server hampir tidak menyimpan data file di disk, namun tetap menyediakan antarmuka web yang familier untuk menjelajah, berbagi, dan mengunduh file.

Desainnya terinspirasi oleh [teldrive](https://github.com/teldrive/teldrive), implementasi perintis untuk hosting file berbasis Telegram.

## Ide inti

Alih-alih menyimpan byte file di VPS, Teldock menggunakan Telegram sebagai lapisan penyimpanan:

- Setiap pengguna menghubungkan **token bot miliknya sendiri** dan **channel privat miliknya sendiri** melalui halaman Settings.
- File yang diunggah dipecah menjadi beberapa bagian dan dikirim ke channel tersebut sebagai dokumen Telegram.
- Database hanya menyimpan **metadata** — nama file, referensi bagian, ukuran, dan parameter enkripsi — bukan isi file mentah.
- Saat diunduh, bagian-bagian tersebut disusun ulang sesuai permintaan lalu di-stream kembali ke browser.

## Mengapa desain ini

| Tujuan | Cara Teldock mencapainya |
| --- | --- |
| Penyimpanan server minimal | Hanya database dan cache opsional yang berada di disk Anda. |
| Beban bandwidth dialihkan | Transfer file ditangani oleh infrastruktur dan CDN Telegram. |
| Isolasi antar pengguna | Setiap akun menyimpan konten di channel-nya sendiri dengan kredensial sendiri. |
| Dukungan file besar | Chunking menghilangkan batas ukuran file praktis dari Bot API. |

## Cara kerjanya

1. **Menghubungkan kredensial** — pengguna mendaftar akun, membuat bot lewat [@BotFather](https://t.me/BotFather), membuat channel privat, dan menambahkan bot sebagai admin. Token bot dan ID channel disimpan dalam keadaan terenkripsi.
2. **Unggah dan pemecahan** — saat upload, stream yang masuk dipecah menjadi bagian berukuran sekitar 18 MB (`TG_PART_SIZE`), sehingga penggunaan memori puncak hanya sekitar satu bagian, bukan seluruh file.
3. **Stream ke Telegram** — setiap bagian diunggah ke channel pengguna sebagai dokumen Telegram terpisah, didistribusikan melalui multi-bot pool (round-robin) untuk throughput yang lebih tinggi.
4. **Hanya menyimpan metadata** — MySQL/MariaDB mencatat file, referensi bagian, ukuran, checksum, dan parameter enkripsi. Byte file tidak pernah ditulis ke disk server.
5. **Unduh dan penyusunan ulang** — bagian-bagian diambil dan disatukan kembali sesuai urutan, dengan dukungan HTTP `Range` agar klien dapat melakukan seek, resume, dan streaming.

::: info Ukuran bagian dan batas unggahan
Ukuran bagian default adalah `18874368` byte (sekitar 18 MB), cukup aman di bawah batas dokumen Telegram Bot API. Ukuran unggahan maksimum diatur oleh `MAX_UPLOAD_BYTES` (default 2 GB).
:::

## Untuk siapa

- **Pengguna self-hosted** yang ingin cloud drive pribadi tanpa membayar object storage berkapasitas besar.
- **Penggemar homelab** yang sudah menjalankan VPS dan MySQL serta ingin bereksperimen dengan penyimpanan berbasis Telegram.
- **Keluarga atau kelompok kecil** yang berbagi satu instance — setiap orang menghubungkan bot dan channel masing-masing, sehingga file tetap terisolasi per akun.

## Penafian penting

::: warning Baca sebelum menggunakan
Teldock adalah **proyek edukasi open-source non-komersial**. Menggunakan Telegram Bot API sebagai penyimpanan cloud serbaguna **bukan** penggunaan yang dimaksudkan oleh platform Telegram dan dapat melanggar [Ketentuan Layanan](https://telegram.org/tos) Telegram.

Simpan hanya data yang Anda miliki atau berhak Anda simpan, hindari penyimpanan massal atau komersial, dan sadari bahwa Telegram dapat membatasi laju, menangguhkan, atau menghapus akun serta file yang disalahgunakan. Selalu simpan cadangan independen untuk data penting — **jangan jadikan Teldock sebagai penyimpanan utama yang andal**. Penulis tidak bertanggung jawab atas kerugian yang timbul dari penggunaan perangkat lunak ini.
:::

## Langkah selanjutnya

- [Instalasi](/id/guide/installation) — menyiapkan backend dan frontend.
- [Fitur](/id/guide/features) — ringkasan seluruh fitur.
- [Arsitektur](/id/guide/architecture) — bagaimana lapisan-lapisan saling terhubung.
