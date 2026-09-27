---
title: Multi-Bot Pool
description: Menambahkan beberapa bot Telegram ke satu akun Teldock untuk menyebar unggahan dan unduhan serta meningkatkan throughput dan ketahanan.
---

# Multi-Bot Pool

Teldock mengunggah dan mengunduh file melalui bot Telegram. Telegram Bot API menerapkan
rate limit per bot, sehingga satu bot saja menjadi hambatan pada transfer besar atau
bersamaan. **Bot pool** memungkinkan Anda mendaftarkan beberapa token bot pada satu akun dan
menyebar pekerjaan ke semuanya.

## Mengapa memakai pool

- **Throughput lebih tinggi** — setiap bagian file dikirim oleh bot berikutnya dalam rotasi,
  sehingga rate limit per bot dibagi ke seluruh pool.
- **Lebih tahan gangguan** — saat satu bot mengalami error yang dapat dicoba ulang, percobaan
  berikutnya memakai bot lain dari pool, sehingga satu bot yang sedang di-rate-limit atau
  gagal sementara tidak menghentikan transfer.
- **Jumlah yang praktis** — beberapa bot (UI Settings menyarankan 5–8) adalah keseimbangan
  yang baik untuk sebagian besar akun.

::: info
Pool bersifat per pengguna. Bot yang Anda tambahkan hanya dipakai untuk akun Anda dan hanya
menulis ke channel penyimpanan Anda sendiri.
:::

## Menambahkan bot di Settings

Buka **Settings** dan pilih tab **Bot Pool**.

1. Buat bot dengan [@BotFather](https://t.me/BotFather) dan salin tokennya.
2. Tambahkan bot sebagai **admin** channel penyimpanan Anda (channel yang sama yang Anda
   hubungkan di Settings → Telegram Integration).
3. Tempelkan token ke kolom Bot Pool dan klik **Add Bot**.

Setiap token divalidasi sebelum disimpan: backend memanggil endpoint `getMe` Telegram dan
menolak token bila Telegram tidak mengenalinya. Bot yang sudah ada di pool juga ditolak
dengan `This bot is already in your pool`. Token yang tervalidasi dienkripsi saat disimpan
dan tidak pernah dikembalikan ke klien.

Daftar pool menampilkan username setiap bot, status aktifnya, dan kapan terakhir dipakai.
Gunakan tombol remove pada baris untuk mengeluarkan bot dari pool.

::: warning
Bot yang bukan admin channel Anda tetap akan tervalidasi (tokennya asli) tetapi unggahan akan
gagal saat Telegram menolak pengiriman. Tambahkan setiap bot pool ke channel.
:::

## Cara distribusinya bekerja

Pemilihan token bersifat **round-robin per pengguna**. Untuk setiap bagian yang perlu diunggah
atau diunduh, layanan meminta token berikutnya, dan cursor di memori bergerak maju sehingga
bagian berurutan memakai bot berurutan. Dengan beberapa bot dan file yang dipecah, bagian
tersebar merata ke seluruh pool.

Pool diselesaikan dalam urutan prioritas:

1. Bot aktif milik pengguna di pool.
2. Token bot dari konfigurasi Telegram pengguna, bila pool kosong.
3. Hanya di lingkungan non-production, nilai `TELEGRAM_BOT_TOKEN` global sebagai kemudahan
   pengembangan.

Jika tidak ada satu pun, unggahan gagal dengan pesan yang mengarahkan Anda ke Settings.

### Apa yang terjadi saat bot gagal

Percobaan ulang unggahan ditangani per bagian. Percobaan yang gagal dicoba ulang hingga 3
kali, dan setiap percobaan ulang memilih token berikutnya dari pool — sehingga bot yang gagal
dilewati pada percobaan berikutnya, bukan diulang sendirian.

Jeda antar percobaan menghormati Telegram:

- Jika Telegram mengembalikan nilai `retry_after` (khas pada HTTP 429), jeda tersebut dipakai
  persis.
- Jika tidak, backoff eksponensial diterapkan, mulai dari 1,5 detik dan berlipat ganda setiap
  percobaan.

Error dianggap dapat dicoba ulang bila tidak ada respons Telegram sama sekali (misalnya error
jaringan), bila kode error `429`, atau bila `500` atau lebih besar. Error yang tidak dapat
dicoba ulang seperti `400` langsung menghentikan loop dan memunculkan kegagalan. Lihat
[Troubleshooting](/id/guide/troubleshooting) untuk menangani 429 yang berkepanjangan.

## Catatan penyimpanan

Semua bot dalam pool pengguna menulis ke channel pengguna tersebut. Channel penyimpanan
diselesaikan dari konfigurasi Telegram pengguna, bukan dari bot, jadi menambah bot tidak
mengubah lokasi penyimpanan — hanya mengubah bot mana yang melakukan setiap operasi. Karena
bot mana pun di pool dapat diminta membaca atau menghapus bagian, **setiap bot harus menjadi
admin channel**.

## Endpoint API

Tab Bot Pool adalah klien dari endpoint `/api/bots`:

| Method | Endpoint | Auth | Kegunaan |
| ------ | -------- | ---- | -------- |
| `GET` | `/api/bots` | Bearer | Daftar pool bot pengguna (tanpa token mentah) |
| `POST` | `/api/bots` | Bearer | Validasi dan tambahkan token bot (`{ "token": "..." }`) |
| `DELETE` | `/api/bots/:id` | Bearer | Hapus bot dari pool |

## Langkah selanjutnya

- [WebDAV & Rclone](/id/guide/webdav) — pasang penyimpanan yang sama sebagai drive.
- [Troubleshooting & FAQ](/id/guide/troubleshooting) — rate limit dan kegagalan unggahan.
- [Referensi API](/id/reference/api) — detail request dan response.
