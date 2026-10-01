# Teldock E2E share-flow tests

Playwright end-to-end coverage for the public share page (`/s/:token`) served by
`frontend/src/pages/ShareAccess.jsx`.

The suite creates its own throwaway data through the real API (register a user,
connect the Telegram bot, upload a small file, mint plain and password-protected
share links), drives a real browser against the frontend, and tears the data
down afterwards. No tokens or credentials are hardcoded or printed.

## Prerequisites

- Node.js 18 or newer.
- MySQL running and reachable with the connection settings in `backend/.env`.
- `backend/.env` configured with:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_STORAGE_CHAT_ID`
  - the usual database and `ENCRYPTION_KEY` values
  The bot must have permission to post documents to the storage chat.
- FFmpeg is **not** required for this suite.
- Chromium. The config reuses a browser already installed under the Playwright
  cache (`%LOCALAPPDATA%\ms-playwright` on Windows, `~/.cache/ms-playwright`
  elsewhere). If none is present, install one:

  ```
  npx playwright install chromium
  ```

## Start the stack

Run these in two separate terminals from the repository root.

```
cd backend && npm run dev
```

```
cd frontend && npm run dev
```

The suite expects the backend at `http://localhost:3001` and the frontend at
`http://localhost:3000`. If the frontend or backend is unreachable, the suite
fails immediately with a message telling you which one is down.

## Install and run

```
cd e2e
npm install
npm test
```

Useful variants:

```
npm run test:list     # list the tests without running them
npm run test:headed   # run with a visible browser
npm run test:ui       # open the Playwright UI mode
```

If the Telegram credentials are missing from `backend/.env`, the suite is
skipped with a clear message instead of failing.

## Configuration

All settings are optional and have localhost defaults.

| Variable                  | Default                 | Purpose                                             |
| ------------------------- | ----------------------- | --------------------------------------------------- |
| `E2E_FRONTEND_URL`        | `http://localhost:3000` | Frontend base URL used by the browser.              |
| `E2E_API_URL`             | `http://localhost:3001` | Backend base URL used for fixture setup/teardown.   |
| `TELEGRAM_BOT_TOKEN`      | from `backend/.env`     | Overrides the bot token used for the test fixture.  |
| `TELEGRAM_STORAGE_CHAT_ID`| from `backend/.env`     | Overrides the storage chat used for the fixture.    |
| `E2E_SHARE_PASSWORD`      | `e2e-share-secret-123`  | Password for the protected fixture link.            |
| `E2E_CHROMIUM_PATH`       | auto-detected           | Explicit Chromium executable to launch.             |
| `E2E_USE_MANAGED_BROWSER` | unset                   | Set to `1` to ignore the local cache and use Playwright's browser. |

## What is covered

1. A plain share link renders the filename, size and a Download button.
2. The Download control is a real button (blob fetch), not a plain anchor.
3. A password-protected link prompts for a password and shows the filename.
4. A wrong password shows an inline error and stays on the `/s/` route with no
   redirect to `/login`. This guards the invariant that the public share client
   must not use the shared axios instance's 401 interceptor.
5. The password form is still present after a wrong attempt.
6. The correct password unlocks the file.
7. An invalid token renders an error state instead of crashing.
8. No unhandled page errors occur (expected 401/403/404 network log lines and
   React Router future-flag warnings are excluded).

## Layout

```
e2e/
  package.json          Dependencies and npm scripts
  playwright.config.js  Base URL, browser reuse, reporters
  helpers/env.js        Reads backend/.env, resolves config
  helpers/api.js        API fixture setup and teardown
  helpers/global-setup.js  Reachability check for frontend + backend
  tests/share.spec.js   The assertions
```

## Conventions

This repository uses Conventional Commits. When adding or changing tests, use
messages such as:

```
test(e2e): cover protected share link wrong-password invariant
```

## Troubleshooting

- "Cannot reach: backend/frontend" - start the missing server and rerun.
- Suite skipped - add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_STORAGE_CHAT_ID` to
  `backend/.env`.
- Upload failures - confirm the bot can post documents to the configured chat
  and that the storage chat ID is correct.
