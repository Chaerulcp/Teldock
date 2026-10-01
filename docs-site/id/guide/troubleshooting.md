---
title: Troubleshooting & FAQ
description: Mengatasi masalah umum Teldock — konektivitas, login, unggahan, rate limit Telegram, error database dan migrasi, pratinjau, WebDAV, CORS, dan kegagalan startup.
---

# Troubleshooting & FAQ

Mulai dari bagian [Diagnostik](#diagnostik) yang menunjukkan di mana server melaporkan
statusnya. Lalu cocokkan gejala Anda pada tabel di bawah.

## Tabel masalah dan solusi

| Gejala | Kemungkinan penyebab | Yang harus dilakukan |
| ------ | -------------------- | -------------------- |
| Tidak bisa mengakses frontend | Dev server frontend tidak berjalan, atau URL/port salah | Jalankan `npm run dev` di `frontend/` (default `http://localhost:3000`). Pastikan port tidak sedang dipakai. |
| Frontend terbuka tetapi panggilan API gagal | Backend mati atau `CORS_ORIGIN` tidak cocok | Pastikan backend mendengarkan (default `http://localhost:3001`) dan `CORS_ORIGIN` persis sama dengan origin frontend. Lihat [Error CORS](#error-cors). |
| Login selalu gagal | Kredensial salah, atau rate limit login habis | Periksa email dan password. `POST /api/auth/login` dibatasi 20 percobaan per jam — tunggu jendela waktu berlalu. |
| Login mengembalikan "Too many login attempts" | Rate limit auth tercapai | Tunggu hingga satu jam, lalu coba lagi. Batasnya 20 percobaan per jam per IP. |
| `401` pada setiap panggilan API | Access token kedaluwarsa dan refresh gagal | Keluar lalu masuk lagi. Bila berlanjut, pastikan `JWT_SECRET` dan `REFRESH_TOKEN_SECRET` tidak berubah sejak token diterbitkan. |
| Unggahan langsung gagal | Bot/channel Telegram belum terhubung | Hubungkan bot dan channel di **Settings → Telegram Integration**. |
| Unggahan gagal dengan error Telegram | Bot bukan admin channel, atau chat ID salah | Tambahkan bot ke channel sebagai admin dengan hak Post dan Delete Messages, lalu periksa ulang chat ID (angka yang diawali `-100`). |
| Unggahan gagal dengan `413 File too large` | File melebihi `MAX_UPLOAD_BYTES` | Naikkan `MAX_UPLOAD_BYTES` atau unggah file yang lebih kecil. Default 2 GB. |
| Unggahan mandek atau sangat lambat | Rate limit Telegram, atau bot terlalu sedikit | Tambahkan bot ke pool dan kurangi transfer bersamaan. Lihat [Telegram 429](#telegram-429-too-many-requests). |
| Telegram mengembalikan 429 Too Many Requests | Rate limit per bot | Teldock mencoba ulang otomatis; lihat bagian di bawah. Bila berlanjut, tambahkan bot dan perlambat operasi massal. |
| Error koneksi database | Nilai `DB_*` salah atau database tidak berjalan | Periksa `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`; pastikan MySQL/MariaDB hidup; jalankan `npm run test-db`. Server membatalkan startup bila tidak dapat terhubung. |
| Error migrasi atau kolom hilang | Skema belum terbaru | Jalankan `npm run migrate` di `backend/`. Gunakan skrip `npm run migrate:*` yang spesifik untuk perubahan skema fitur tertentu. |
| Pratinjau gambar tidak muncul | Sharp gagal terpasang, atau file terenkripsi/terlalu besar | Pasang ulang dependensi backend untuk membangun ulang Sharp. Pratinjau dihasilkan di proses dan sumbernya harus di bawah 25 MB; file terenkripsi tidak dapat dipratinjau. |
| Pratinjau video mengembalikan `503` | FFmpeg tidak terpasang atau tidak ada di `PATH` server | Pasang FFmpeg dan pastikan binary `ffmpeg` ada di `PATH` server, lalu restart backend. Pratinjau gambar tetap berfungsi tanpanya. |
| Pratinjau video mengembalikan `413` | Video melebihi batas pratinjau 25 MB di memori | Ini memang disengaja: sumber pratinjau di-buffer di RAM dan dibatasi 25 MB, sehingga sebagian besar video berukuran besar ditolak. Unduh videonya alih-alih mempratinjau. |
| WebDAV mengembalikan `401` | Email/password salah, atau kredensial tidak dikirim | Gunakan email akun lengkap sebagai username dan password Teldock Anda. Pastikan klien mengirim Basic auth. |
| WebDAV mengembalikan `429` | Terlalu banyak percobaan autentikasi gagal, atau sinkronisasi sangat besar | Router `/webdav` mengizinkan 5000 permintaan per 15 menit, tetapi percobaan autentikasi yang gagal dibatasi 20 per 15 menit. Pastikan username (email akun lengkap) dan password benar, lalu coba lagi; naikkan `WEBDAV_RATE_LIMIT_MAX` jika sinkronisasi massal tetap melewati batas umum. |
| Unggahan WebDAV mengembalikan `415` | Content type tidak ada di allowlist | Hanya sekumpulan tipe MIME tetap yang diterima via WebDAV. Unggah tipe lain lewat UI web. |
| Error CORS di konsol browser | `CORS_ORIGIN` tidak cocok dengan frontend | Setel `CORS_ORIGIN` ke origin frontend yang persis (skema, host, dan port, tanpa trailing slash) lalu restart backend. |
| Server menolak untuk mulai | Secret hilang atau masih placeholder | Setel nilai asli untuk `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, dan `ENCRYPTION_KEY`. Lihat [Server menolak untuk mulai](#server-menolak-untuk-mulai). |
| Tautan pratinjau atau unduhan "kedaluwarsa" | Masa hidup signed URL habis | Signed URL berlaku `FILE_ACCESS_TOKEN_EXPIRE` (default 5 menit). Minta ulang URL dari UI. |
| Tautan berbagi mengembalikan `403` | Tautan kedaluwarsa, batas tercapai, atau password diperlukan | Periksa status tautan di halaman Shares. Sertakan header `X-Share-Password` bila tautan dilindungi. |

## Diagnostik

### Health check

Backend menyediakan endpoint health tanpa autentikasi:

```bash
curl http://localhost:3001/api/health
```

Respons yang sehat terlihat seperti:

```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

Jika ini gagal, proses backend tidak berjalan atau tidak dapat dijangkau pada host dan port
tersebut.

### Log backend

Jalankan backend di foreground untuk memantau log startup dan permintaan:

```bash
cd backend
npm run dev
```

Startup mencetak hasil koneksi MySQL, port yang didengarkan, serta error secret atau koneksi.
Error per permintaan (kegagalan Telegram, error stream, error WebDAV) dicatat dengan nama
rutenya. Setel `NODE_ENV=development` untuk juga mencatat query SQL.

### Konektivitas database

Dari direktori `backend/`, jalankan:

```bash
npm run test-db
```

Skrip ini menguji API dan database sekaligus: ia mendaftarkan (atau login) pengguna uji,
mengambil profilnya, dan melaporkan hasilnya. Jalankan terhadap backend yang sudah
mendengarkan di port `3001`. Bila gagal sebelum mencapai API, masalahnya ada di API atau
jaringan; bila gagal pada register/login, periksa konfigurasi database dan migrasi.

Untuk pemeriksaan skema langsung, jalankan migrasi:

```bash
npm run migrate
```

### Telegram 429 Too Many Requests

Telegram Bot API menerapkan rate limit per bot. Teldock menangani `429` (atau `5xx`) dengan
mencoba ulang bagian tersebut hingga **3 kali**:

- Bila Telegram mengembalikan `parameters.retry_after`, Teldock menunggu persis selama itu.
- Jika tidak, backoff eksponensial dipakai mulai 1,5 detik dan berlipat ganda setiap
  percobaan.
- Setiap percobaan ulang memilih **bot berikutnya di pool**, sehingga bot yang sedang
  di-rate-limit dilewati pada percobaan berikutnya.

Untuk mengurangi 429, tambahkan bot ke [multi-bot pool](/id/guide/multibot), hindari banyak
transfer bersamaan, dan ulangi operasi massal nanti. Error yang tidak dapat dicoba ulang
seperti `400` langsung menghentikan loop.

### Server menolak untuk mulai

Teldock memvalidasi secret wajib saat boot dan keluar daripada berjalan dengan default yang
tidak aman. Anda akan melihat error yang mencantumkan setiap masalah. Persyaratannya:

- `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, dan `ENCRYPTION_KEY` semuanya harus diisi.
- Masing-masing minimal **32 karakter**.
- Masing-masing bukan salah satu nilai placeholder contoh yang dikirim di `.env.example`.

Hasilkan nilai yang kuat dengan:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Lalu setel di `backend/.env` dan restart. Lihat [Konfigurasi](/id/reference/configuration)
untuk daftar lengkap environment variable.

### Error CORS

Backend hanya mengizinkan satu origin, yang dikonfigurasi lewat `CORS_ORIGIN`, dan mengirim
credentials. Bila browser memblokir permintaan:

1. Setel `CORS_ORIGIN` ke origin persis yang tampil di address bar browser, termasuk skema
   dan port (misalnya `http://localhost:3000`).
2. Jangan tambahkan trailing slash.
3. Restart backend setelah mengubahnya.

## FAQ

**Di mana file saya sebenarnya disimpan?**
Di channel Telegram pribadi Anda, sebagai dokumen yang dikirim oleh bot Anda. Server hanya
menyimpan metadata dan mengalirkan konten ke dan dari Telegram sesuai permintaan.

**Berapa penyimpanan yang saya dapat?**
Tidak ada kuota Teldock yang tetap. Kapasitas praktis bergantung pada akun dan channel
Telegram Anda. Teldock melacak byte terpakai untuk pelaporan tetapi tidak menerapkan batas
keras.

**Apakah file dienkripsi?**
Enkripsi bersifat opsional per file (AES-256-CTR dengan salt acak). File yang diunggah tanpa
opsi Encrypt disimpan tanpa enkripsi di channel Anda.

**Bisakah saya mempratinjau file terenkripsi?**
Tidak. File terenkripsi harus diunduh dan didekripsi oleh klien, sehingga viewer di browser
dinonaktifkan untuk file tersebut.

**Apa yang terjadi bila bot dihapus atau diblokir?**
Bot mana pun di pool dapat membaca dan menghapus bagian, jadi mengeluarkan satu bot dari pool
aman selama bot lain tetap admin. Bila Telegram memblokir semua bot Anda, Anda kehilangan
akses ke file tersebut — simpan backup mandiri.

**Mengapa unggahan saya terpecah menjadi beberapa pesan?**
File dipecah menjadi bagian sekitar 18 MB agar tetap dalam batas ukuran dokumen Telegram. Ini
normal dan ditampilkan sebagai badge `N×` di UI.

**Berapa banyak versi yang disimpan?**
Maksimal 10 per file. Versi lama dihapus otomatis saat versi baru dibuat.

**Bisakah saya memulihkan file yang dihapus?**
Penghapusan menandai file sebagai soft-deleted, tetapi secara default pesan Telegram-nya ikut
dihapus. Sertakan `?deleteFromTelegram=false` saat menghapus bila Anda ingin punya opsi
pemulihan. Belum ada layar recycle bin pada versi ini.

**Apakah Teldock mengumpulkan analitik?**
Tidak. Ini perangkat lunak self-hosted tanpa telemetri.

## Mendapatkan bantuan

Bila masalahnya tidak tercakup di sini, cari atau buka issue:

- GitHub Issues: [https://github.com/Chaerulcp/Teldock/issues](https://github.com/Chaerulcp/Teldock/issues)

Saat melaporkan masalah, sertakan pesan error persis, keluaran log backend, serta versi
`NODE_ENV`, mesin database, dan Node.js Anda. Jangan menempelkan secret atau token bot.

## Langkah selanjutnya

- [Konfigurasi](/id/reference/configuration) — environment variable.
- [Multi-Bot Pool](/id/guide/multibot) — kurangi error rate limit.
- [WebDAV & Rclone](/id/guide/webdav) — seluk-beluk WebDAV.
