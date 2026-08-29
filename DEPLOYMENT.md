# Teldock Deployment Guide

Complete guides for deploying **Teldock** in various production environments. Whether you're deploying on VPS, Docker, or Kubernetes—find your setup below.

---

## Table of Contents

- [Before You Deploy](#before-you-deploy)
- [Quick Deployment Checklist](#quick-deployment-checklist)
- [VPS Deployment (Ubuntu/Debian)](#vps-deployment-ubuntudebian)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Fly.io Deployment](#flyio-deployment)
- [Railway/Render Deployment](#railwayrender-deployment)
- [Nginx Reverse Proxy](#nginx-reverse-proxy)
- [Database Setup](#database-setup)
- [Environment Configuration](#environment-configuration)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Backups](#backups)
- [Troubleshooting](#troubleshooting)

---

## Before You Deploy

### Prerequisites Checklist

- [ ] Domain name configured (optional but recommended)
- [ ] SSL certificates ready (or using Let's Encrypt)
- [ ] MySQL/MariaDB server accessible
- [ ] Redis server (optional, for preview queue)
- [ ] FFmpeg installed (optional, for video thumbnails)
- [ ] Bot tokens prepared for each user

### Security Requirements

Generate secure secrets before deploying:

```bash
# Generate secrets
node -e "console.log('JWT_SECRET=', require('crypto').randomBytes(48).toString('hex'));"
node -e "console.log('REFRESH_TOKEN_SECRET=', require('crypto').randomBytes(48).toString('hex'));"
node -e "console.log('ENCRYPTION_KEY=', require('crypto').randomBytes(48).toString('hex'));"
```

Store these securely—they cannot be recovered if lost!

---

## Quick Deployment Checklist

**Production-ready minimum:**

```bash
# 1. Clone repository
git clone https://github.com/Chaerulcp/Teldock.git
cd Teldock

# 2. Database
mysql -u root -p -e "CREATE DATABASE teldock_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3. Environment variables
cat > backend/.env <<EOF
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_NAME=teldock_db
DB_USER=your_db_user
DB_PASSWORD=strong_password_here

JWT_SECRET=<generated-secret>
JWT_EXPIRE=15m
REFRESH_TOKEN_SECRET=<generated-secret>
REFRESH_TOKEN_EXPIRE=7d
ENCRYPTION_KEY=<generated-secret>
TG_PART_SIZE=18874368
MAX_UPLOAD_BYTES=2147483648
CORS_ORIGIN=https://yourdomain.com
EOF

# 4. Install dependencies
cd backend && npm install

# 5. Run migrations
npm run migrate

# 6. Start application
pm2 start ecosystem.config.js --name teldock

# 7. Verify
curl http://localhost:3001/health
```

---

## VPS Deployment (Ubuntu/Debian)

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo upgrade -y

# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install Git
sudo apt install -y git

# Install PM2 (process manager)
sudo npm install -g pm2
```

### Step 2: Install Application

```bash
cd /var/www
git clone https://github.com/Chaerulcp/Teldock.git
cd Teldock/backend

# Create database
mysql -u root -p -e "CREATE DATABASE teldock_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Copy and configure environment
cp .env.example .env
nano .env

# Edit with your values:
# NODE_ENV=production
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=teldock_db
# DB_USER=teldock_user
# DB_PASSWORD=secure_random_password
# JWT_SECRET=<generate-new-secret>
# REFRESH_TOKEN_SECRET=<generate-new-secret>
# ENCRYPTION_KEY=<generate-new-secret>

# Install dependencies
npm install

# Run migrations
npm run migrate

# Create non-root user
sudo adduser teldock
sudo usermod -aG sudo teldock
sudo visudo -f /etc/sudoers.d/teldock
# Add: teldock ALL=(ALL) NOPASSWD: /bin/chown, /bin/chgrp, /bin/chmod
```

### Step 3: Configure PM2

Create PM2 ecosystem config:

```bash
nano ecosystem.config.js
```

Add configuration:

```javascript
module.exports = {
  apps: [{
    name: 'teldock-api',
    script: './server.js',
    cwd: '/var/www/Teldock/backend',
    instances: 2,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
```

Start application:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Run the shown command for systemd
```

### Step 4: Database User

```sql
-- Create database user
CREATE USER 'teldock_user'@'localhost' IDENTIFIED BY 'secure_random_password';
GRANT ALL PRIVILEGES ON teldock_db.* TO 'teldock_user'@'localhost';
FLUSH PRIVILEGES;
```

### Step 5: Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/teldock
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Enable HTTPS with Let's Encrypt (recommended)
    # ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Max upload size (adjust as needed)
    client_max_body_size 2G;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebDAV endpoint
    location /webdav {
        proxy_pass http://localhost:3001/webdav;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # WebDAV specific headers
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/teldock /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal verified (should already exist)
sudo crontab -l | grep certbot
```

---

## Docker Deployment

### Complete docker-compose.yml

```yaml
version: '3.8'

services:
  # Frontend
  frontend:
    image: node:22-alpine
    working_dir: /app
    volumes:
      - ./frontend:/app/frontend
      - /app/frontend/node_modules
    ports:
      - "3000:3000"
    command: sh -c "cd /app/frontend && npm install && npm run dev"
    networks:
      - teldock

  # Backend
  backend:
    image: node:22-alpine
    working_dir: /app/backend
    volumes:
      - ./backend:/app/backend
      - /app/backend/node_modules
    ports:
      - "3001:3001"
    depends_on:
      - database
      - redis
    environment:
      NODE_ENV: production
      DB_HOST: database
      DB_PORT: 3306
      DB_NAME: teldock_db
      DB_USER: teldock
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRE: 15m
      REFRESH_TOKEN_SECRET: ${REFRESH_TOKEN_SECRET}
      REFRESH_TOKEN_EXPIRE: 7d
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      TG_PART_SIZE: 18874368
      MAX_UPLOAD_BYTES: 2147483648
      REDIS_HOST: redis
      REDIS_PORT: 6379
      CORS_ORIGIN: http://localhost:3000
    command: sh -c "cd /app/backend && npm install && npm run migrate && npm start"
    networks:
      - teldock

  # MySQL Database
  database:
    image: mysql:8.0
    restart: always
    volumes:
      - mysql_data:/var/lib/mysql
    environment:
      MYSQL_DATABASE: teldock_db
      MYSQL_USER: teldock
      MYSQL_PASSWORD: ${DB_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${ROOT_PASSWORD}
    networks:
      - teldock
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis (optional, for preview queue)
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    networks:
      - teldock

networks:
  teldock:
    driver: bridge

volumes:
  mysql_data:
  redis_data:
```

### .env file for Docker

```bash
mkdir -p .env
cat > .env <<EOF
DB_PASSWORD=super_secure_mysql_password
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
REFRESH_TOKEN_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
ROOT_PASSWORD=another_secure_root_password
EOF
```

### Deploy

```bash
# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f

# To rebuild after code changes
docker-compose down
docker-compose build
docker-compose up -d
```

### Production Dockerfile

Create `Dockerfile` for optimization:

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app/backend

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build 2>/dev/null || true

FROM node:22-alpine

WORKDIR /app/backend

# Copy only production dependencies
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/backend/src ./src
COPY --from=builder /app/backend/server.js ./

EXPOSE 3001

USER node

CMD ["node", "server.js"]
```

Build and deploy:

```bash
docker build -t teldock-backend .
docker run -d \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e DB_HOST=mysql-host \
  --name teldock teldock-backend
```

---

## Kubernetes Deployment

### Namespace

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: teldock
```

### Secrets

```bash
kubectl create secret generic teldock-secrets \
  --from-literal=jwt-secret=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))") \
  --from-literal=refresh-token-secret=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))") \
  --from-literal=encryption-key=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))") \
  --from-literal=db-password="secure-password" \
  -n teldock
```

### ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: teldock-config
  namespace: teldock
data:
  NODE_ENV: "production"
  PORT: "3001"
  DB_HOST: "mysql-service"
  DB_PORT: "3306"
  DB_NAME: "teldock_db"
  JWT_EXPIRE: "15m"
  REFRESH_TOKEN_EXPIRE: "7d"
  TG_PART_SIZE: "18874368"
  MAX_UPLOAD_BYTES: "2147483648"
  CORS_ORIGIN: "https://yourdomain.com"
```

### StatefulSet (MySQL)

```yaml
# k8s/mysql.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: teldock
spec:
  serviceName: mysql
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        ports:
        - containerPort: 3306
        env:
        - name: MYSQL_DATABASE
          value: teldock_db
        - name: MYSQL_USER
          value: teldock
        - name: MYSQL_PASSWORD
          valueFrom:
            secretKeyRef:
              name: teldock-secrets
              key: db-password
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: teldock-secrets
              key: db-root-password
        volumeMounts:
        - name: mysql-data
          mountPath: /var/lib/mysql
  volumeClaimTemplates:
  - metadata:
      name: mysql-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

### Deployment (Backend)

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: teldock-backend
  namespace: teldock
spec:
  replicas: 2
  selector:
    matchLabels:
      app: teldock-backend
  template:
    metadata:
      labels:
        app: teldock-backend
    spec:
      containers:
      - name: backend
        image: yourregistry/teldock-backend:latest
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: teldock-config
        - secretRef:
            name: teldock-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: teldock-backend
  namespace: teldock
spec:
  selector:
    app: teldock-backend
  ports:
  - port: 3001
    targetPort: 3001
  type: ClusterIP
```

### Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: teldock-ingress
  namespace: teldock
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "2g"
    nginx.ingress.kubernetes.io/proxy-buffer-size: "128k"
spec:
  tls:
  - hosts:
    - yourdomain.com
    - api.yourdomain.com
    secretName: teldock-tls
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: teldock-frontend
            port:
              number: 80
  - host: api.yourdomain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: teldock-backend
            port:
              number: 3001
      - path: /webdav
        pathType: Prefix
        backend:
          service:
            name: teldock-backend
            port:
              number: 3001
```

Deploy:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mysql.yaml
kubectl wait sts/mysql --for condition=Ready --timeout=300s
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml
```

---

## Fly.io Deployment

### fly.toml

```toml
app = "teldock-yourname"

[build]
  dockerfile = "Dockerfile.fly"

[env]
  NODE_ENV = "production"
  PORT = "3001"

[[services]]
  internal_port = 3001
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[services.http_checks]]
  interval = "10s"
  timeout = "2s"
  grace_period = "5s"
  method = "get"
  path = "/api/health"

[mounts]
  source = "teldock_data"
  destination = "/data"
  size_gb = 10
```

### Deploy

```bash
# Install Fly CLI
go install github.com/flypt/flyctl/install/flyctl@latest

# Login to Fly.io
fly auth login

# Create new app
fly launch
# Follow prompts

# Set secrets
fly secrets set \
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))") \
  REFRESH_TOKEN_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))") \
  ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))") \
  DB_PASSWORD=$(openssl rand -base64 32)

# Deploy
fly deploy

# Add PostgreSQL (managed by Fly)
fly pg create teldock-db
fly pg attach teldock-db --db-name teldock_db
```

---

## Railway/Render Deployment

### Railway

1. Create new project on Railway.app
2. Connect GitHub repository
3. Add services:
   - Node.js (backend)
   - PostgreSQL
4. Set environment variables in UI
5. Deploy automatically on push

### Render

1. Create new web service from GitHub
2. Root directory: `backend`
3. Build command: `npm install && npm run build`
4. Start command: `node server.js`
5. Add PostgreSQL database
6. Configure environment variables

---

## Nginx Reverse Proxy

Complete production Nginx setup with optimizations:

```nginx
# /etc/nginx/conf.d/teldock.conf
upstream teldock_backend {
    server localhost:3001;
    keepalive 64;
}

upstream teldock_frontend {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # Modern SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Client Upload Size
    client_max_body_size 2G;
    
    # Timeouts for large uploads/downloads
    client_body_timeout 300s;
    client_header_timeout 300s;
    send_timeout 300s;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;
    gzip_comp_level 6;
    
    # Frontend
    location / {
        proxy_pass http://teldock_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            proxy_pass http://teldock_frontend;
            proxy_cache valid;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API Backend
    location /api {
        proxy_pass http://teldock_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # No caching for API
        proxy_no_cache 1;
        proxy_cache_bypass 1;
    }
    
    # WebDAV
    location /webdav {
        proxy_pass http://teldock_backend/webdav;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Streaming support for WebDAV
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
        
        # Large files
        client_max_body_size 2G;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

---

## Database Setup

### MySQL Optimizations

```sql
-- Optimize MySQL configuration
SET GLOBAL innodb_buffer_pool_size = 75%; -- Of available RAM
SET GLOBAL innodb_log_file_size = 256M;
SET GLOBAL innodb_flush_log_at_trx_commit = 2; -- Faster but less safe
SET GLOBAL query_cache_type = 0; -- Disable query cache for high write loads

-- Create indexes (usually done by migrations)
SHOW INDEX FROM files;
SHOW INDEX FROM folders;
```

### MariaDB Optimizations

Same as MySQL, plus:

```sql
-- Enable query cache for read-heavy workloads
SET GLOBAL query_cache_type = 1;
SET GLOBAL query_cache_size = 64M;
```

### Database Backups

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mysql"
DB_NAME="teldock_db"
DB_USER="teldock"
DB_PASS="password"

# Create backup
mysqldump -u$DB_USER -p$DB_PASS --single-transaction $DB_NAME | gzip > $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz

# Delete old backups (keep last 7 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

# Verify backup
echo "$DATE Backup completed" >> $BACKUP_DIR/backup.log
```

Run daily via cron:

```bash
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

---

## Monitoring & Maintenance

### PM2 Monitoring

```bash
# View status
pm2 status
pm2 list

# View logs
pm2 logs teldock-api
pm2 logs teldock-api --lines 100

# Monitor metrics
pm2 monit

# Restart after deployment
pm2 restart teldock-api

# Stop
pm2 stop teldock-api
pm2 delete teldock-api
```

### Process Monitoring

```bash
# Watch memory/CPU
htop

# Check disk usage
df -h

# Check database connections
mysql -u root -p -e "SHOW PROCESSLIST;"
```

### Log Rotation

```bash
# /etc/logrotate.d/teldock
/var/log/teldock/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 teldock adm
    postrotate
        systemctl reload teldock-api
    endscript
}
```

---

## Backups

### Application Data Backups

```bash
#!/bin/bash
# Full system backup script

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ROOT="/backup/teldock"

# Database backup
mysqldump -u root -pYOURPASS teldock_db > $BACKUP_ROOT/db_$TIMESTAMP.sql

# File backups
tar -czf $BACKUP_ROOT/files_$TIMESTAMP.tar.gz /var/www/Teldock/backend/src
tar -czf $BACKUP_ROOT/frontend_$TIMESTAMP.tar.gz /var/www/Teldock/frontend/src

# Upload to cloud (optional)
aws s3 cp $BACKUP_ROOT s3://your-backup-bucket/$TIMESTAMP

# Keep local copies for 30 days
find $BACKUP_ROOT -mtime +30 -delete
```

### Disaster Recovery Steps

1. Restore database:
   ```bash
   mysql -u root -p teldock_db < /backup/latest.sql
   ```

2. Restore files:
   ```bash
   tar -xzf /backup/teldock_files_TIMESTAMP.tar.gz -C /var/www/
   ```

3. Restart services:
   ```bash
   systemctl restart nginx
   pm2 restart teldock-api
   ```

---

## Troubleshooting

### Common Issues

#### High Memory Usage

```bash
# Check Node.js memory
node --expose-gc server.js
# Then use Chrome DevTools heap snapshot

# Solution: Increase memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
```

#### Slow Query Performance

```sql
-- Identify slow queries
SHOW FULL PROCESSLIST;
SHOW STATUS LIKE 'Slow_queries';

-- Add indexes if needed
ALTER TABLE files ADD INDEX idx_user_deleted (userId, isDeleted);
ALTER TABLE files ADD INDEX idx_folder_date (folderId, createdAt);
```

#### Upload Failures

```bash
# Check Nginx error log
tail -f /var/log/nginx/error.log

# Check backend logs
pm2 logs teldock-api | grep "upload"

# Verify Telegram bot permissions
curl -X GET "https://api.telegram.org/bot<TOKEN>/getMe"
curl -X POST "https://api.telegram.org/bot<TOKEN>/getUpdates"
```

### Performance Tuning

```bash
# PM2 cluster mode (already configured)
pm2 scale teldock-api 4 --max-memory-restart 1G

# Redis for sessions/cache
redis-cli CONFIG SET maxmemory 512mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# MySQL buffer pool tuning
# Adjust based on server RAM
```

---

## Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Best Practices](https://www.nginx.com/resources/wiki/start/topics/tutorials/config_pitfalls/)
- [MySQL Performance Tuning](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)
- [Docker Best Practices](https://docs.docker.com/develop/develop-images/dockerfile-best-practices/)

---

*Deployment Guide v1.0 - Last Updated: August 29, 2026*
