# 🔸 Telegram Cloud Storage Web App 🚀

A full-stack cloud storage solution powered by Telegram Bot API and built with React + Node.js. Upload, download, and share files using Telegram's infrastructure as your backend storage.

![Status](https://img.shields.io/badge/Phase-4%20Complete-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-22.x-blue)
![React](https://img.shields.io/badge/React-18.x-purple)
![MySQL](https://img.shields.io/badge/Database-MySQL%2FMariaDB-lightgrey)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

### 🎨 Frontend (React SPA) ✅ COMPLETE
- Beautiful, responsive UI with TailwindCSS
- Drag-and-drop file upload
- Real-time upload progress
- File preview & sharing
- Toast notifications
- Dark mode support (ready)
- Mobile-friendly design

### 🔐 Authentication System
- Email/Password registration
- Telegram ID authentication support  
- JWT access tokens (15 minutes expiry)
- Refresh tokens (7 days validity)
- Protected route enforcement

### 📁 File Management
- Upload files up to 50MB to Telegram
- Stream large files efficiently (memory-safe)
- Hierarchical folder organization
- Download files from Telegram CDN
- Create secure shared links with:
  - Expiration dates
  - Download limits
  - Password protection
- Soft delete support (recoverable)

### 🛡️ Security
- Multi-layer security architecture
- Rate limiting (100 req/15min general)
- Input validation & sanitization
- SQL injection prevention
- Filename security (path traversal blocked)
- Storage quota enforcement
- Download tracking & analytics

### 🚀 Performance
- Streaming file transfers
- Automatic retry logic (exponential backoff)
- Optimized database indexes
- Connection pooling
- Pagination on list operations


---

## 🏗️ Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React SPA     │────▶│  Node.js Server  │────▶│   Telegram Bot  │
│   (Phase 4)     │     │   Express API    │     │   API / Channel │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │        │
                              ▼        ▼
                        ┌─────────────┐  ┌──────────────┐
                        │   MySQL DB  │  │   Redis      │
                        │             │  │   (Future)   │
                        └─────────────┘  └──────────────┘
```

**Full-Stack Implementation**: Production-ready  
**Frontend**: http://localhost:3000 ✅ Running  
**Backend**: http://localhost:3001/api ✅ Running  

---

## 📦 Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| **Backend** | Node.js | 22.x |
| **Framework** | Express.js | 5.x |
| **Database** | MySQL/MariaDB | 8.0+ |
| **ORM** | Sequelize | 6.37.8 |
| **Auth** | JSON Web Tokens | Latest |
| **Security** | Helmet/CORS | Latest |
| **File Handling** | Multer/Form-Data | 2.x |
| **Telegram** | Telegraf.js | 4.x |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v20 or higher
- **MySQL** or **MariaDB** server
- **Git** for version control

### Installation Steps

#### 1. Clone Repository
```bash
git clone <repository-url>
cd tele-storage-app
```

#### 2. Install Dependencies
```bash
cd backend
npm install
```

#### 3. Configure Environment
Create `.env` file in `backend/`:
```bash
# Server Configuration
NODE_ENV=development
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tele_storage_db
DB_USER=root
DB_PASSWORD=your_mysql_password

# JWT Secrets
JWT_SECRET=change-this-to-random-string-in-production
JWT_EXPIRE=15m
REFRESH_TOKEN_SECRET=another-secret-key
REFRESH_TOKEN_EXPIRE=7d

# Telegram (Optional for file upload)
TELEGRAM_BOT_TOKEN=your-bot-token-here
TELEGRAM_STORAGE_CHAT_ID=-100xxxxxxxxxx
```

#### 4. Setup Database
```bash
# Run migrations to create tables
npm run migrate

# Verify database structure
npm run test-db
```

#### 5. Start Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will be available at: `http://localhost:3001/api`

---

## 🧪 Testing the Application

### Test Credentials

You can use these test accounts:

| Account | Email | Password |
|---------|-------|----------|
| Test User 1 | testuser@example.com | TestPass123! |
| Test User 2 | newuser@test.com | NewPass123! |

### Quick Test Commands

#### Register New User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","password":"SecurePass123!"}'
```

#### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"TestPass123!"}'
```

#### Get Profile (Protected Route)
```bash
# Replace TOKEN with actual token from login response
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Health Check
```bash
curl http://localhost:3001/api/health
```

### Running Full Test Suite
```bash
# Test authentication flow
npm run test-auth

# Test database setup
npm run test-db
```

---

## 📖 API Documentation

Complete API documentation is available in `docs/api/API_DOCUMENTATION.md`

### Available Endpoints

#### Authentication
```
POST   /api/auth/register    # Register new user
POST   /api/auth/login       # Login and get tokens
POST   /api/auth/refresh     # Refresh access token
GET    /api/auth/me          # Get current user profile
```

#### File Management
```
POST   /api/files/upload     # Upload file to Telegram
GET    /api/files            # List files with pagination
GET    /api/files/:id/download # Download file from Telegram
POST   /api/files/:id/share  # Create shared link
DELETE /api/files/:id        # Soft delete file
GET    /api/files/s/:token   # Public shared link access
```

---

## 📊 Database Schema

Four main tables with relationships:

### Users
- Unique IDs (UUIDs)
- Email/Telegram ID authentication
- Storage quota tracking
- Premium features support

### Folders
- Hierarchical structure (parent-child)
- Telegram topic sync capability
- Display ordering
- Cascade delete support

### Files
- Telegram metadata storage
- File type detection
- Download tracking
- Soft delete support
- Shared link tokens

### Shared Links
- JWT-based access control
- Password protection
- Expiration dates
- Download limits
- Usage analytics

---

## 🎯 Project Phases

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ Complete | Authentication system |
| **Phase 2** | ✅ Complete | Database schema design |
| **Phase 3** | ✅ Complete | Telegram integration & File APIs |
| **Phase 4** | 📝 Planned | React frontend development |
| **Phase 5** | 📝 Planned | Deployment & testing |

---

## 📚 Documentation

| Document | Purpose | Location |
|----------|---------|----------|
| AGENTS.md | AI Agent Guidelines | Root directory |
| PROJECT_SUMMARY.md | Overall project status | Root directory |
| PHASE1_SUMMARY.md | Auth implementation details | docs/ |
| PHASE2_SUMMARY.md | Database schema guide | docs/ |
| PHASE3_SUMMARY.md | Telegram integration | docs/ |
| API_DOCUMENTATION.md | Complete API reference | docs/api/ |
| QUICK_REFERENCE.md | Quick lookup guide | docs/ |
| API_QUICK_TEST_GUIDE.md | Testing examples | docs/ |

---

## 🔧 Configuration Options

### Rate Limiting
```javascript
// Default configuration (in src/app.js)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 auth attempts per hour
});
```

### File Upload Limits
```javascript
// Maximum file size: 50MB (Telegram cloud API limit)
const maxFileSize = 50 * 1024 * 1024;

// Supported types are configured in file-upload.middleware.js
```

---

## 🔒 Security Checklist

✅ All passwords hashed with bcrypt (12 rounds)  
✅ JWT tokens expire after 15 minutes  
✅ Refresh tokens valid for 7 days  
✅ SQL injection prevented via parameterized queries  
✅ XSS protection via Helmet headers  
✅ CORS properly configured  
✅ Rate limiting on all endpoints  
✅ Input validation on all routes  
✅ Filename sanitization preventing path traversal  
✅ Storage quota enforced per user  
✅ Download tracking enabled  

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`feature/amazing-feature`)
3. Commit changes (`feat: add amazing feature`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Commit Convention
Following [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation updates
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Maintenance tasks

---

## 📈 Roadmap

### Short Term (Next Sprint)
- [ ] Build React frontend dashboard
- [ ] Implement drag-drop file upload UI
- [ ] Add folder navigation tree
- [ ] Create file preview component
- [ ] Mobile-responsive design

### Medium Term (Q4 2026)
- [ ] Docker containerization
- [ ] CI/CD pipeline setup
- [ ] Production deployment
- [ ] SSL certificate installation
- [ ] Redis caching layer
- [ ] Comprehensive test suite

### Long Term (2027)
- [ ] Mobile app (iOS/Android)
- [ ] Admin dashboard
- [ ] Advanced search functionality
- [ ] Collaboration features
- [ ] Premium subscription tiers
- [ ] Analytics dashboard

---

## 🆘 Troubleshooting

### Common Issues

**Issue**: Cannot connect to database  
**Solution**: Check MySQL is running, verify `.env` credentials

**Issue**: JWT authentication failing  
**Solution**: Ensure header format is `Authorization: Bearer TOKEN`

**Issue**: Upload fails with 413 error  
**Solution**: File too large. Compress or split file

**Issue**: Rate limit exceeded  
**Solution**: Wait before retrying, or implement client-side queuing

---

## 💡 Tips & Tricks

### Efficient File Uploads
Use streaming for files >10MB:
```javascript
// Backend handles this automatically via multer + streams
const inputStream = req.file.stream();
await telegramService.uploadToStorage(inputStream, filename);
```

### Optimal Query Patterns
Always filter by userId:
```javascript
// Good
await File.findOne({ where: { id, userId } })

// Bad - allows cross-user access
await File.findOne({ where: { id } })
```

### Shared Link Best Practices
Set expiration dates:
```javascript
expiresIn: 86400  // 24 hours
downloadLimit: 5  // Max 5 downloads
```

---

## 📞 Support

For questions or issues:
- Check documentation in `docs/` folder
- Review test scripts in `tests/` folder
- Look at troubleshooting section above

---

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 🙏 Acknowledgments

- [Telegram Bot API](https://core.telegram.org/bots/api) - For file storage infrastructure
- [Sequelize ORM](https://sequelize.org/) - For database abstraction
- [Express.js](https://expressjs.com/) - For web framework
- Community contributors who made this possible

---

<div align="center">

**Built with ❤️ using Telegram Cloud Storage API**

[View Live Demo](#) · [Report Bug](#) · [Request Feature](#)

</div>
