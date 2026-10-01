// End-to-end coverage for the public share page (`/s/:token`).
//
// Preserved from the original throwaway script: plain-link rendering, the
// blob-based Download button, password gating, the wrong-password invariant
// (inline error + no /login redirect), invalid-token handling, and a check
// that no unhandled page errors occur.
//
// All fixtures (user, Telegram connection, file, share links) are created
// against the live API in `beforeAll` and torn down in `afterAll`.

const { test, expect } = require('@playwright/test');
const { setupShareFixtures, teardownShareFixtures } = require('../helpers/api');
const { getE2EConfig } = require('../helpers/env');

const config = getE2EConfig();
const hasTelegramCreds = Boolean(
  config.telegramBotToken && config.telegramChatId,
);

// Without Telegram credentials the whole suite is meaningless; skip with a
// clear, actionable reason instead of failing on setup.
test.skip(
  !hasTelegramCreds,
  'TELEGRAM_BOT_TOKEN / TELEGRAM_STORAGE_CHAT_ID not set in backend/.env - see e2e/README.md',
);

let fixtures;

// Console/page errors accumulate across the run; the final test asserts none
// were genuine.
const pageErrors = [];

test.beforeAll(async () => {
  fixtures = await setupShareFixtures();
});

test.afterAll(async () => {
  await teardownShareFixtures(fixtures);
});

test.beforeEach(async ({ page }) => {
  page.on('console', (msg) => {
    if (msg.type() === 'error') pageErrors.push(msg.text());
  });
  page.on('pageerror', (error) => {
    pageErrors.push(`pageerror: ${error.message}`);
  });
});

test('plain share link renders filename, size and a Download button', async ({
  page,
}) => {
  await page.goto(`/s/${fixtures.plainToken}`, { waitUntil: 'networkidle' });

  await expect(
    page.getByRole('heading', { name: fixtures.filename }),
  ).toBeVisible();
  await expect(
    page.getByText(fixtures.expectedSizeLabel, { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /download/i })).toBeVisible();
});

test('Download control is a real button (blob fetch), not a plain anchor', async ({
  page,
}) => {
  await page.goto(`/s/${fixtures.plainToken}`, { waitUntil: 'networkidle' });

  const downloadButton = page.getByRole('button', { name: /download/i });
  await expect(downloadButton).toBeVisible();

  // The share page fetches the bytes as a blob and clicks a synthetic anchor,
  // so no persistent <a download> element should exist in the DOM.
  await expect(page.locator('a[download]')).toHaveCount(0);
});

test('password-protected link prompts for a password and names the file', async ({
  page,
}) => {
  await page.goto(`/s/${fixtures.protectedToken}`, {
    waitUntil: 'networkidle',
  });

  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(
    page.getByText(fixtures.filename, { exact: false }),
  ).toBeVisible();
});

test('wrong password shows an inline error and stays on /s/ (no /login redirect)', async ({
  page,
}) => {
  await page.goto(`/s/${fixtures.protectedToken}`, {
    waitUntil: 'networkidle',
  });

  await page.fill('input[type="password"]', 'definitely-wrong');
  await page.getByRole('button', { name: /unlock file/i }).click();

  // Inline error, not a redirect. This guards the invariant that the public
  // client must not use the shared axios instance's 401 -> /login interceptor.
  await expect(page.getByRole('alert')).toContainText(/incorrect password/i);
  expect(page.url()).toContain('/s/');
  expect(page.url()).not.toContain('/login');
});

test('password form is still present after a wrong attempt', async ({
  page,
}) => {
  await page.goto(`/s/${fixtures.protectedToken}`, {
    waitUntil: 'networkidle',
  });

  await page.fill('input[type="password"]', 'definitely-wrong');
  await page.getByRole('button', { name: /unlock file/i }).click();
  await expect(page.getByRole('alert')).toContainText(/incorrect password/i);

  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /unlock file/i }),
  ).toBeVisible();
});

test('correct password unlocks the file', async ({ page }) => {
  await page.goto(`/s/${fixtures.protectedToken}`, {
    waitUntil: 'networkidle',
  });

  await page.fill('input[type="password"]', fixtures.password);
  await page.getByRole('button', { name: /unlock file/i }).click();

  await expect(page.getByRole('button', { name: /download/i })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(page.url()).toContain('/s/');
});

test('invalid token renders an error state instead of crashing', async ({
  page,
}) => {
  await page.goto('/s/not-a-real-token', { waitUntil: 'networkidle' });

  await expect(
    page.getByRole('heading', { name: /can't be opened/i }),
  ).toBeVisible();
});

test('no unhandled page errors across the suite', async () => {
  // Expected network noise: the 401 from a wrong password and the 403 from an
  // invalid token are the contract, not defects. React Router future-flag
  // warnings and the DevTools hint are likewise not failures.
  const ignored = [
    /React Router Future Flag/i,
    /Download the React DevTools/i,
    /Failed to load resource/i,
    /the server responded with a status of (401|403|404)/i,
  ];

  const realErrors = pageErrors.filter(
    (text) => !ignored.some((pattern) => pattern.test(text)),
  );

  expect(
    realErrors,
    `Unexpected page errors:\n${realErrors.join('\n')}`,
  ).toEqual([]);
});
