# ⚡ Quick Start Guide - Telegram Cloud Storage

## 🚀 Get Started in 3 Minutes!

### Prerequisites Checklist
- [x] Node.js v20+ installed
- [x] MySQL/MariaDB running
- [x] Project folder exists

---

## 1️⃣ Setup Database (One Time)

```bash
cd backend
npm run migrate
```
✅ Creates: users, folders, files, shared_links tables

---

## 2️⃣ Start Backend Server

```bash
cd backend
npm run dev
```
🌐 API available at: **http://localhost:3001/api**

Leave this window open!

---

## 3️⃣ Start Frontend App

In a NEW terminal:
```bash
cd frontend
npm run dev
```
🖥️ App opens at: **http://localhost:3000**

Browser will auto-open!

---

## 👤 Test Accounts Available

**Option 1 - Login with existing:**
- Email: `testuser@example.com`
- Password: `TestPass123!`

**Option 2 - Register new account:**
1. Click "Register now" on login page
2. Enter email: `newuser@test.com`
3. Set password: `NewPass123!`
4. Click "Create Account"

---

## 🎯 Try These Actions

### Upload a File
1. Drag any file onto the upload zone
2. OR click "browse" to select file
3. Wait for upload confirmation toast
4. See file appear in list

### Download a File
1. Hover over file row
2. Click 📥 download icon
3. Browser redirects to Telegram CDN

### Share a File
1. Click 🔗 share icon
2. Link copied to clipboard
3. Paste and open in new tab

### Delete a File
1. Click more options (⋮) icon
2. Confirm deletion prompt
3. File marked as deleted (recoverable)

---

## 🔍 Check Health Status

**Backend Health:**
```bash
curl http://localhost:3001/api/health
```

Should return:
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "..."
}
```

---

## 🆘 Troubleshooting

### Can't access http://localhost:3000
- Make sure you ran `npm run dev` in frontend folder
- Check if browser port blocked by firewall

### Authentication fails
- Verify backend is running on port 3001
- Clear browser cache
- Logout and login again

### Files not uploading
- Ensure backend is accessible
- Check browser console for errors
- Verify file size < 50MB

### Database connection error
- Start MySQL service
- Check credentials in `.env` file
- Run `npm run migrate` again

---

## 📝 Common Commands

### Development
```bash
npm run dev          # Start servers with hot reload
```

### Build for Production
```bash
# Backend
cd backend && npm install

# Frontend  
cd frontend && npm install && npm run build
```

### Migrations
```bash
cd backend && npm run migrate    # Apply schema changes
```

### Tests
```bash
cd backend && npm run test-auth  # Run auth tests
```

---

## 📊 What's Running?

| Service | URL | Port | Purpose |
|---------|-----|------|---------|
| Frontend | localhost:3000 | 3000 | React SPA UI |
| Backend | localhost:3001 | 3001 | Node.js API |
| Database | localhost:3306 | 3306 | MySQL storage |

All services must be running together!

---

## 🎨 UI Tour

### Login Page Features
- Clean gradient background
- Email & password fields
- Remember your credentials
- Link to registration

### Dashboard Features
- Sidebar navigation
- User profile card
- Storage quota widget
- Drag-drop upload area
- File list table

### Action Buttons
- 📥 Download: Direct to CDN
- 🔗 Share: Create link + copy
- ⋮ Delete: Soft delete option

---

## 💡 Pro Tips

1. **Speed**: Use Chrome DevTools Network tab to see real-time uploads
2. **Organization**: Files are stored in Telegram channels (secure!)
3. **Storage**: Each user gets 50GB default quota
4. **Security**: All tokens refresh automatically
5. **Performance**: Files stream from Telegram CDN (fast!)

---

## 🔒 Security Notes

- ✅ Passwords hashed with bcrypt (12 rounds)
- ✅ JWT tokens expire after 15 minutes
- ✅ Automatic token refresh works silently
- ✅ SQL injection prevented via Sequelize ORM
- ✅ Filename sanitization prevents path traversal
- ✅ CORS properly configured
- ✅ Rate limiting enforced

---

## 📱 Mobile Access

The app is responsive! Resize browser window or access from mobile device at:
```
http://YOUR_COMPUTER_IP:3000
```

Make sure both ports (3000 & 3001) are accessible!

---

## 🎯 Next Steps After Testing

Once familiar with the app:

1. **Customize Design**
   - Edit Tailwind colors in `frontend/tailwind.config.js`
   - Modify layout components

2. **Add Features**
   - Implement folder navigation
   - Add bulk operations
   - Build admin panel

3. **Deploy**
   - Follow deployment guide (PHASE5_SUMMARY.md)
   - Set up SSL certificates
   - Configure production database

---

## 🆘 Need Help?

Check these resources:

- **Full Documentation**: `/README.md`
- **API Reference**: `/docs/api/API_DOCUMENTATION.md`
- **Quick Commands**: `/docs/QUICK_REFERENCE.md`
- **Testing Guide**: `/docs/API_QUICK_TEST_GUIDE.md`
- **Phase 4 Details**: `/docs/PHASE4_FINAL_SUMMARY.md`
- **Overall Status**: `/COMPLETION_REPORT.md`

---

## ✨ Success!

If you can:
1. ✅ Login successfully
2. ✅ See your dashboard
3. ✅ Upload a file
4. ✅ Download/share/delete files

Then you're ready to go! 🚀

---

*Quick Start Guide - Updated August 25, 2026*  
*For Questions: Review documentation or test credentials above*
