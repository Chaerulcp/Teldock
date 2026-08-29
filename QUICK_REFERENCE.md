# Teldock Quick Reference

Essential commands, API endpoints, and configurations for daily use. Keep this handy!

---

## Essential Commands

### Development

```bash
# Start backend (development with auto-reload)
cd backend
npm run dev

# Start frontend (development)
cd frontend
npm run dev

# Run tests
node --test tests/*.test.js

# Build frontend
npm run build
```

### Production

```bash
# Start backend (production)
pm2 start ecosystem.config.js

# View logs
pm2 logs teldock-api

# Restart after deployment
pm2 restart teldock-api

# Check status
pm2 status
pm2 monit
```

### Database

```bash
# Access MySQL shell
mysql -u root -p

# Create database
CREATE DATABASE teldock_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user
CREATE USER 'teldock'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON teldock_db.* TO 'teldock'@'localhost';

# Backup database
mysqldump -u root -p teldock_db > backup.sql

# Restore database
mysql -u root -p teldock_db < backup.sql

# Run migrations
cd backend
npm run migrate
```

---

## Environment Variables

### Required in `backend/.env`

```bash
NODE_ENV=production        # development or production
PORT=3001                  # Backend port
DB_HOST=localhost          # Database host
DB_PORT=3306               # Database port
DB_NAME=teldock_db         # Database name
DB_USER=root               # Database user
DB_PASSWORD=secret         # Database password

JWT_SECRET=<random-48chars>     # JWT signing secret (REQUIRED)
JWT_EXPIRE=15m                 # Token expiration
REFRESH_TOKEN_SECRET=<random>  # Refresh token secret (REQUIRED)
REFRESH_TOKEN_EXPIRE=7d        # Refresh token expiration
ENCRYPTION_KEY=<random-32chars>   # Encryption key (REQUIRED)

TG_PART_SIZE=18874368            # ~18MB part size
MAX_UPLOAD_BYTES=2147483648      # 2GB max upload
CORS_ORIGIN=http://localhost:3000  # Allowed origins

# Optional: Redis for preview queue
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Generate secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## API Endpoints Quick Reference

### Base URL: `http://localhost:3001/api`

#### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Get access/refresh tokens |
| POST | `/auth/refresh` | No | Rotate access token |
| GET | `/auth/me` | Yes | Current user info |

#### Files
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/files/upload` | Yes | Upload file |
| GET | `/files` | Yes | List files |
| GET | `/files/search?q=` | Yes | Search files |
| GET | `/files/:id/download` | Yes | Download file |
| POST | `/files/:id/share` | Yes | Create share link |
| DELETE | `/files/:id` | Yes | Delete file |
| GET | `/files/s/:token` | No | Public shared link |

#### Folders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/folders` | Yes | List folders |
| POST | `/folders` | Yes | Create folder |
| PUT | `/folders/:id` | Yes | Rename folder |
| DELETE | `/folders/:id` | Yes | Delete folder |

#### WebDAV
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PROPFIND, GET, PUT, DELETE, MKCOL, MOVE | `/webdav/*` | Basic | Mount storage |

---

## Telegram Setup

### Bot Creation

1. Message **@BotFather** on Telegram
2. Send `/newbot`
3. Follow prompts to name bot
4. Copy bot token (looks like `123456789:ABCdef...`)

### Channel Setup

1. Create new channel in Telegram
2. Make it private
3. Add bot as admin
4. Give permissions: Post Messages + Delete Messages
5. Copy chat ID via @userinfobot

---

## Common Operations

### Reset Password

```sql
UPDATE users 
SET passwordHash = '$2a$10$...' 
WHERE email = 'user@example.com';
```

### Find User

```sql
SELECT id, email, createdAt FROM users WHERE email = 'user@example.com';
```

### Delete User (and cascade)

```sql
DELETE FROM users WHERE email = 'user@example.com';
-- All associated data automatically deleted due to CASCADE
```

### Check Storage Usage

```sql
SELECT u.email, 
       SUM(f.fileSize) as total_storage_used
FROM users u
LEFT JOIN files f ON u.id = f.userId AND f.isDeleted = false
GROUP BY u.id;
```

### Count Files by Type

```sql
SELECT mimeType, COUNT(*) as count
FROM files
WHERE isDeleted = false
GROUP BY mimeType
ORDER BY count DESC;
```

### Clean Up Deleted Files

```sql
-- Permanently delete soft-deleted files older than 30 days
DELETE FROM files WHERE isDeleted = true AND deletedAt < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

---

## File Permissions & Security

### Shared Link Format

Public share links:
```
https://yourdomain.com/s/JWT_TOKEN_HERE
```

Or direct download:
```
https://yourdomain.com/s/JWT_TOKEN_HERE?download=true
```

With password protection:
```
https://yourdomain.com/s/JWT_TOKEN_HERE?password=YOURPASSWORD&download=true
```

### JWT Token Validation

Access token format in header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Refresh token sent when:
- Login succeeds
- Exchange old refresh for new access

---

## Troubleshooting Commands

### Check Service Status

```bash
# Backend process
pm2 list
pm2 logs teldock-api

# Nginx status
sudo systemctl status nginx

# MySQL connection
mysql -u root -p -e "SHOW DATABASES;"

# Network connections
netstat -tlnp | grep :3001
```

### View Logs

```bash
# Application logs
pm2 logs teldock-api --lines 100

# System logs
journalctl -xe

# Nginx errors
tail -f /var/log/nginx/error.log

# MySQL slow queries
mysql -u root -p -e "SET GLOBAL slow_query_log = 'ON';"
```

### Test Endpoints

```bash
# Health check
curl http://localhost:3001/api/health

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Upload test
curl -X POST http://localhost:3001/api/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/file.pdf"

# Get user info
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Migration Commands

### Run Migrations

```bash
# Apply pending migrations
cd backend
npm run migrate

# Specific migration
npm run migrate -- migration-name
```

### Rollback Last Migration

```bash
cd backend
npm run migrate:rollback
```

### Check Migration Status

```bash
cd backend
node scripts/check-migration-status.js
```

---

## Performance Tuning

### Node.js Memory Optimization

Increase memory limit for large uploads:
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Database Query Optimization

Add indexes for frequently searched columns:
```sql
ALTER TABLE files ADD INDEX idx_user_folder (userId, folderId);
ALTER TABLE files ADD INDEX idx_filename_search (originalFilename);
```

### Enable Compression

Add to Nginx config:
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1024;
```

---

## Security Checklist

Before deploying:

- [ ] Generate random secrets for JWT, REFRESH_TOKEN, ENCRYPTION_KEY
- [ ] Set strong database passwords
- [ ] Configure firewall (allow only necessary ports)
- [ ] Enable HTTPS (SSL certificates)
- [ ] Review rate limiting settings
- [ ] Update CORS_ORIGIN to your domain
- [ ] Remove demo/test accounts
- [ ] Verify encryption at rest enabled
- [ ] Set up regular backups
- [ ] Configure log rotation
- [ ] Test authentication flows

---

## Useful Shell Scripts

### Quick Deploy Script

```bash
#!/bin/bash
# deploy.sh

echo "Deploying Teldock..."

cd /var/www/Teldock/backend

# Install dependencies
npm ci --only=production

# Run migrations
npm run migrate

# Restart services
pm2 restart teldock-api

echo "Deployment complete!"
```

### Backup Script

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backup/teldock_$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u root -pPASSWORD teldock_db > $BACKUP_DIR/db.sql.gz

# App backup
tar -czf $BACKUP_DIR/app.tar.gz /var/www/Teldock/src

# Compress
gzip $BACKUP_DIR/db.sql

echo "Backup completed: $BACKUP_DIR"
```

---

## Configuration Paths

```
Backend Configuration:
├── backend/.env                    # Environment variables
├── backend/ecosystem.config.js    # PM2 configuration
└── backend/scripts/migrate.js     # Database migrations

Frontend Configuration:
├── frontend/vite.config.js         # Vite configuration
├── frontend/tailwind.config.js    # Tailwind CSS
└── frontend/package.json           # Frontend dependencies

Nginx Configuration:
├── /etc/nginx/nginx.conf           # Main config
└── /etc/nginx/sites-available/teldock  # Site config

Database:
├── /var/lib/mysql/teldock_db       # Data files
└── /var/log/mysql/error.log        # Error logs
```

---

## Support Resources

- **GitHub Issues**: Report bugs and request features
- **Security**: Email security contact before public disclosure
- **Documentation**: See full docs in project README

---

*Quick Reference v1.0 - Last Updated: August 29, 2026*
