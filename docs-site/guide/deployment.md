---
title: Deployment
description: Deploy Teldock to production with Nginx, HTTPS, a process manager, and MySQL.
---

# Deployment

This page covers a production deployment of Teldock: the Node.js API, the React single-page
frontend, a MySQL database, and a reverse proxy that terminates HTTPS and upgrades WebSocket
connections. For local setup, see [Installation](/guide/installation).

## Production topology

A typical self-hosted deployment has four moving parts:

```text
              HTTPS                        HTTP
Browser  ─────────────▶  Nginx  ─────────────▶  Node API (:3001)  ──▶  Telegram Bot API
                          │                              │
                          │  static files                └──▶  MySQL (:3306)
                          │  /api  ──▶ API
                          │  /socket.io  ──▶ WebSocket
                          └  /webdav  ──▶ API
```

- **Nginx** serves the built frontend and reverse-proxies API, WebSocket, and WebDAV traffic.
- **Node API** runs the Express application (entry point `backend/server.js`).
- **MySQL / MariaDB** stores metadata only.

::: info
File bytes are never stored on the server disk. The database holds metadata and Telegram message
references; the content lives in each user's own Telegram channel.
:::

## Prerequisites

- Node.js 22.x
- MySQL or MariaDB 8.0+
- Nginx
- A domain name (recommended) and the ability to open ports 80 and 443
- A process manager: `systemd` or PM2

## Backend production setup

### 1. Install dependencies

Install exactly the locked dependency tree and skip dev dependencies:

```bash
cd /var/www/Teldock/backend
npm ci --omit=dev
```

### 2. Configure the environment

Copy the template and edit it. In production the most important values are:

```ini
NODE_ENV=production
PORT=3001

DB_HOST=localhost
DB_PORT=3306
DB_NAME=teldock_db
DB_USER=teldock_user
DB_PASSWORD=<strong-password>

# Generate each of these with:
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
The API validates `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and `ENCRYPTION_KEY` at boot. It refuses to
start if a value is missing, shorter than 32 characters, or still equal to a known example
placeholder. `ENCRYPTION_KEY` must stay stable: changing it makes previously encrypted bot tokens
and encrypted files unreadable.
:::

See [Configuration](/reference/configuration) for the full variable list.

### 3. Run database migrations

```bash
npm run migrate
```

### 4. Run under a process manager

#### systemd unit

Create `/etc/systemd/system/teldock.service`:

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

Enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now teldock
sudo systemctl status teldock
```

#### PM2 alternative

```bash
npm install -g pm2
pm2 start server.js --name teldock-api
pm2 save
pm2 startup   # run the command it prints
```

## Frontend production build

Build the static bundle from the `frontend` directory:

```bash
cd /var/www/Teldock/frontend
npm ci
npm run build
```

Vite writes the production bundle to `frontend/dist/`. Serve that directory as static files and let
Nginx fall back to `index.html` for client-side routes.

## Nginx configuration

The following server block serves the static frontend, proxies `/api/`, upgrades `/socket.io/` to a
WebSocket, and exposes the WebDAV endpoint.

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Allow large uploads (matches MAX_UPLOAD_BYTES)
    client_max_body_size 2G;

    # ---- Frontend (static SPA) ----
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

    # ---- Socket.IO (WebSocket upgrade for real-time sync) ----
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

        # Stream requests/responses instead of buffering large files
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

Enable the site and reload:

```bash
sudo ln -s /etc/nginx/sites-available/teldock /etc/nginx/sites-enabled/teldock
sudo nginx -t
sudo systemctl reload nginx
```

## HTTPS with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Certbot installs a systemd timer that renews certificates automatically. HTTPS is required for a
production deployment because access tokens, refresh tokens, and signed file URLs travel in request
headers and query strings; over plain HTTP they can be read or modified in transit.

## CORS

The API only accepts browser requests from the origin in `CORS_ORIGIN`. Set it to the exact public
frontend origin, including scheme and port:

```ini
CORS_ORIGIN=https://yourdomain.com
```

If `CORS_ORIGIN` is wrong, the frontend loads but every API call fails the preflight check.

## Database migrations

Run the base migration once, then apply the incremental migrations for features added after the
initial schema. Each script is idempotent and safe to re-run.

| Command | Purpose |
| --- | --- |
| `npm run migrate` | Create/update all tables from the Sequelize models. |
| `npm run migrate:chunked` | Add chunked-storage columns and relax single-message `NOT NULL` constraints. |
| `npm run migrate:drop-quota` | Remove the legacy fixed storage quota. |
| `npm run migrate:widen-share-token` | Widen `shared_links.token` to hold full JWT strings. |
| `npm run migrate:version-snapshots` | Add part-snapshot columns to `file_versions`. |
| `npm run migrate:tags-favorites` | Add `files.isFavorite`, `tags`, `file_tags`, and `smart_folders`. |

```bash
cd /var/www/Teldock/backend
npm run migrate
npm run migrate:chunked
npm run migrate:drop-quota
npm run migrate:widen-share-token
npm run migrate:version-snapshots
npm run migrate:tags-favorites
```

See [Database Schema](/reference/database-schema) for the resulting tables.

## Docker

This repository does not ship a `Dockerfile` or a `docker-compose.yml`, so container deployment is
**not provided in this repository**. Deploy with the systemd or PM2 setup above, or author your own
image around the steps on this page.

## Backups

The only stateful component you must back up is the MySQL database. File bytes live in Telegram, not
on disk, so a database dump plus the environment file is enough to rebuild a working instance.

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
Keep a secure copy of `ENCRYPTION_KEY`. Without it, encrypted bot credentials and encrypted file
parts in a restored database cannot be decrypted, even with a valid database dump.
:::

Schedule the script with cron, for example `0 2 * * * /opt/teldock/backup.sh`.

## Related pages

- [Configuration](/reference/configuration) — every environment variable.
- [Security](/guide/security) — hardening checklist and the security model.
- [Troubleshooting & FAQ](/guide/troubleshooting) — diagnose failed uploads and connectivity issues.
