import { test, expect } from '@playwright/test';
import { engineerState, operatorState } from './global-setup';

/**
 * Mirrors the manual release walkthrough: log in with an access code, land
 * on the dashboard, open every form, and prove empty submits are blocked.
 * Read-only by design. Nothing here completes a submission, so the suite is
 * safe to run against any environment, though a staging Airtable base is
 * still preferred because login attempts count toward rate limits.
 *
 * Login happens once per role in global-setup.ts and the sessions are
 * shared through storageState; the login endpoint allows five attempts per
 * five minutes. E2E_ACCESS_PIN is an engineer (maintenance) pin, and the
 * dashboard shows engineers the annual, depth, and unscheduled forms.
 * Operator-only coverage (monthly, fault reporting) needs E2E_OPERATOR_PIN
 * and skips itself without it.
 */

const noSession = { cookies: [], origins: [] };

test.skip(
  !process.env.E2E_BASE_URL || !process.env.E2E_ACCESS_PIN,
  'Set E2E_BASE_URL and E2E_ACCESS_PIN to run the portal e2e suite'
);

test.describe('without a session', () => {
  test.use({ storageState: noSession });

  test('rejects an invalid access code without leaving the landing page', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Access code').fill('XXX000');
    await page.getByRole('button', { name: 'Enter portal' }).click();
    // Generous timeout: the failed attempt round-trips the login endpoint.
    await expect(page.locator('p.text-danger')).not.toHaveText('', { timeout: 20_000 });
    await expect(page).toHaveURL(/\/$/);
  });

  test('denies portal routes to unauthenticated visitors', async ({ page }) => {
    const response = await page.goto('/portal/swift');
    // The proxy must not serve the dashboard without a session.
    expect(response?.url()).not.toContain('/portal/swift');
  });
});

test.describe('as engineer', () => {
  test.use({ storageState: engineerState });

  test('shows the engineer maintenance dashboard', async ({ page }) => {
    await page.goto('/portal/swift');
    for (const form of ['annual', 'depth', 'unscheduled']) {
      await expect(page.locator(`a[href^="/portal/swift/${form}"]`)).toBeVisible();
    }
    // Monthly and fault reporting are operator forms and must not be offered.
    await expect(page.locator('a[href^="/portal/swift/monthly"]')).toHaveCount(0);
    await expect(page.locator('a[href^="/portal/swift/fault-reporting"]')).toHaveCount(0);
  });

  for (const form of ['unscheduled', 'annual', 'depth']) {
    test(`renders the ${form} form`, async ({ page }) => {
      await page.goto(`/portal/swift/${form}`);
      // Every form starts with the shared admin card location and date fields.
      await expect(page.locator('label', { hasText: 'Location' }).first()).toBeVisible();
      await expect(page.locator('label', { hasText: 'Date' }).first()).toBeVisible();
    });
  }

  test('blocks an empty unscheduled submission with validation errors', async ({ page }) => {
    await page.goto('/portal/swift/unscheduled');
    await page.getByRole('button', { name: 'Submit maintenance' }).click();
    // Still on the form, not the completion page, with error styling shown.
    await expect(page).toHaveURL(/unscheduled$/);
    await expect(page.locator('.has-error').first()).toBeVisible();
  });
});

test.describe('as operator', () => {
  test.skip(!process.env.E2E_OPERATOR_PIN, 'Set E2E_OPERATOR_PIN for operator coverage');
  test.use({ storageState: operatorState });

  test('shows the operator dashboard', async ({ page }) => {
    await page.goto('/portal/swift');
    for (const form of ['monthly', 'unscheduled', 'fault-reporting']) {
      await expect(page.locator(`a[href^="/portal/swift/${form}"]`)).toBeVisible();
    }
    // Annual and depth are engineer forms and must not be offered.
    await expect(page.locator('a[href^="/portal/swift/annual"]')).toHaveCount(0);
    await expect(page.locator('a[href^="/portal/swift/depth"]')).toHaveCount(0);
  });

  for (const form of ['monthly', 'fault-reporting']) {
    test(`renders the ${form} form`, async ({ page }) => {
      await page.goto(`/portal/swift/${form}`);
      await expect(page.locator('label', { hasText: 'Location' }).first()).toBeVisible();
      await expect(page.locator('label', { hasText: 'Date' }).first()).toBeVisible();
    });
  }
});
