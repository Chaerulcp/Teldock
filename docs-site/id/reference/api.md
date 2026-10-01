---
title: API Reference
description: Referensi lengkap REST API Teldock, termasuk endpoint, payload, dan rate limit.
---

# API Reference

API Teldock adalah layanan REST yang disajikan oleh backend Node.js. Semua route di bawah ini
di-mount dengan prefiks `/api`, kecuali endpoint WebDAV yang di-mount pada `/webdav`.

## Base URL dan konvensi

```text
http://localhost:3001/api
```

Di produksi, frontend dan API disajikan dari origin yang sama di balik Nginx, sehingga base URL-nya
menjadi `https://yourdomain.com/api`.

### Response envelope

Respons sukses membungkus payload di dalam `data`:

```json
{
  "success": true,
  "data": { }
}
```

Error menggunakan `success: false` dengan string `error` yang mudah dibaca:

```json
{
  "success": false,
  "error": "File not found"
}
```

### Authentication

Endpoint terproteksi memerlukan bearer access token:

```http
Authorization: Bearer <access-token>
```

Peroleh token dari `POST /auth/register` atau `POST /auth/login`, lalu perbarui dengan
`POST /auth/refresh`.

### Kode status error

| Status | Arti |
| --- | --- |
| `400` | Validasi gagal atau ada field wajib yang kosong. |
| `401` | Access token tidak dikirim, atau kredensial tidak valid. |
| `403` | Token tidak valid/kedaluwarsa, atau pemanggil bukan pemilik resource. |
| `404` | Resource yang diminta tidak ada. |
| `409` | Konflik (user, folder, atau tag duplikat; file terenkripsi tidak bisa di-preview). |
| `413` | Upload melebihi `MAX_UPLOAD_BYTES`, atau sumber pratinjau melebihi batas pratinjau 25 MB. |
| `415` | Upload WebDAV ditolak oleh whitelist MIME. |
| `416` | Rentang byte yang diminta tidak dapat dipenuhi. |
| `429` | Rate limit terlampaui. |
| `500` | Error server tak terduga. |
| `502` | Download dari Telegram gagal saat streaming shared link. |
| `503` | FFmpeg tidak terpasang, sehingga pratinjau video tidak tersedia. |

## Rate limit dan header

| Cakupan | Batas | Jendela |
| --- | --- | --- |
| Semua route `/api/` | 100 request | 15 menit |
| `POST /api/auth/login` | 20 percobaan | 1 jam |
| Semua route `/webdav` | 5000 request | 15 menit |
| Autentikasi `/webdav` gagal | 20 percobaan | 15 menit |

Respons menyertakan header standar `RateLimit-*`:

| Header | Deskripsi |
| --- | --- |
| `RateLimit-Limit` | Jumlah maksimum request yang diizinkan pada jendela saat ini. |
| `RateLimit-Remaining` | Request yang tersisa pada jendela saat ini. |
| `RateLimit-Reset` | Detik hingga jendela direset. |

::: info
Server dikonfigurasi dengan `standardHeaders: true` dan `legacyHeaders: false`, sehingga header
lama `X-RateLimit-Limit`, `X-RateLimit-Remaining`, dan `X-RateLimit-Reset` tidak dikirim.
:::

## Auth

Base path: `/api/auth`

| Method | Path | Auth | Deskripsi |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Membuat akun dan mengembalikan token. |
| `POST` | `/auth/login` | Public | Autentikasi dengan email dan password. |
| `POST` | `/auth/refresh` | Public | Menukar refresh token dengan access token baru. |
| `GET` | `/auth/me` | Bearer | Mengembalikan profil pengguna saat ini. |

### POST /auth/register

Request:

```json
{
  "email": "user@example.com",
  "password": "a-strong-password",
  "username": "user",
  "firstName": "Ada",
  "lastName": "Lovelace"
}
```

Response (`201`):

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "0f9a6d3e-1c2b-4a5d-8e7f-1234567890ab",
      "email": "user@example.com",
      "telegramId": null,
      "username": "user",
      "firstName": "Ada",
      "storageQuotaBytes": null,
      "storageUsedBytes": 0
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": 1790000000000
  }
}
```

### POST /auth/login

Request:

```json
{
  "email": "user@example.com",
  "password": "a-strong-password"
}
```

Response (`200`):

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "0f9a6d3e-1c2b-4a5d-8e7f-1234567890ab",
      "email": "user@example.com",
      "username": "user",
      "storageQuotaBytes": null,
      "storageUsedBytes": 10485760
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": 1790000000000
  }
}
```

### POST /auth/refresh

Request:

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Response (`200`):

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": 1790000000000
  }
}
```

### GET /auth/me

Response (`200`):

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "0f9a6d3e-1c2b-4a5d-8e7f-1234567890ab",
      "email": "user@example.com",
      "telegramId": null,
      "username": "user",
      "firstName": "Ada",
      "lastName": "Lovelace",
      "avatarUrl": null,
      "storageQuotaBytes": null,
      "storageUsedBytes": 10485760,
      "isPremium": false,
      "premiumUntil": null
    }
  }
}
```

## Files

Base path: `/api/files`

| Method | Path | Auth | Deskripsi |
| --- | --- | --- | --- |
| `POST` | `/files/upload` | Bearer | Mengunggah file (multipart dengan streaming). |
| `GET` | `/files` | Bearer | Mendaftar file dengan filter dan paginasi. |
| `GET` | `/files/search` | Bearer | Mencari file berdasarkan nama. |
| `POST` | `/files/bulk` | Bearer | Menghapus atau memindahkan file secara massal. |
| `POST` | `/files/:id/download-url` | Bearer | Membuat signed download URL. |
| `GET` | `/files/:id/download` | Bearer atau signed URL | Streaming file sebagai attachment. |
| `POST` | `/files/:id/preview-url` | Bearer | Membuat signed preview URL. |
| `GET` | `/files/:id/preview` | Bearer atau signed URL | Streaming file secara inline. |
| `GET` | `/files/:id/versions` | Bearer | Mendaftar riwayat versi. |
| `POST` | `/files/:id/revert/:versionId` | Bearer | Memulihkan versi sebelumnya. |
| `POST` | `/files/:id/share` | Bearer | Membuat public share link. |
| `PATCH` | `/files/:id` | Bearer | Memperbarui nama file, folder, atau status favorit. |
| `PUT` | `/files/:id/tags` | Bearer | Mengganti tag file. |
| `DELETE` | `/files/:id` | Bearer | Soft-delete file. |
| `GET` | `/files/s/:token` | Public | Mengakses shared link. |

### POST /files/upload

Upload multipart form. Body di-parse sebagai stream, sehingga file tidak pernah di-buffer di memori.

| Field | Tipe | Wajib | Deskripsi |
| --- | --- | --- | --- |
| `file` | file | Ya | File yang diunggah. |
| `folderId` | string | Tidak | UUID folder tujuan. |
| `encrypt` | boolean | Tidak | Mengenkripsi part yang disimpan. |

Response (`201`):

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "file": {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "displayFilename": "report.pdf",
      "mimeType": "application/pdf",
      "fileSize": 5242880,
      "isChunked": false,
      "partCount": 1,
      "isEncrypted": false
    },
    "versioned": false
  }
}
```

Jika sudah ada file dengan nama yang sama di folder tujuan, konten sebelumnya disimpan sebagai versi
dan `versioned` bernilai `true` dengan pesan `"File updated (previous saved as version)"`.

### GET /files

Query parameter:

| Parameter | Tipe | Default | Deskripsi |
| --- | --- | --- | --- |
| `folderId` | UUID | — | Filter berdasarkan folder. |
| `page` | integer | `1` | Nomor halaman. |
| `limit` | integer | `50` | Jumlah item per halaman. |
| `sortBy` | string | `createdAt` | Kolom pengurutan. |
| `sortOrder` | `ASC`/`DESC` | `DESC` | Arah pengurutan. |
| `includeDeleted` | boolean | `false` | Sertakan file yang soft-deleted. |
| `favorite` | boolean | `false` | Hanya favorit. |
| `tagId` | UUID | — | Filter berdasarkan tag. |

Response (`200`):

```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "displayFilename": "report.pdf",
        "mimeType": "application/pdf",
        "fileSize": 5242880,
        "isFavorite": false
      }
    ],
    "total": 1,
    "currentPage": 1,
    "totalPages": 1,
    "hasMore": false
  }
}
```

### GET /files/search

Query parameter: `q` (wajib), `page`, `limit`.

### POST /files/bulk

Request:

```json
{
  "action": "move",
  "fileIds": [
    "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"
  ],
  "folderId": "9f8e7d6c-5b4a-4938-8271-6f5e4d3c2b1a"
}
```

`action` bernilai `"delete"` atau `"move"`; `folderId` hanya dipakai untuk `move`. Response (`200`):

```json
{
  "success": true,
  "message": "Moved 2 file(s)",
  "data": { "count": 2 }
}
```

### POST /files/:id/download-url

Response (`200`):

```json
{
  "success": true,
  "data": {
    "url": "/api/files/7c9e6679-7425-40de-944b-e07fc1f90ae7/download?signature=eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

### POST /files/:id/preview-url

Mengembalikan signed URL untuk tampilan inline. Response (`200`):

```json
{
  "success": true,
  "data": {
    "url": "/api/files/7c9e6679-7425-40de-944b-e07fc1f90ae7/preview?signature=eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

::: warning
File terenkripsi tidak dapat di-preview. `GET /files/:id/preview` mengembalikan `409` untuk file
terenkripsi; unduh saja file tersebut.
:::

### GET /files/:id/download dan GET /files/:id/preview

Endpoint ini menerima bearer token atau query parameter `signature` yang dihasilkan oleh endpoint
`download-url` / `preview-url`. Keduanya mendukung permintaan HTTP `Range` dan merespons dengan `206`
saat rentang parsial dilayani.

```bash
# Menggunakan signed URL yang dikembalikan oleh /download-url
curl -OJ "https://yourdomain.com/api/files/7c9e6679-.../download?signature=eyJ..."
```

### POST /files/:id/share

Request:

```json
{
  "expiresIn": 86400,
  "downloadLimit": 5,
  "password": "optional-password",
  "allowPreview": true
}
```

Response (`201`):

```json
{
  "success": true,
  "message": "Shared link created",
  "data": {
    "link": {
      "id": "3f1c2b4a-5d6e-4f70-8a91-b2c3d4e5f607",
      "shortUrl": "https://yourdomain.com/s/eyJhbGciOiJIUzI1NiJ9...",
      "expiresAt": "2026-10-01T12:00:00.000Z",
      "downloadLimit": 5,
      "usedDownloads": 0
    }
  }
}
```

### GET /files/s/:token (public)

Endpoint shared link publik. Secara default mengembalikan metadata file, atau melakukan streaming
file saat `?download=true` dikirim dan link mengizinkan download.

```json
{
  "success": true,
  "data": {
    "file": {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "originalFilename": "report.pdf",
      "displayFilename": "report.pdf",
      "mimeType": "application/pdf",
      "fileSize": 5242880,
      "isEncrypted": false,
      "uploadedAt": "2026-09-01T10:00:00.000Z"
    },
    "expiresAt": "2026-10-01T12:00:00.000Z",
    "allowDownload": true,
    "usedDownloads": 0,
    "downloadLimit": 5
  }
}
```

Untuk link yang dilindungi password, kirim password pada header `X-Share-Password`. Tanpa password,
endpoint merespons dengan `{ "success": true, "requiresPassword": true, ... }`; dengan password yang
salah, endpoint merespons `401` dengan `{ "success": false, "error": "Incorrect password" }`.

### PATCH /files/:id

```json
{
  "displayFilename": "renamed.pdf",
  "folderId": "9f8e7d6c-5b4a-4938-8271-6f5e4d3c2b1a",
  "isFavorite": true
}
```

Sertakan minimal satu field. Gunakan `folderId: null` atau `"root"` untuk memindahkan file ke root.

### PUT /files/:id/tags

```json
{
  "tagIds": ["c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f"]
}
```

### DELETE /files/:id

Melakukan soft-delete pada file. Kirim `?deleteFromTelegram=false` untuk mempertahankan pesan di
Telegram.

### GET /files/:id/versions dan POST /files/:id/revert/:versionId

Mendaftar riwayat versi, atau memulihkan salah satunya:

```json
{
  "success": true,
  "message": "Reverted to version 2",
  "data": {
    "version": {
      "id": "d4e5f607-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
      "versionNumber": 2,
      "filename": "report.pdf",
      "mimeType": "application/pdf",
      "fileSize": 5242880,
      "isChunked": false,
      "partCount": 1,
      "isEncrypted": false,
      "createdAt": "2026-09-01T10:00:00.000Z"
    }
  }
}
```

## Folders

Base path: `/api/folders`

| Method | Path | Auth | Deskripsi |
| --- | --- | --- | --- |
| `GET` | `/folders` | Bearer | Mendaftar folder (opsional `parentFolderId`). |
| `POST` | `/folders` | Bearer | Membuat folder. |
| `PUT` | `/folders/:id` | Bearer | Mengganti nama folder. |
| `DELETE` | `/folders/:id` | Bearer | Menghapus subtree folder. |

Request pembuatan: `{ "name": "Documents", "parentFolderId": null, "icon": "folder" }`. Menghapus
folder akan melepaskan file di dalamnya (dipindahkan ke root), bukan menghapusnya.

## Telegram

Base path: `/api/user/telegram`

| Method | Path | Auth | Deskripsi |
| --- | --- | --- | --- |
| `POST` | `/user/telegram/connect` | Bearer | Menghubungkan bot token dan storage chat. |
| `PUT` | `/user/telegram/config` | Bearer | Memperbarui konfigurasi Telegram yang ada. |
| `GET` | `/user/telegram/status` | Bearer | Melaporkan status koneksi. |
| `DELETE` | `/user/telegram/unlink` | Bearer | Memutus koneksi Telegram. |

Request dan response connect (`201`):

```json
{
  "botToken": "123456789:AAExampleTokenValue",
  "chatId": "-1001234567890",
  "chatType": "channel",
  "username": "my_storage_channel"
}
```

```json
{
  "success": true,
  "message": "Telegram connected successfully",
  "data": {
    "id": "5e4d3c2b-1a09-4876-b5c4-d3e2f1a0b9c8",
    "chatType": "channel",
    "username": "my_storage_channel",
    "isSetupComplete": true
  }
}
```

Bot token dan chat ID divalidasi ke Telegram API sebelum disimpan. Pembaruan `config` memerlukan
`botToken` dan `chatId` secara bersamaan.

## Bots

Base path: `/api/bots` (multi-bot pool)

| Method | Path | Auth | Deskripsi |
| --- | --- | --- | --- |
| `GET` | `/bots` | Bearer | Mendaftar bot pool milik pengguna. |
| `POST` | `/bots` | Bearer | Menambah dan memvalidasi bot token. |
| `DELETE` | `/bots/:id` | Bearer | Menghapus bot dari pool. |

Request penambahan: `{ "token": "123456789:AAExampleTokenValue" }`.

## Shares

Base path: `/api/shares`

| Method | Path | Auth | Deskripsi |
| --- | --- | --- | --- |
| `GET` | `/shares` | Bearer | Mendaftar link yang dibuat pengguna (`page`, `limit`). |
| `DELETE` | `/shares/:id` | Bearer | Mencabut shared link. |

## Tags

Base path: `/api/tags`

| Method | Path | Auth | Deskripsi |
| --- | --- | --- | --- |
| `GET` | `/tags` | Bearer | Mendaftar tag beserta jumlah file. |
| `POST` | `/tags` | Bearer | Membuat tag. |
| `PUT` | `/tags/:id` | Bearer | Mengganti nama atau warna tag. |
| `DELETE` | `/tags/:id` | Bearer | Menghapus tag. |

Request pembuatan: `{ "name": "work", "color": "#10b981" }`.

## Smart folders

Base path: `/api/smart-folders`

| Method | Path | Auth | Deskripsi |
| --- | --- | --- | --- |
| `GET` | `/smart-folders` | Bearer | Mendaftar filter tersimpan. |
| `POST` | `/smart-folders` | Bearer | Membuat filter tersimpan. |
| `DELETE` | `/smart-folders/:id` | Bearer | Menghapus filter tersimpan. |

Request pembuatan:
`{ "name": "Recent images", "icon": "sparkles", "criteria": { "type": "image" } }`. Key `criteria`
yang didukung adalah `favorite`, `tagId`, `type`, dan `q`.

## Previews

Base path: `/api/previews`

| Method | Path | Auth | Deskripsi |
| --- | --- | --- | --- |
| `POST` | `/previews/generate` | Bearer | Membuat pratinjau untuk file gambar atau video milik pemanggil. |

Request: `{ "fileId": "7c9e6679-7425-40de-944b-e07fc1f90ae7" }`. File harus milik pemanggil. File
gambar (`image/*`) dan video (`video/*`) hingga 25 MB didukung; file lebih besar mengembalikan
`413`. Response berisi data URL base64.

Untuk gambar, `data.previews` berisi varian hasil resize (tidak berubah). Untuk video, response
menambahkan penanda `type: "video"` dan mengembalikan satu thumbnail JPEG 640x360 yang diambil pada
detik ke-1, plus durasi dalam detik (`null` bila tidak dapat dibaca):

```json
{
  "success": true,
  "data": {
    "type": "video",
    "previews": {
      "thumbnail": {
        "dataUrl": "data:image/jpeg;base64,...",
        "dimensions": { "width": 640, "height": 360 },
        "fileSize": 15021
      }
    },
    "duration": 2,
    "processingTime": 123
  }
}
```

Pratinjau video memerlukan FFmpeg di server; bila binary `ffmpeg` tidak tersedia, endpoint
mengembalikan `503`, sedangkan pratinjau gambar tetap berfungsi. Karena kedua pipeline menyangga
sumber di memori, pratinjau video dibatasi 25 MB dan sebagian besar video berukuran besar
melewatinya. Kode status pratinjau video: `400` (tipe MIME bukan gambar maupun video), `403`
(pemanggil bukan pemilik file), `404` (file tidak ditemukan), `413` (sumber melebihi batas 25 MB),
`503` (FFmpeg tidak terpasang), `500` (kegagalan lain).

## Stats

Base path: `/api/stats`

| Method | Path | Auth | Deskripsi |
| --- | --- | --- | --- |
| `GET` | `/stats/storage` | Bearer | Agregasi penggunaan storage per kategori. |
| `GET` | `/stats/duplicates` | Bearer | Mencari file dengan checksum yang sama. |

## WebDAV

Base path: `/webdav` (bukan di bawah `/api`)

WebDAV memakai autentikasi HTTP Basic dengan email dan password akun, dan ditujukan untuk Rclone
serta klien sejenis. Router mengizinkan 5000 request per 15 menit (dapat diatur melalui
`WEBDAV_RATE_LIMIT_MAX`), sedangkan percobaan autentikasi yang gagal dibatasi terpisah sebanyak
20 per 15 menit.

| Method | Fungsi |
| --- | --- |
| `OPTIONS` | Mengumumkan kemampuan DAV (`DAV: 1, 2`). |
| `PROPFIND` | Listing direktori (mendukung `Depth: 0` dan `Depth: 1`). |
| `GET` | Mengunduh file, dengan dukungan `Range`. |
| `HEAD` | Mengembalikan header file tanpa body. |
| `PUT` | Mengunggah file (whitelist MIME diterapkan). |
| `DELETE` | Menghapus file atau folder. |
| `MKCOL` | Membuat folder. |
| `MOVE` | Mengganti nama atau memindahkan file. |

File dialamatkan dengan model path datar, misalnya `/webdav/Documents/report.pdf`. Lihat
[WebDAV & Rclone](/id/guide/webdav) untuk penyiapan klien.

## Health

| Method | Path | Auth | Deskripsi |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | Pemeriksaan liveness yang mengembalikan timestamp. |

```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-09-27T12:00:00.000Z"
}
```

## Halaman terkait

- [Configuration](/id/reference/configuration) — environment variable yang memengaruhi perilaku API.
- [Database Schema](/id/reference/database-schema) — model di balik resource ini.
- [Security](/id/guide/security) — token, signed URL, dan rate limit dalam konteks.
