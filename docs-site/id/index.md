---
layout: home

hero:
  name: Teldock
  text: File Anda, tersimpan di Telegram
  tagline: Penyimpanan cloud self-hosted yang memakai bot Telegram dan channel privat milik Anda sendiri sebagai backend — dipecah menjadi bagian, opsional terenkripsi, dan dialirkan.
  image:
    src: /logo.svg
    alt: Teldock
  actions:
    - theme: brand
      text: Mulai
      link: /id/guide/introduction
    - theme: alt
      text: Lihat di GitHub
      link: https://github.com/Chaerulcp/Teldock

features:
  - title: Upload Terbagi (Chunked)
    details: File besar dipecah menjadi bagian berukuran sekitar 18 MB dan dialirkan ke channel Anda, sehingga batas ukuran per file praktis hilang tanpa menyimpan file di server.
  - title: Download Streaming
    details: Bagian-bagian file disusun kembali secara langsung dengan penanganan backpressure dan dukungan HTTP Range, sehingga unduhan dapat dilanjutkan dan media dapat di-seek.
  - title: Kumpulan Multi-Bot
    details: Daftarkan beberapa token bot per akun dan distribusikan bagian file secara round-robin untuk throughput lebih tinggi serta lebih tahan terhadap batas laju per bot.
  - title: Riwayat Versi
    details: Menimpa file akan menyimpan snapshot isi sebelumnya secara otomatis, dan versi lama dapat dilihat serta dikembalikan.
  - title: Berbagi yang Aman
    details: Publikasikan file melalui tautan publik bertanda tangan dengan masa berlaku, batas unduhan, dan proteksi kata sandi opsional.
  - title: Mount WebDAV
    details: Mount Teldock sebagai drive biasa di desktop Anda melalui endpoint WebDAV yang kompatibel dengan Rclone, memakai kredensial akun yang sudah ada.
---

## Ringkasan

Teldock mengubah bot Telegram dan sebuah channel privat menjadi cloud drive pribadi. Server Anda
hanya menyimpan metadata di basis data relasional dan mem-proxy konten file ke dan dari Telegram
saat dibutuhkan, sehingga byte mentah file tidak pernah menetap di disk lokal. Setiap akun
menghubungkan bot dan channel penyimpanannya sendiri, sehingga antar pengguna tetap terisolasi
meskipun memakai satu instance self-hosted yang sama.

## Cara kerjanya

1. Pengguna menghubungkan token bot Telegram dan channel penyimpanan privatnya di halaman Settings.
2. Saat upload, file dipecah menjadi bagian berukuran sekitar 18 MB agar sesuai batas Bot API.
3. Bagian-bagian tersebut dialirkan ke channel pengguna melalui kumpulan bot miliknya.
4. Basis data hanya menyimpan metadata — nama file, referensi bagian, ukuran, dan parameter enkripsi.
5. Saat download, bagian-bagian disusun kembali sesuai urutan dan dialirkan dengan dukungan `Range`.

## Dokumentasi

- [Instalasi](/id/guide/installation) — jalankan instance lokal dalam beberapa menit.
- [Menggunakan Teldock](/id/guide/usage) — upload, kelola, pratinjau, dan bagikan file.
- [Referensi API](/id/reference/api) — seluruh endpoint beserta contoh request dan response.
- [Deployment](/id/guide/deployment) — jalankan Teldock di produksi di balik Nginx dan HTTPS.

::: warning Baca sebelum mengandalkannya
Teldock adalah proyek edukasi open-source non-komersial. Memakai Bot API Telegram sebagai
penyimpanan umum bukan penggunaan yang dimaksudkan oleh platform ini dan dapat melanggar
[Ketentuan Layanan](https://telegram.org/tos) Telegram. Selalu simpan cadangan mandiri untuk data
penting Anda.
:::
