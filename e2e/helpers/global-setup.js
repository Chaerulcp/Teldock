// Global setup: verify the live stack is reachable before any test runs.
//
// If the Telegram credentials are missing the suite is skipped by the spec
// files, so we skip the reachability check too and exit quietly. When the
// credentials are present we fail fast with a clear, actionable message if the
// frontend or backend is not running.

const { getE2EConfig } = require('./env');

const TIMEOUT_MS = 5_000;

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    // Any HTTP response means the server is up (401/403/404 are all fine).
    return { ok: true, status: response.status };
  } catch (error) {
    return { ok: false, error: error.message };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function globalSetup() {
  const config = getE2EConfig();

  const hasTelegramCreds = Boolean(
    config.telegramBotToken && config.telegramChatId,
  );
  if (!hasTelegramCreds) {
    console.warn(
      '[e2e] TELEGRAM_BOT_TOKEN / TELEGRAM_STORAGE_CHAT_ID are not set in backend/.env.',
    );
    console.warn('[e2e] The suite will skip. See e2e/README.md for setup.');
    return;
  }

  const targets = [
    { name: 'frontend', url: `${config.frontendUrl}/` },
    { name: 'backend', url: `${config.apiUrl}/api/auth/me` },
  ];

  const failures = [];
  for (const target of targets) {
    const result = await probe(target.url);
    if (!result.ok) failures.push(target.name);
  }

  if (failures.length > 0) {
    throw new Error(
      [
        '',
        `[e2e] Cannot reach: ${failures.join(', ')}.`,
        '',
        'Start the stack before running the suite:',
        `  - backend:  cd backend && npm run dev   (expects ${config.apiUrl})`,
        `  - frontend: cd frontend && npm run dev  (expects ${config.frontendUrl})`,
        '',
        'See e2e/README.md for prerequisites.',
        '',
      ].join('\n'),
    );
  }
};
