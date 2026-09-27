---
title: Berbagi File
description: Membuat, melindungi, dan mencabut tautan berbagi publik di Teldock dengan masa berlaku, batas unduhan, dan password opsional.
---

# Berbagi File

Tautan berbagi memungkinkan orang di luar akun Anda mengunduh atau mempratinjau satu file
tanpa login. Tautan dibuat per file, dapat memiliki masa berlaku, batas unduhan, dan
password.

## Membuat tautan berbagi

Tautan dibuat dari aksi **Share** pada file di dashboard, yang memanggil
`POST /api/files/:id/share`. Body request menerima opsi berikut:

| Opsi | Tipe | Keterangan |
| ---- | ---- | ---------- |
| `expiresIn` | integer detik | Opsional. Maksimum `31536000` (365 hari). Hilangkan untuk tanpa kedaluwarsa. |
| `downloadLimit` | integer | Opsional. Maksimum `1000000`. Hilangkan untuk unduhan tak terbatas. |
| `password` | string | Opsional. Maksimum 72 byte. |
| `allowPreview` | boolean | Opsional. Default `true`. |

Responsnya berisi metadata tautan, termasuk `shortUrl` yang siap dibagikan.

::: tip
Tombol quick-share di dashboard membuat tautan yang kedaluwarsa dalam 24 jam dengan batas 5
unduhan, lalu menyalinnya ke clipboard.
:::

## URL tautan berbagi

Jalur API publik untuk file yang dibagikan adalah:

```
GET /api/files/s/:token
```

`shortUrl` yang dikembalikan ke klien (dan ditampilkan di halaman Shares) dibentuk dari
`FRONTEND_URL` Anda sebagai `<FRONTEND_URL>/s/<token>`, sehingga penerima membuka tautan yang
ramah dan mengarah ke token yang sama.

Secara default endpoint mengembalikan **metadata** (nama file, ukuran, tipe MIME, masa
berlaku, dan pemakaian) serta mencatat satu view. Untuk mengalirkan isi file, penerima
menambahkan `?download=true`. Ini mengharuskan tautan mengizinkan unduhan, dan setiap
permintaan seperti itu mengurangi satu kuota unduhan.

```
GET /api/files/s/<token>?download=true
```

Jika tautan tidak mengizinkan pratinjau, permintaan metadata ditolak; jika tidak mengizinkan
unduhan, permintaan unduhan ditolak. Saat tautan kedaluwarsa atau batas unduhannya tercapai,
permintaan ditolak dengan `403`.

## Tautan berpassword

Bila tautan memiliki password, password diperiksa **sebelum** penghitung unduhan disentuh,
sehingga tebakan yang salah tidak akan menghabiskan kuota tautan.

Akses program memakai header berikut:

```http
GET /api/files/s/<token> HTTP/1.1
Host: your-host:3001
X-Share-Password: correct horse battery staple
```

Jika password tidak dikirim, endpoint merespons dengan `200` yang berisi
`requiresPassword: true` dan nama file, sehingga klien dapat memintanya. Jika password salah,
endpoint merespons `401 Incorrect password`.

Di browser, penerima membuka halaman share, diminta memasukkan password, lalu halaman
meminta ulang file dengan header `X-Share-Password`. Header ini ada dalam daftar allowed
headers CORS backend, sehingga permintaan diterima dari origin frontend yang dikonfigurasi.

## Mengelola dan mencabut tautan

Halaman **Shared Links** di `/dashboard/shares` menampilkan semua tautan yang Anda buat.
Setiap baris menampilkan file, status proteksi password, jumlah unduhan terhadap batasnya,
tanggal kedaluwarsa, dan badge status bila sudah kedaluwarsa atau mencapai batas. Dari sini
Anda dapat menyalin tautan lagi atau mencabutnya.

Mencabut tautan akan menghapusnya seketika dan tokennya langsung berhenti bekerja. Endpoint
pengelolaannya adalah:

| Method | Endpoint | Kegunaan |
| ------ | -------- | -------- |
| `GET` | `/api/shares` | Daftar tautan Anda (berhalaman via `page` dan `limit`) |
| `DELETE` | `/api/shares/:id` | Cabut tautan |

Perlu dicatat, tautan **dibuat** dengan `POST /api/files/:id/share`; endpoint `/api/shares`
hanya menampilkan dan mencabut tautan yang sudah ada.

::: warning
Siapa pun yang memiliki tautan dapat mengakses file sampai tautan kedaluwarsa atau Anda
mencabutnya. Untuk file sensitif, selalu tetapkan masa berlaku dan password, serta cabut
tautan segera setelah tidak diperlukan. Perlakukan tautan berbagi seperti rahasia.
:::

::: info
Penghitung unduhan dan view dicatat di sisi server. Tautan yang mencapai batas unduhan tidak
lagi dapat mengalirkan file, tetapi baris metadatanya tetap ada sampai Anda mencabutnya.
:::

## Langkah selanjutnya

- [Menggunakan Teldock](/id/guide/usage) — unggah, kelola, dan pratinjau file.
- [Keamanan](/id/guide/security) — model keamanan secara keseluruhan.
- [Referensi API](/id/reference/api) — daftar endpoint lengkap.
