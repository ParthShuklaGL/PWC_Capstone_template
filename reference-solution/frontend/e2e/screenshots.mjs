// Retakes the nine screenshots published in nimbus_crm/docs/screenshots from the running app.
//   npm run screenshots                        writes into ../../nimbus_crm/docs/screenshots
//   SCREENSHOT_DIR=some/folder npm run screenshots
// Needs the API in Development (it seeds the data these pictures show) and this frontend running.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMIN, BASE, DEMO, freshPage, launch, signIn } from './browser.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(process.env.SCREENSHOT_DIR ?? path.join(here, '../../../nimbus_crm/docs/screenshots'));
fs.mkdirSync(OUT, { recursive: true });

const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });

async function reportsReady(page, sections) {
  await page.getByRole('heading', { name: 'Reports' }).waitFor();
  await page.locator('section.report').nth(sections - 1).locator('tbody tr').first().waitFor();
}

const browser = await launch();
try {
  // Three named people make the users list and the "activities per user" report read like a real team.
  const setup = await browser.newContext();
  for (const name of ['alice', 'bob', 'carol']) {
    await setup.request.post(`${BASE}api/auth/register`, { data: { username: name, email: `${name}@example.com`, password: 'Sample-Pass-2026' } }); // 409 when they already exist
  }
  await setup.close();

  {
    const { context, page } = await freshPage(browser, { width: 900, height: 700 });
    await page.getByRole('heading', { name: 'Sign in to Nimbus CRM' }).waitFor();
    await shot(page, '01-sign-in');

    await page.getByLabel('Username').fill(DEMO.username);
    await page.getByLabel('Password').fill('not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('alert').waitFor();
    await shot(page, '02-sign-in-wrong-password');

    await page.reload();
    await page.getByRole('button', { name: 'Create an account' }).click();
    await page.getByLabel('Username').fill('x');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('short');
    await page.getByRole('button', { name: 'Create account and sign in' }).click();
    await page.locator('.field-error').first().waitFor();
    await shot(page, '03-register-validation');
    await context.close();
  }

  {
    const { context, page } = await freshPage(browser, { height: 900 });
    await signIn(page, 'Jwt', ADMIN);
    await reportsReady(page, 4);
    await shot(page, '04-reports-admin');
    await page.getByRole('link', { name: 'Users' }).click();
    await page.locator('tbody tr').first().waitFor();
    await shot(page, '05-users-admin');
    await context.close();
  }

  {
    const { context, page } = await freshPage(browser, { height: 900 });
    await signIn(page, 'Cookie', DEMO);
    await reportsReady(page, 3);
    await shot(page, '06-reports-user');
    await page.goto(`${BASE}users`);
    await page.getByRole('heading', { name: /do not have access/i }).waitFor();
    await shot(page, '07-no-access');
    await context.close();
  }

  {
    const { context, page } = await freshPage(browser, { width: 900, height: 700 });
    await signIn(page, 'Jwt', ADMIN);
    await reportsReady(page, 4);
    const token = await page.evaluate(() => sessionStorage.getItem('nimbus.jwt'));
    await context.request.post(`${BASE}api/auth/logout`, { headers: { Authorization: `Bearer ${token}` } });
    await page.getByRole('link', { name: 'Users' }).click();
    await page.getByRole('status').waitFor();
    await shot(page, '08-session-ended');
    await context.close();
  }

  {
    const { context, page } = await freshPage(browser, { width: 390, height: 844, colorScheme: 'dark' });
    await signIn(page, 'Session', ADMIN);
    await reportsReady(page, 4);
    await shot(page, '09-reports-phone-dark');
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`Saved 9 screenshots to ${OUT}`);
