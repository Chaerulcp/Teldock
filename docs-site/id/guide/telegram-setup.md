---
title: Menghubungkan Telegram
description: Membuat bot Telegram, menyiapkan channel penyimpanan privat, dan menghubungkannya ke akun Teldock Anda.
---

# Menghubungkan Telegram

Teldock menyimpan data file di Telegram. Sifatnya **multi-user**: setiap akun menghubungkan token bot dan channel penyimpanan privatnya sendiri melalui antarmuka web, di **Settings → Telegram Integration**. Pengguna tidak berbagi satu bot, dan kredensial tidak pernah dikonfigurasi secara global.

::: info Nilai Telegram pada .env hanya untuk pengembangan lokal
`TELEGRAM_BOT_TOKEN` dan `TELEGRAM_STORAGE_CHAT_ID` di `backend/.env` hanya disediakan untuk kemudahan pengembangan dan pengujian lokal. Pada penggunaan multi-user yang sebenarnya, setiap akun menghubungkan kredensialnya sendiri di Settings. Nilai `.env` tersebut bukan fallback produksi bersama. Lihat [Konfigurasi](/id/guide/configuration).
:::

## 1. Buat bot dengan @BotFather

1. Buka Telegram dan mulai obrolan dengan [@BotFather](https://t.me/BotFather).
2. Kirim `/newbot` dan ikuti instruksinya (pilih nama dan username yang diakhiri `bot`).
3. Salin **token bot** yang diberikan BotFather, misalnya `123456789:AAExampleTokenString`.
4. Jaga kerahasiaan token — siapa pun yang memilikinya dapat mengendalikan bot.

## 2. Buat channel privat

1. Di Telegram, buat **channel privat** baru (pilih "Private Channel" saat diminta jenisnya).
2. Beri nama yang mudah dikenali; channel inilah tempat file Anda disimpan.

## 3. Tambahkan bot sebagai administrator channel

1. Buka channel, lalu **Manage Channel → Administrators → Add Admin**.
2. Cari username bot Anda dan tambahkan.
3. Berikan setidaknya izin berikut:
   - **Post Messages** — diperlukan untuk mengunggah bagian-bagian file.
   - **Delete Messages** — diperlukan untuk menghapus file dan membersihkan bagian-bagiannya.

::: warning Bot harus menjadi administrator
Jika bot bukan admin dengan izin Post dan Delete, proses unggah dan hapus akan gagal. Anggota biasa tidak dapat mengirim pesan ke channel.
:::

## 4. Dapatkan chat ID channel

Chat ID channel bernilai **negatif** dan diawali `-100`, misalnya `-1001234567890`. Awalan `-100` menandakan supergroup atau channel. Kesalahan umum adalah memakai username channel (`@my_channel`) atau ID positif — Teldock memerlukan bentuk numerik `-100...`.

Cara memperolehnya:

- **Teruskan pesan ke @userinfobot.** Kirim pesan apa pun di channel Anda, teruskan ke [@userinfobot](https://t.me/userinfobot), lalu baca chat ID yang ditampilkan.
- **Gunakan Bot API `getUpdates`.** Kirim pesan di channel, lalu buka URL berikut di browser (ganti tokennya):

  ```text
  https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
  ```

  Cari `"chat": { "id": -1001234567890, ... }` pada respons. Channel harus sudah menerima pesan setelah bot ditambahkan agar update muncul.

## 5. Masukkan kredensial di Teldock

1. Buka `http://localhost:3000` dan masuk.
2. Buka **Settings → Telegram Integration**.
3. Tempel **bot token** dan **chat ID channel** Anda.
4. Simpan. Teldock memvalidasi token ke Telegram sebelum menerimanya.

## Apa yang terjadi saat menghubungkan

- Bot token **dienkripsi saat disimpan** dengan `ENCRYPTION_KEY` sebelum ditulis ke database.
- Token **tidak pernah dikembalikan ke klien** setelah tersimpan — UI hanya menampilkan status terhubung/tersamarkan.
- Bagian-bagian file diunggah ke channel memakai token tersimpan; chat ID channel menentukan lokasi penyimpanannya.

Karena token dienkripsi dengan `ENCRYPTION_KEY`, key tersebut harus tetap stabil. Merotasinya membuat kredensial yang ada tidak dapat dibaca. Lihat [Konfigurasi](/id/guide/configuration).

## Pemecahan masalah

| Gejala | Kemungkinan penyebab | Solusi |
| --- | --- | --- |
| Unggahan langsung gagal | Bot bukan admin channel | Tambahkan bot sebagai admin dengan izin **Post Messages** dan **Delete Messages**. |
| "Chat not found" / ID salah | Format chat ID keliru | Gunakan ID negatif `-100...`, bukan username atau angka positif. |
| Token ditolak saat disimpan | Token dicabut atau salah ketik | Buat token baru lewat @BotFather (`/token` atau `/revoke`) dan tempel string lengkapnya. |
| Dulu berhasil, kini gagal | Token dicabut | Buat ulang token di @BotFather dan hubungkan kembali di Settings. |

Jika ingin mendistribusikan unggahan ke beberapa bot, lihat [Multi-Bot Pool](/id/guide/multibot).

## Langkah selanjutnya

- [Konfigurasi](/id/guide/configuration) — panduan pengaturan backend dan frontend.
- [Multi-Bot Pool](/id/guide/multibot) — kumpulkan beberapa bot untuk menyebar penyimpanan dan batas laju.
