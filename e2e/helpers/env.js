// Shared environment handling for the e2e suite.
//
// Telegram credentials live in `backend/.env`. They are read at runtime and
// never written to disk, logged, or embedded in the committed tests.

const fs = require('fs');
const path = require('path');

const BACKEND_ENV_PATH = path.resolve(__dirname, '..', '..', 'backend', '.env');

/**
 * Minimal .env parser. Supports `KEY=value`, optional surrounding quotes, and
 * ignores blank lines and `#` comments. Values are never echoed.
 */
function parseEnvFile(contents) {
  const result = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) result[key] = value;
  }
  return result;
}

/**
 * Read backend/.env if present. Returns an empty object when the file is
 * missing so callers can skip gracefully instead of crashing.
 */
function loadBackendEnv() {
  try {
    if (!fs.existsSync(BACKEND_ENV_PATH)) return {};
    return parseEnvFile(fs.readFileSync(BACKEND_ENV_PATH, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Resolve the suite's runtime configuration. Credentials are pulled from
 * backend/.env first, then the process environment (so CI can inject them).
 */
function getE2EConfig() {
  const backendEnv = loadBackendEnv();
  return {
    frontendUrl: process.env.E2E_FRONTEND_URL || 'http://localhost:3000',
    apiUrl: process.env.E2E_API_URL || 'http://localhost:3001',
    telegramBotToken:
      process.env.TELEGRAM_BOT_TOKEN || backendEnv.TELEGRAM_BOT_TOKEN || '',
    telegramChatId:
      process.env.TELEGRAM_STORAGE_CHAT_ID ||
      backendEnv.TELEGRAM_STORAGE_CHAT_ID ||
      '',
    sharePassword: process.env.E2E_SHARE_PASSWORD || 'e2e-share-secret-123',
  };
}

/**
 * Truncate an opaque token for debug output. Never log a full secret.
 */
function redact(value, visible = 4) {
  if (!value) return '<empty>';
  const text = String(value);
  if (text.length <= visible) return '***';
  return `${text.slice(0, visible)}…(${text.length} chars)`;
}

module.exports = {
  BACKEND_ENV_PATH,
  loadBackendEnv,
  getE2EConfig,
  parseEnvFile,
  redact,
};
