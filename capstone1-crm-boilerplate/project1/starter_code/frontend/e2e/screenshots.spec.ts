import { test, type Page } from '@playwright/test';
import { settled, signInAs } from './helpers.ts';

/**
 * A tour of every screen, as each role, saved as PNGs for the participant kit.
 * Only runs when asked:  SCREENSHOTS=1 npx playwright test screenshots
 * Reads only, never changes data (the validation shots are refused by the API).
 */

const OUT = process.env.SCREENSHOT_DIR ?? 'screenshots';

test.skip(!process.env.SCREENSHOTS, 'Set SCREENSHOTS=1 to capture the screenshot tour');
test.use({ viewport: { width: 1440, height: 900 } });

async function shot(page: Page, name: string, path?: string) {
  if (path) await page.goto(path);
  await settled(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

test('sign-in screens', async ({ page }) => {
  await shot(page, '01-login', '/login');
  await page.getByLabel('Email').fill('admin@nimbus.test');
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('alert').waitFor();
  await shot(page, '02-login-wrong-password');
  await shot(page, '03-login-session-expired', '/login?expired=1');
});

test('admin: Priya, Head of Inside Sales', async ({ page }) => {
  await signInAs(page, 'admin');
  await shot(page, '10-admin-dashboard', '/');
  await shot(page, '11-admin-contacts', '/contacts');
  await shot(page, '12-admin-contact-detail', '/contacts/C-00001');
  await shot(page, '13-admin-contact-edit', '/contacts/C-00001/edit');
  await shot(page, '14-admin-contact-new', '/contacts/new?account=A-0008');
  await shot(page, '15-admin-accounts', '/accounts');
  await shot(page, '16-admin-account-detail', '/accounts/A-0008');
  await shot(page, '17-admin-account-new', '/accounts/new');
  await shot(page, '18-admin-deals', '/deals');
  await shot(page, '19-admin-deal-detail', '/deals/D-00016');
  await shot(page, '20-admin-deal-new', '/deals/new');

  // The server's own messages, beside each field.
  await page.getByLabel('Account').selectOption({ label: 'Sable Ridge Insurance' });
  await page.getByLabel('Contact').selectOption({ index: 1 });
  await page.getByLabel('Value (GBP)').fill('0');
  await page.getByLabel('Expected close date').fill('2020-01-01');
  await page.getByRole('button', { name: 'Create deal' }).click();
  await page.locator('.invalid-feedback').first().waitFor();
  await shot(page, '21-admin-deal-new-validation');

  await shot(page, '22-admin-deal-edit', '/deals/D-00001/edit');
  await shot(page, '23-admin-pipeline', '/pipeline');
});

test('rep: Aisha, sales rep', async ({ page }) => {
  await signInAs(page, 'aisha');
  await shot(page, '30-rep-dashboard', '/');
  await shot(page, '31-rep-my-deals', '/deals');
  await shot(page, '32-rep-deal-detail', '/deals/D-00001');

  // Choosing a move that needs more information: winning asks for a close date.
  await page.goto('/deals/D-00019');
  await settled(page);
  const target = page.getByLabel(/Move to/);
  if (await target.count()) {
    await target.selectOption('WON');
    await shot(page, '33-rep-stage-move-win');
  }

  await shot(page, '34-rep-pipeline', '/pipeline');
  await shot(page, '35-rep-contact-detail', '/contacts/C-00002');
  await shot(page, '36-rep-accounts', '/accounts');
  await shot(page, '37-rep-forbidden', '/deals/new');
  await shot(page, '38-rep-other-reps-deal', '/deals/D-00016');
});
