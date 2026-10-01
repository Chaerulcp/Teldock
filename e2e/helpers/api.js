// API setup helpers for the e2e share-flow suite.
//
// Everything here talks to the real backend API to create throwaway fixtures:
// register a user, connect the Telegram bot from backend/.env, upload a small
// file, and mint a plain + password-protected share link. No tokens are ever
// hardcoded and no secrets are logged.

const { getE2EConfig } = require('./env');

// Deterministic file body so the rendered size is predictable.
const FILE_NAME = 'teldock-testfile.txt';
const FILE_CONTENT = 'Teldock end-to-end share fixture.\n' + 'A'.repeat(64);

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Thin fetch wrapper. Throws a descriptive error on a non-2xx response without
 * ever including credentials in the message.
 */
async function apiRequest(url, { method = 'GET', token, body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (formData) {
    payload = formData; // fetch sets the multipart boundary itself.
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(url, { method, headers, body: payload });
  const text = await response.text();

  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const detail = parsed && parsed.error ? parsed.error : text.slice(0, 200);
    throw new Error(
      `${method} ${url} failed with ${response.status}${detail ? `: ${detail}` : ''}`,
    );
  }

  return parsed;
}

function uniqueEmail() {
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `e2e-share-${stamp}-${rand}@example.com`;
}

async function registerUser(config) {
  const data = await apiRequest(`${config.apiUrl}/api/auth/register`, {
    method: 'POST',
    body: { email: uniqueEmail(), password: 'e2e-Passw0rd-123' },
  });
  return {
    userId: data.data.user.id,
    accessToken: data.data.accessToken,
  };
}

async function connectTelegram(config, token) {
  await apiRequest(`${config.apiUrl}/api/user/telegram/connect`, {
    method: 'POST',
    token,
    body: {
      botToken: config.telegramBotToken,
      chatId: config.telegramChatId,
      chatType: 'channel',
    },
  });
}

async function uploadFile(config, token) {
  const form = new FormData();
  form.append('file', new Blob([FILE_CONTENT], { type: 'text/plain' }), FILE_NAME);

  const data = await apiRequest(`${config.apiUrl}/api/files/upload`, {
    method: 'POST',
    token,
    formData: form,
  });
  return data.data.file;
}

async function createShareLink(config, token, fileId, options = {}) {
  const data = await apiRequest(
    `${config.apiUrl}/api/files/${fileId}/share`,
    {
      method: 'POST',
      token,
      body: options,
    },
  );
  return data.data.link;
}

function extractToken(shortUrl) {
  const marker = '/s/';
  const idx = shortUrl.lastIndexOf(marker);
  return idx === -1 ? shortUrl : shortUrl.slice(idx + marker.length);
}

/**
 * Create the full fixture set. Returns everything the specs need to navigate
 * and assert, including the tokens to tear down afterwards.
 */
async function setupShareFixtures() {
  const config = getE2EConfig();

  if (!config.telegramBotToken || !config.telegramChatId) {
    throw new Error(
      'Telegram credentials are missing. The suite should have skipped before setup ran.',
    );
  }

  const auth = await registerUser(config);
  await connectTelegram(config, auth.accessToken);

  const file = await uploadFile(config, auth.accessToken);

  const plainLink = await createShareLink(config, auth.accessToken, file.id, {});
  const protectedLink = await createShareLink(config, auth.accessToken, file.id, {
    password: config.sharePassword,
  });

  return {
    config,
    accessToken: auth.accessToken,
    fileId: file.id,
    filename: file.displayFilename || file.originalFilename,
    expectedSizeLabel: formatFileSize(Number(file.fileSize)),
    password: config.sharePassword,
    plainToken: extractToken(plainLink.shortUrl),
    protectedToken: extractToken(protectedLink.shortUrl),
  };
}

/**
 * Best-effort teardown: remove the uploaded file (and its Telegram message)
 * and unlink the throwaway user's Telegram config.
 */
async function teardownShareFixtures(fixtures) {
  if (!fixtures) return;
  const { config, accessToken, fileId } = fixtures;

  try {
    await apiRequest(
      `${config.apiUrl}/api/files/${fileId}?deleteFromTelegram=true`,
      { method: 'DELETE', token: accessToken },
    );
  } catch (error) {
    console.warn(`[e2e] Teardown: could not delete file: ${error.message}`);
  }

  try {
    await apiRequest(`${config.apiUrl}/api/user/telegram/unlink`, {
      method: 'DELETE',
      token: accessToken,
    });
  } catch (error) {
    console.warn(`[e2e] Teardown: could not unlink Telegram: ${error.message}`);
  }
}

module.exports = {
  FILE_NAME,
  FILE_CONTENT,
  formatFileSize,
  setupShareFixtures,
  teardownShareFixtures,
  extractToken,
};
