---
title: Deployment
description: Terapkan Teldock ke produksi dengan Nginx, HTTPS, process manager, dan MySQL.
---

# Deployment

Halaman ini membahas deployment produksi Teldock: API Node.js, frontend React, database MySQL, dan
reverse proxy yang menangani HTTPS serta upgrade koneksi WebSocket. Untuk penyiapan lokal, lihat
[Installation](/id/guide/installation).

## Topologi produksi

Deployment self-hosted yang umum terdiri dari empat komponen:

```text
              HTTPS                        HTTP
Browser  ─────────────▶  Nginx  ─────────────▶  Node API (:3001)  ──▶  Telegram Bot API
                          │                              │
                          │  file statis                 └──▶  MySQL (:3306)
                          │  /api  ──▶ API
                          │  /socket.io  ──▶ WebSocket
                          └  /webdav  ──▶ API
```

- **Nginx** menyajikan frontend hasil build dan meneruskan trafik API, WebSocket, serta WebDAV.
- **Node API** menjalankan aplikasi Express (entry point `backend/server.js`).
- **MySQL / MariaDB** hanya menyimpan metadata.

::: info
Byte file tidak pernah disimpan di disk server. Database menyimpan metadata dan referensi pesan
Telegram; isi file berada di channel Telegram milik masing-masing pengguna.
:::

## Prasyarat

- Node.js 22.x
- MySQL atau MariaDB 8.0+
- Nginx
- Nama domain (disarankan) dan akses untuk membuka port 80 dan 443
- Process manager: `systemd` atau PM2

## Penyiapan backend produksi

### 1. Pasang dependency

Pasang persis sesuai lockfile dan lewati dev dependency:

```bash
cd /var/www/Teldock/backend
npm ci --omit=dev
```

### 2. Konfigurasi environment

Salin template lalu sunting. Di produksi, nilai terpenting adalah:

```ini
NODE_ENV=production
PORT=3001

DB_HOST=localhost
DB_PORT=3306
DB_NAME=teldock_db
DB_USER=teldock_user
DB_PASSWORD=<password-kuat>

# Buat masing-masing dengan:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=<48-byte-hex>
JWT_EXPIRE=15m
REFRESH_TOKEN_SECRET=<48-byte-hex>
REFRESH_TOKEN_EXPIRE=7d
ENCRYPTION_KEY=<48-byte-hex>

TG_PART_SIZE=18874368
MAX_UPLOAD_BYTES=2147483648
CORS_ORIGIN=https://yourdomain.com
```

::: danger
API memvalidasi `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, dan `ENCRYPTION_KEY` saat boot. Proses akan
menolak start jika nilainya kosong, kurang dari 32 karakter, atau masih memakai placeholder contoh.
`ENCRYPTION_KEY` harus tetap stabil: mengubahnya membuat bot token dan file terenkripsi yang lama
tidak bisa dibaca.
:::

Lihat [Configuration](/id/reference/configuration) untuk daftar variabel lengkap.

### 3. Jalankan migrasi database

```bash
npm run migrate
```

### 4. Jalankan dengan process manager

#### Unit systemd

Buat `/etc/systemd/system/teldock.service`:

```ini
[Unit]
Description=Teldock API
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=teldock
Group=teldock
WorkingDirectory=/var/www/Teldock/backend
EnvironmentFile=/var/www/Teldock/backend/.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

Aktifkan dan jalankan:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now teldock
sudo systemctl status teldock
```

#### Alternatif PM2

```bash
npm install -g pm2
pm2 start server.js --name teldock-api
pm2 save
pm2 startup   # jalankan perintah yang ditampilkan
```

## Build frontend produksi

Build bundle statis dari direktori `frontend`:

```bash
cd /var/www/Teldock/frontend
npm ci
npm run build
```

Vite menulis bundle produksi ke `frontend/dist/`. Sajikan direktori tersebut sebagai file statis dan
biarkan Nginx mengarahkan rute sisi klien ke `index.html`.

## Konfigurasi Nginx

Server block berikut menyajikan frontend statis, mem-proxy `/api/`, meng-upgrade `/socket.io/`
menjadi WebSocket, dan mengekspos endpoint WebDAV.

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Alihkan seluruh trafik HTTP ke HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Izinkan upload besar (samakan dengan MAX_UPLOAD_BYTES)
    client_max_body_size 2G;

    # ---- Frontend (SPA statis) ----
    root /var/www/Teldock/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # ---- REST API ----
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ---- Socket.IO (upgrade WebSocket untuk sinkronisasi real-time) ----
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # ---- WebDAV (Rclone) ----
    location /webdav {
        proxy_pass http://127.0.0.1:3001/webdav;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Streaming, jangan buffer file besar
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

Aktifkan situs lalu reload:

```bash
sudo ln -s /etc/nginx/sites-available/teldock /etc/nginx/sites-enabled/teldock
sudo nginx -t
sudo systemctl reload nginx
```

## HTTPS dengan Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Certbot memasang systemd timer yang memperbarui sertifikat secara otomatis. HTTPS wajib untuk
deployment produksi karena access token, refresh token, dan signed URL file dikirim melalui header
dan query string; pada HTTP biasa nilai tersebut dapat dibaca atau diubah di tengah jalan.

## CORS

API hanya menerima permintaan browser dari origin pada `CORS_ORIGIN`. Setel ke origin frontend publik
yang tepat, termasuk skema dan port:

```ini
CORS_ORIGIN=https://yourdomain.com
```

Jika `CORS_ORIGIN` salah, frontend tetap terbuka tetapi semua panggilan API gagal pada preflight.

## Migrasi database

Jalankan migrasi dasar sekali, lalu terapkan migrasi inkremental untuk fitur yang ditambahkan setelah
skema awal. Setiap skrip bersifat idempoten dan aman dijalankan ulang.

| Perintah | Fungsi |
| --- | --- |
| `npm run migrate` | Membuat/memperbarui seluruh tabel dari model Sequelize. |
| `npm run migrate:chunked` | Menambah kolom chunked storage dan melonggarkan `NOT NULL` single-message. |
| `npm run migrate:drop-quota` | Menghapus kuota storage tetap yang lama. |
| `npm run migrate:widen-share-token` | Melebarkan `shared_links.token` agar menampung JWT penuh. |
| `npm run migrate:version-snapshots` | Menambah kolom part snapshot pada `file_versions`. |
| `npm run migrate:tags-favorites` | Menambah `files.isFavorite`, `tags`, `file_tags`, dan `smart_folders`. |

```bash
cd /var/www/Teldock/backend
npm run migrate
npm run migrate:chunked
npm run migrate:drop-quota
npm run migrate:widen-share-token
npm run migrate:version-snapshots
npm run migrate:tags-favorites
```

Lihat [Database Schema](/id/reference/database-schema) untuk tabel yang dihasilkan.

## Docker

Repositori ini tidak menyertakan `Dockerfile` maupun `docker-compose.yml`, sehingga deployment
container **not provided in this repository** (tidak disediakan di repositori ini). Gunakan
penyiapan systemd atau PM2 di atas, atau buat image sendiri berdasarkan langkah-langkah di halaman
ini.

## Backup

Satu-satunya komponen berstate yang wajib di-backup adalah database MySQL. Byte file berada di
Telegram, bukan di disk, sehingga dump database ditambah file environment sudah cukup untuk
membangun ulang instance yang berfungsi.

```bash
#!/usr/bin/env bash
set -euo pipefail

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/teldock"
mkdir -p "$BACKUP_DIR"

mysqldump --single-transaction -u teldock_user -p"$DB_PASSWORD" teldock_db \
  | gzip > "$BACKUP_DIR/teldock_db_${DATE}.sql.gz"

find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
```

::: warning
Simpan salinan `ENCRYPTION_KEY` yang aman. Tanpanya, kredensial bot dan part file terenkripsi di
database hasil restore tidak dapat didekripsi, meskipun dump database valid.
:::

Jadwalkan skrip dengan cron, misalnya `0 2 * * * /opt/teldock/backup.sh`.

## Halaman terkait

- [Configuration](/id/reference/configuration) — seluruh environment variable.
- [Security](/id/guide/security) — checklist hardening dan model keamanan.
- [Troubleshooting & FAQ](/id/guide/troubleshooting) — mendiagnosis upload gagal dan masalah koneksi.
