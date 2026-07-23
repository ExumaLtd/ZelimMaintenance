import fs from 'fs';
import path from 'path';
import { chromium, type Browser } from '@playwright/test';

const authDir = path.join(__dirname, '.auth');
export const engineerState = path.join(authDir, 'engineer.json');
export const operatorState = path.join(authDir, 'operator.json');

async function logIn(browser: Browser, base: string, pin: string, statePath: string) {
  const page = await browser.newPage();
  await page.goto(base);
  await page.getByPlaceholder('Access code').fill(pin);
  await page.getByRole('button', { name: 'Enter portal' }).click();
  await page.waitForURL('**/portal/swift', { timeout: 30_000 });
  await page.context().storageState({ path: statePath });
  await page.context().close();
}

function writeEmptyState(statePath: string) {
  fs.writeFileSync(statePath, JSON.stringify({ cookies: [], origins: [] }));
}

/**
 * Logs in once per role and saves the session cookies for every test to
 * reuse. The login endpoint allows five attempts per five minutes per IP,
 * so tests must not each log in themselves. The operator pin is optional;
 * operator-only tests skip themselves without it.
 */
export default async function globalSetup() {
  fs.mkdirSync(authDir, { recursive: true });
  // State files must exist for browser contexts to be constructible even
  // when the suite is skipping itself.
  writeEmptyState(engineerState);
  writeEmptyState(operatorState);

  const base = process.env.E2E_BASE_URL;
  const pin = process.env.E2E_ACCESS_PIN;
  if (!base || !pin) return;

  const browser = await chromium.launch();
  await logIn(browser, base, pin, engineerState);
  if (process.env.E2E_OPERATOR_PIN) {
    await logIn(browser, base, process.env.E2E_OPERATOR_PIN, operatorState);
  }
  await browser.close();
}
