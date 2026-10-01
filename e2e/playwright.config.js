// Playwright configuration for the Teldock end-to-end share-flow suite.
//
// The suite runs against a live stack:
//   - frontend dev server on http://localhost:3000  (serves /s/:token)
//   - backend  API server on http://localhost:3001  (proxied by Vite at /api)
//
// Both are configurable via E2E_FRONTEND_URL and E2E_API_URL.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { defineConfig, devices } = require('@playwright/test');

const FRONTEND_URL = process.env.E2E_FRONTEND_URL || 'http://localhost:3000';
const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

/**
 * Locate a Chromium build that is already installed on this machine so the
 * suite can run without a fresh `playwright install`. Playwright normally
 * manages its own browser cache; when a usable build exists we point the
 * launch options at it directly.
 *
 * Set E2E_CHROMIUM_PATH to override, or E2E_USE_MANAGED_BROWSER=1 to ignore
 * the local cache and let Playwright resolve the browser itself.
 */
function findInstalledChromium() {
  if (process.env.E2E_CHROMIUM_PATH) {
    return fs.existsSync(process.env.E2E_CHROMIUM_PATH)
      ? process.env.E2E_CHROMIUM_PATH
      : null;
  }
  if (process.env.E2E_USE_MANAGED_BROWSER === '1') return null;

  const cacheRoots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'ms-playwright'),
    path.join(os.homedir(), '.cache', 'ms-playwright'),
    path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'),
  ].filter(Boolean);

  const candidates = [
    ['chrome-win64', 'chrome.exe'],
    ['chrome-linux', 'chrome'],
    ['chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'],
  ];

  for (const root of cacheRoots) {
    if (!fs.existsSync(root)) continue;
    const dirs = fs
      .readdirSync(root)
      .filter((d) => /^chromium-\d+$/.test(d))
      .sort()
      .reverse();
    for (const dir of dirs) {
      for (const rel of candidates) {
        const exe = path.join(root, dir, ...rel);
        if (fs.existsSync(exe)) return exe;
      }
    }
  }
  return null;
}

const chromiumPath = findInstalledChromium();
if (chromiumPath) {
  console.log(`[e2e] Reusing installed Chromium: ${chromiumPath}`);
} else {
  console.log('[e2e] No local Chromium cache found; using Playwright-managed browser.');
}

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  globalSetup: require.resolve('./helpers/global-setup.js'),
  // Generous: fixture setup performs a real Telegram upload before tests run.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
