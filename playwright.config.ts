import { defineConfig } from '@playwright/test';

/**
 * End-to-end suite for the portal. It runs against a deployed URL, normally
 * a Vercel preview, because the forms need a live session and Airtable.
 *
 *   E2E_BASE_URL=https://<preview>.vercel.app E2E_ACCESS_PIN=... npx playwright test
 *
 * Use a staging Airtable base for the preview (see .env.example) so the
 * suite never touches production data. Without both variables the suite
 * skips itself rather than failing.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
