# Teldock User Guide

A complete guide for end users of **Teldock** cloud storage. This document covers account setup, file management, security features, and troubleshooting.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Account Setup](#account-setup)
- [Telegram Configuration](#telegram-configuration)
- [File Management](#file-management)
- [Folders & Organization](#folders--organization)
- [Sharing Files](#sharing-files)
- [WebDAV Mounting](#webdav-mounting)
- [Security Settings](#security-settings)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Getting Started

### What You Need

1. A valid email address
2. A strong password (min 8 characters)
3. Your own Telegram bot token
4. A private Telegram channel you control

### First Time Login

1. Navigate to your Teldock instance URL
2. Click **Register**
3. Enter your email and create a password
4. Check your email if verification is enabled
5. Login with your credentials

---

## Account Setup

### Registering an Account

```
1. Go to http://your-instance.com/login
2. Click "Create Account" or "Register"
3. Fill in:
   - Email address
   - Password (mix of letters, numbers, symbols)
   - Confirm password
4. Submit the form
5. Start using immediately (or verify email if required)
```

### Logging In

```
1. Visit the login page
2. Enter your registered email
3. Enter your password
4. Click "Login"
5. You're authenticated until you logout or timeout
```

### Password Recovery

If you forget your password:

```
1. Click "Forgot Password?" on login page
2. Enter your registered email
3. Check your inbox for reset link
4. Click the link and set new password
5. Login with new credentials
```

---

## Telegram Configuration

Teldock requires each user to connect their own Telegram bot and storage channel. Here's how:

### Step 1: Create a Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` command
3. Follow prompts to name your bot
4. Choose a username (must end in 'bot')
5. BotFather returns your **bot token** (looks like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
6. **Save this token securely**—you'll need it!

### Step 2: Create a Storage Channel

1. In Telegram, click **New Chat** → **New Channel**
2. Name it something descriptive (e.g., "My Cloud Storage")
3. Make it **Private** (not public)
4. Add your newly created bot as an admin
5. Give the bot these permissions:
   - ✅ Post Messages
   - ✅ Delete Messages
   - ✅ Manage Chat
6. Copy your **channel ID**:
   - Send any message to the channel
   - Forward it to **@userinfobot**
   - The bot replies with your chat ID (a number starting with `-100`)

### Step 3: Connect in Teldock

1. In Teldock, go to **Settings** → **Telegram Integration**
2. Paste your **bot token**
3. Paste your **channel ID**
4. Select chat type (**Channel**)
5. Click **Connect**
6. If successful, you'll see a confirmation message

### Verify Connection

After connecting:
- Upload a test file to confirm everything works
- Check the channel—it should contain your test file
- Try downloading it back from Teldock

---

## File Management

### Uploading Files

#### Via Web Interface

1. Navigate to the folder where you want to upload
2. Click **Upload** button (or drag & drop files)
3. Select files from your computer
4. Wait for upload progress to complete
5. Files appear in the folder list

#### Options During Upload

- **Encrypt**: Toggle encryption per-file (AES-256-CTR)
- **Folder selection**: Choose destination folder
- **Priority**: Large files can be queued

#### Supported File Types

All file types are supported:
- Documents (PDF, DOCX, XLSX, etc.)
- Images (JPG, PNG, GIF, WEBP, etc.)
- Videos (MP4, MKV, AVI, etc.)
- Archives (ZIP, RAR, 7Z, etc.)
- Any other binary data

### Downloading Files

#### Single File

1. Click the **Download** icon/button next to file
2. File downloads to your default download location
3. Resumable downloads supported if connection drops

#### Multiple Files

1. Select multiple files using checkboxes
2. Click **Download** button
3. Archived into ZIP format automatically

#### Direct Link

For large files:
1. Click **Share** → **Copy Direct Link**
2. Paste in browser or download manager
3. Continue even after closing Teldock

### Viewing Files

#### Image Previews

1. Click on an image file
2. Preview opens inline in browser
3. Navigate between images in same folder
4. Resize options available

#### PDF Files

1. Click on PDF file
2. PDF viewer loads in iframe
3. Zoom controls available
4. Print/download options

#### Video/Audio Playback

1. Click media file
2. Built-in player opens
3. Progress bar for seeking
4. Volume and fullscreen controls

### File Operations

#### Rename

```
1. Right-click on file
2. Select "Rename"
3. Enter new filename
4. Press Enter or click Save
```

#### Move/Copy

```
1. Select source file(s)
2. Right-click → "Move to Folder"
3. Choose destination folder
4. Confirm action
```

#### Delete

```
1. Select file(s)
2. Click "Delete" (trash icon)
3. File goes to soft-deleted state
4. Recoverable within retention period
```

### Search & Filter

#### Basic Search

```
1. Use search box in toolbar
2. Type filename or part of it
3. Results filter in real-time
```

#### Advanced Filters

Available filters:
- **By Folder**: Select parent folder
- **By Type**: Image, Video, Document, etc.
- **By Size**: Small (<1MB), Medium, Large
- **By Date**: Recent week, month, year
- **Favorites Only**: Starred files only
- **Tags**: Filter by applied tags
- **Shared**: Only shared files visible

#### Smart Folders

Create saved searches:
```
1. Set up desired filters
2. Click "Save as Smart Folder"
3. Give it a memorable name
4. Access anytime from sidebar
```

---

## Folders & Organization

### Creating Folders

```
Method 1:
1. Right-click in empty space
2. Select "New Folder"
3. Enter folder name
4. Press Enter

Method 2:
1. Click "+" in toolbar
2. Select "New Folder"
3. Name and confirm
```

### Organizing Structure

Best practices:
```
/ (Root)
├── Work
│   ├── Projects
│   ├── Meetings
│   └── Templates
├── Personal
│   ├── Photos
│   │   ├── 2024
│   │   └── 2025
│   └── Documents
└── Archives
```

### Bulk Operations

Select multiple items:
- **Click + Shift**: Range selection
- **Ctrl/Cmd + Click**: Individual selection
- **Drag**: Box selection area

Then apply operations:
- Move to different folders
- Delete multiple at once
- Rename with batch options
- Copy together

### Favorites / Stars

Quick access to important files:
```
1. Hover over file
2. Click star icon
3. Access via "Favorites" view
```

---

## Sharing Files

### Creating Share Links

#### Basic Share

```
1. Right-click file/folder
2. Select "Share"
3. Configure options:
   - Expiration time (never, 1 day, 7 days, etc.)
   - Download limit (unlimited or specific count)
   - Password protection (optional)
4. Generate link
5. Copy and share
```

### Public Share Settings

| Option | Description |
|--------|-------------|
| **Expiration** | When link becomes invalid |
| **Download Limit** | Max times link can be used |
| **Password** | Require password before access |
| **Allow Preview** | Show preview without download |
| **Allow Download** | Permit direct download |

### Managing Shared Links

From **Shares** section:
```
View all active shares
→ See who downloaded what
→ Revoke individual links
→ Get analytics (views, downloads)
```

### Share Notifications

Get notified when:
- Someone downloads your shared file
- Download limit reached
- Link expires

Configure in **Settings → Notifications**

---

## WebDAV Mounting

Mount your Teldock storage directly to your operating system.

### Windows (via NetDrive/RaiDrive)

1. Install WebDAV client software
2. Add new WebDAV server:
   - URL: `http://teldock.yourdomain.com/webdav`
   - Username: Your email
   - Password: Your Teldock password
3. Map as network drive
4. Access like local folders

### Linux

```bash
# Using rclone
rclone config add teldock webdav
# Follow prompts:
# Base URL: http://teldock.example.com/webdav
# User: your@email.com
# Pass: your-password

# Mount
mkdir ~/teldock
rclone mount teldock: ~/teldock --daemon
```

### macOS

Using Mountain Duck or FUSE:
```bash
# Terminal
brew install --cask macfuse
fusesync http://teldock.example.com/webdav \
  -o username=your@email.com \
  -o password=your-password
```

### Benefits

- Native OS integration
- No upload/download needed—access directly
- Background sync capabilities
- Works with any WebDAV-compatible app

---

## Security Settings

### Two-Factor Authentication (if enabled)

1. Go to **Settings → Security**
2. Enable 2FA
3. Scan QR code with authenticator app
4. Enter verification codes
5. Save backup codes securely

### Change Password

```
1. Settings → Account
2. Click "Change Password"
3. Enter current password
4. New password twice
5. Update
```

### Active Sessions

Monitor and manage:
```
1. Settings → Active Sessions
2. View logged-in devices
3. Kill suspicious sessions
4. See last login times
```

### Encrypted Files

Enable per-file encryption:
```
1. Select file during upload
2. Toggle "Encrypt" option
3. File stored encrypted on Telegram
4. Decrypt on-the-fly during download
```

⚠️ **Warning:** Lost encryption key = lost file. Keep backups.

---

## Troubleshooting

### Common Issues

#### Cannot Upload Files

**Symptom:** Upload fails or hangs

**Solutions:**
1. Check internet connection
2. Verify Telegram bot token is valid
3. Ensure bot has permission to post in channel
4. Reduce file size or retry later
5. Check Telegram rate limits (try again in 5 minutes)

#### Cannot Download Files

**Symptom:** Download error or 404

**Solutions:**
1. Verify file wasn't deleted
2. Check if share link expired
3. Clear browser cache
4. Try different browser
5. Contact support if issue persists

#### Preview Not Working

**Symptom:** Can't view images/PDFs

**Solutions:**
1. Browser may not support feature
2. File might be too large (>25MB)
3. Browser extensions blocking previews
4. Try desktop vs mobile view
5. Download instead of preview

#### Slow Upload/Download

**Symptom:** Very slow transfer speeds

**Possible Causes:**
- Internet bandwidth limited
- Telegram API rate limiting
- Too many concurrent uploads
- Large file requiring chunking

**Fixes:**
1. Upload during off-peak hours
2. Use fewer simultaneous transfers
3. Add more bots to pool
4. Contact hosting provider about bandwidth

### Database Errors

```
Cannot connect to database
→ Verify .env DB_HOST, DB_USER, DB_PASSWORD
→ Ensure MySQL/MariaDB is running
→ Run: npm run migrate
→ Restart backend service
```

### Memory Issues

```
Node.js out of memory
→ Increase Node.js memory limit:
  NODE_OPTIONS="--max-old-space-size=4096"
→ Optimize large file handling
→ Use streaming mode
→ Restart service
```

---

## FAQ

### Frequently Asked Questions

**Q: How much storage do I get?**  
A: Depends on your Telegram account/channel capacity. Generally unlimited for practical purposes.

**Q: Can I use personal files safely?**  
A: Yes, but keep important backups elsewhere. Telegram can delete channels without notice.

**Q: Do files count against my Telegram quota?**  
A: Yes, they count toward your bot's storage limit on Telegram servers.

**Q: Is data really encrypted?**  
A: Optional AES-256-CTR encryption per file. Enabled only if you toggle the option.

**Q: What happens if Telegram bans my bot?**  
A: Lose access to those files. Keep alternative backups and don't abuse the platform.

**Q: Can I share files publicly?**  
A: Yes, generate share links with optional password protection.

**Q: Does Teldock collect my data?**  
A: No, it's self-hosted. You control all data. No telemetry or analytics.

**Q: How do I recover deleted files?**  
A: Soft-deleted files remain until permanently removed. Restore from recycle bin.

**Q: What browsers are supported?**  
A: Modern browsers (Chrome, Firefox, Safari, Edge) from last 2 versions.

**Q: Mobile app available?**  
A: Web interface is mobile-responsive. Native apps planned for future.

---

## Additional Resources

- [API Documentation](README.md#api-reference)
- [Security Improvements](SECURITY_CHANGES.md)
- [Contribution Guide](CONTRIBUTING.md)
- [GitHub Issues](https://github.com/Chaerulcp/Teldock/issues)

---

*User Guide v1.0 - Last Updated: August 29, 2026*
