# Contributing to Teldock

Thank you for your interest in contributing to **Teldock**! This document provides guidelines and instructions for contributors who want to help improve the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Technical Guidelines](#technical-guidelines)
- [Security Policy](#security-policy)
- [Questions or Problems?](#questions-or-problems)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. All contributors are expected to:

- Be respectful and considerate of others
- Accept constructive criticism
- Focus on what's best for the community
- Demonstrate empathy toward fellow contributors

Unacceptable behavior will not be tolerated.

---

## Getting Started

### Prerequisites

Before you start contributing, ensure you have:

- **Node.js** 20+ (22.x recommended)
- **MySQL** or **MariaDB** (8.0+)
- **Git** installed and configured
- Basic understanding of:
  - JavaScript/ES6+
  - React and modern frontend tools
  - Express.js backend development
  - PostgreSQL/MySQL databases
  - RESTful API design

### Fork and Clone

```bash
# Fork the repository on GitHub, then clone it locally
git clone https://github.com/YOUR_USERNAME/Teldock.git
cd Teldock

# Add upstream remote
git remote add upstream https://github.com/Chaerulcp/Teldock.git
```

### Install Dependencies

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your local configuration

# Frontend
cd ../frontend
npm install
```

### Run Development Servers

In separate terminals:

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Access the app at `http://localhost:3000`.

---

## How to Contribute

### Finding Issues

Start with these issues if you're new to the project:

1. Look for issues labeled **`good first issue`** or **`help wanted`**
2. Read existing issues carefully before starting work
3. Comment on an issue to claim it (avoid duplicate work)

### Suggested Contribution Areas

#### 🐛 Bug Fixes
Perfect entry point for new contributors. Find broken functionality and submit fixes.

#### 📝 Documentation
Improve this README, CONTRIBUTING, or any missing documentation.

#### 🎨 UI/UX Enhancements
Improve accessibility, responsive design, or visual consistency.

#### ⚡ Performance
Optimize slow queries, reduce bundle size, improve streaming efficiency.

#### 🔒 Security
Report vulnerabilities (see [Security Policy](#security-policy)). Never disclose publicly.

#### ✨ New Features
Discuss new ideas in an issue first before implementing.

---

## Commit Guidelines

We use **[Conventional Commits](https://www.conventionalcommits.org/)** standard:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only changes |
| `style` | Changes that don't affect meaning (whitespace, formatting) |
| `refactor` | Code change that neither fixes nor features |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks, dependencies, tooling |

### Commit Examples

```bash
# Feature commit
git commit -m "feat(auth): add email verification flow"

# Bug fix
git commit -m "fix(upload): handle large file chunking properly"

# Documentation
git commit -m "docs(readme): clarify deployment requirements"

# Refactoring
git commit -m "refactor(models): simplify association definitions"

# Performance
git commit -m "perf(download): add backpressure handling to reduce memory"

# Test
git commit -m "test(share): add unit tests for shared link validation"
```

### What to Avoid

❌ Bad commits:
```bash
git commit -m "fixed stuff"
git commit -m "update"
git commit -m "WIP"
```

✅ Good commits:
```bash
git commit -m "fix(auth): validate email format on registration"
git commit -m "Add unit test for share token expiration"
```

---

## Pull Request Process

### 1. Branch Creation

Create a feature branch from `main`:

```bash
git checkout main
git pull upstream main

# Create branch following convention: type/scope/description
git checkout -b feat/email-verification
# Or: git checkout -b fix/upload-chunking-bug
```

### 2. Make Changes

- Follow project coding standards
- Write or update tests
- Update documentation if needed
- Test locally thoroughly

### 3. Test Before Submitting

```bash
# Run backend tests
cd backend
node --test tests/*.test.js

# Verify syntax
node --check src/**/*.js

# Build frontend
cd ../frontend
npm run build
```

### 4. Commit Your Changes

Use meaningful commit messages as described above.

### 5. Push and Create PR

```bash
git push origin feat/email-verification
```

Go to GitHub and create a Pull Request.

### 6. PR Template

Fill out the PR template completely:

- [ ] Description of changes
- [ ] Related issue number (if applicable)
- [ ] Testing done
- [ ] Screenshots (for UI changes)
- [ ] Breaking changes noted (if any)

### 7. Wait for Review

- Maintainers will review within reasonable time
- Be responsive to feedback
- Address requested changes in additional commits
- Don't force push unless necessary (may confuse reviewers)

### 8. Merge

Once approved and passing CI checks, maintainers will merge the PR.

---

## Technical Guidelines

### Architecture

Follow the layered architecture:

```
routes → controllers → services → models
```

**Rules:**
- Routes: Define endpoints, parse requests/responses
- Controllers: Business logic orchestration
- Services: Reusable business logic
- Models: Data access and schema

### Coding Standards

#### JavaScript Style

- Use `const` by default, `let` when reassignment needed
- Avoid `var`
- Prefer arrow functions for callbacks
- Use async/await over promises where readable
- Always handle errors explicitly

```javascript
// ✅ Good
async function getUser(id) {
  try {
    const user = await User.findByPk(id);
    return user;
  } catch (error) {
    console.error('Failed to get user:', error.message);
    throw error;
  }
}

// ❌ Bad
function getUser(id) {
  User.findByPk(id).then(user => {
    return user; // unhandled promise
  });
}
```

#### Naming Conventions

```javascript
// File names: snake_case or kebab-case
file-upload.service.js
webdav-controller.js

// Functions: camelCase
async fetchUserData(userId) {}
validateToken(token) {}

// Constants: UPPER_SNAKE_CASE
const MAX_UPLOAD_SIZE = 2 * 1024 * 1024 * 1024;

// Variables: camelCase
const uploadLimit = req.body.limit;
```

#### Error Handling

```javascript
// Use custom error classes when possible
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Always return consistent error responses
res.status(400).json({
  success: false,
  error: 'Validation failed'
});
```

### Database

- Use Sequelize query builder or raw queries appropriately
- Indexes must be added for frequently queried columns
- Transactions for multi-step operations
- Always validate inputs to prevent SQL injection

```javascript
// ✅ Good - using transactions
const t = await sequelize.transaction();
try {
  await File.create({ userId, folderId }, { transaction: t });
  await User.update({ storageUsedBytes }, { transaction: t });
  await t.commit();
} catch (error) {
  await t.rollback();
  throw error;
}
```

### Frontend

- Use functional components with hooks
- Manage state with Zustand (not Redux)
- Proper loading/error states
- Accessible forms and dialogs
- Responsive design for mobile/desktop

```javascript
import { useState } from 'react';
import { useAuthStore } from '../store/auth-store';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore(state => state.login);
  
  // form handling...
}
```

### Testing

- Write tests alongside features
- Aim for critical paths to be covered
- Use `node:test` framework
- Mock external services (Telegram API, etc.)

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');

test('uploadStream splits chunks correctly', async () => {
  const parts = ['abc', 'def'];
  // test implementation...
  assert.equal(result.chunks, 2);
});
```

---

## Security Policy

### Reporting Vulnerabilities

If you discover a security vulnerability:

1. **Do NOT disclose publicly**
2. Contact via email: `security@example.com` (replace with actual)
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Time

- Critical issues: 24-48 hours
- High severity: 1 week
- Medium/Low: 2 weeks

### Do NOT

- Open public PRs fixing security issues without coordination
- Share vulnerable code publicly
- Exploit vulnerabilities for personal gain

---

## Questions or Problems?

### Where to Ask

1. **GitHub Issues** - For questions about specific features/bugs
2. **Discussions** - For general questions, ideas, discussions
3. **Email** - For sensitive topics or urgent matters

### Before Asking

1. Search existing issues/discussions
2. Check documentation thoroughly
3. Try to reproduce the issue
4. Prepare minimal reproduction (if bug)

---

## Recognition

Contributors are acknowledged in:

- [`CONTRIBUTORS.md`](CONTRIBUTORS.md) - list of all contributors
- Release notes - significant contributions
- Project website/roadmap posts

### Contributor Types

- Code contributors
- Documentation writers
- Bug reporters
- Community helpers

---

## Thank You!

Your contributions make Teldock better for everyone. Whether it's fixing a typo, reporting a bug, or building a major feature—every contribution matters.

**Happy coding!** 🚀

---

*Last updated: August 29, 2026*
