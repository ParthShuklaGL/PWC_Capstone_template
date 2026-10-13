// Checks the running app against the acceptance criteria in the student brief, in a real browser.
//   1. start MySQL, the API (Development) and this frontend (see ../../README.md)
//   2. npm run e2e
// Exits 0 when every check passes. It registers one throwaway user per run (the API has no delete).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ADMIN, BASE, DEMO, freshPage, launch, signIn } from './browser.mjs';

const results = [];
function check(name, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`);
}

const who = (page) => page.locator('.app-header__who').innerText();

async function signInModes(browser) {
  for (const [mode, label] of [['Jwt', 'JWT'], ['Cookie', 'cookie'], ['Session', 'session']]) {
    const { context, page } = await freshPage(browser);
    const calls = [];
    page.on('response', (response) => {
      const { pathname } = new URL(response.url());
      if (pathname.startsWith('/api/auth/')) calls.push(`${response.request().method()} ${pathname} ${response.status()}`);
    });

    await signIn(page, mode, DEMO);
    await page.getByRole('heading', { name: 'Reports' }).waitFor();
    check(`${mode}: header shows the user, role and method`, (await who(page)) === `${DEMO.username} (USER) via ${label}`, await who(page));

    await page.reload();
    await page.getByRole('heading', { name: 'Reports' }).waitFor({ timeout: 8000 }).catch(() => {});
    check(`${mode}: still signed in after a page reload`, (await who(page).catch(() => '')) === `${DEMO.username} (USER) via ${label}`);

    const before = await context.cookies();
    const savedToken = await page.evaluate(() => sessionStorage.getItem('nimbus.jwt'));
    calls.length = 0;
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.getByRole('heading', { name: 'Sign in to Nimbus CRM' }).waitFor();

    if (mode === 'Jwt') {
      check('Jwt: sign-out sends no CSRF request', !calls.some((call) => call.includes('/csrf')) && calls.includes('POST /api/auth/logout 204'), calls.join(', '));
    } else {
      const csrf = calls.findIndex((call) => call.startsWith('GET /api/auth/csrf'));
      const logout = calls.indexOf('POST /api/auth/logout 204');
      check(`${mode}: sign-out fetches a CSRF token first, then is accepted (204)`, csrf >= 0 && logout > csrf, calls.join(', '));
    }

    await page.reload();
    check(`${mode}: after sign-out and reload the sign-in screen is shown`, await page.getByRole('heading', { name: 'Sign in to Nimbus CRM' }).isVisible());

    // Replay the credential the browser held before signing out.
    const replay = await browser.newContext();
    if (mode === 'Jwt') {
      const response = await replay.request.get(`${BASE}api/auth/me`, { headers: { Authorization: `Bearer ${savedToken}` } });
      check('Jwt: replaying the signed-out token is refused (401)', response.status() === 401, String(response.status()));
    } else {
      await replay.addCookies(before.filter((cookie) => cookie.name.startsWith('crm.')).map(({ name, value, domain, path: cookiePath }) => ({ name, value, domain, path: cookiePath })));
      const response = await replay.request.get(`${BASE}api/auth/me`);
      check(`${mode}: replaying the signed-out credential is refused (401)`, response.status() === 401, String(response.status()));
    }
    await replay.close();
    await context.close();
  }
}

async function formsAndErrors(browser) {
  {
    const { context, page } = await freshPage(browser);
    await signIn(page, 'Jwt', { username: DEMO.username, password: 'not-the-password' });
    const alert = await page.getByRole('alert').innerText();
    check('wrong password shows the generic message', alert === 'Invalid username or password.', alert);
    check(
      'wrong password flags neither field',
      (await page.getByLabel('Username').getAttribute('aria-invalid')) === 'false' && (await page.getByLabel('Password').getAttribute('aria-invalid')) === 'false',
    );
    await context.close();
  }

  const { context, page } = await freshPage(browser);
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Username').fill('x');
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByLabel('Password').fill('short');
  await page.getByRole('button', { name: 'Create account and sign in' }).click();
  await page.locator('.field-error').first().waitFor();
  const errors = await page.locator('label:has(.field-error)').evaluateAll((labels) => labels.map((label) => `${label.firstChild.textContent.trim()} -> ${label.querySelector('.field-error').textContent}`));
  check('register: each server field message appears beside its own input', errors.length === 3, errors.join(' | ').slice(0, 150));

  const name = `ui${Date.now().toString(36)}`;
  await page.getByLabel(/^Username/).fill(name);
  await page.getByLabel(/^Email/).fill(`${name}@example.com`);
  await page.getByLabel(/^Password/).fill('Brand-New-Pass-2026');
  await page.getByRole('button', { name: 'Create account and sign in' }).click();
  await page.getByRole('heading', { name: 'Reports' }).waitFor();
  check('register: a valid registration signs the new user in as USER', (await who(page)) === `${name} (USER) via JWT`, await who(page));
  await context.close();
}

async function plainUser(browser) {
  const { context, page } = await freshPage(browser);
  await signIn(page, 'Cookie', DEMO);
  await page.getByRole('heading', { name: 'Reports' }).waitFor();
  check('USER: the Users link is not shown', (await page.getByRole('link', { name: 'Users' }).count()) === 0);
  check('USER: the "Users by role" report is not shown', (await page.getByRole('heading', { name: 'Users by role' }).count()) === 0);
  check('USER: three report sections are shown', (await page.locator('section.report').count()) === 3);
  await page.goto(`${BASE}users`);
  await page.getByRole('heading', { name: /do not have access/i }).waitFor();
  check('USER: opening /users shows the "no access" page', true);
  await context.close();
}

async function admin(browser) {
  const { context, page } = await freshPage(browser, { acceptDownloads: true });
  await signIn(page, 'Jwt', ADMIN);
  await page.getByRole('heading', { name: 'Reports' }).waitFor();
  await page.locator('section.report table tbody tr').first().waitFor();
  check('ADMIN: four report sections are shown', (await page.locator('section.report').count()) === 4);

  const rows = (title) => page.locator('section.report', { has: page.getByRole('heading', { name: title }) }).locator('tbody tr')
    .evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.trim()).filter(Boolean).join(' | ')));

  // These expected numbers are the development sample data (see nimbus_crm/src/Infrastructure/Seeding/SampleData.cs).
  const deals = await rows('Deals by stage');
  check('deals by stage: six stages in pipeline order with GBP values', deals.length === 6 && deals[0] === 'Prospecting | 3 | £46,850.50' && deals[4] === 'Won | 5 | £137,400.00' && deals[5] === 'Lost | 2 | £27,450.00', deals[0]);
  const accounts = await rows('Contacts per account');
  check('contacts per account: biggest first, and an account with none is listed', accounts[0] === 'Halcyon Freight | 4' && accounts.at(-1) === 'Ashford Legal | 0', `${accounts[0]} ... ${accounts.at(-1)}`);
  const activities = await rows('Activities per user');
  check('activities per user: admin 20, demo 10', activities[0] === 'admin | 20' && activities[1] === 'demo | 10', activities.slice(0, 2).join(' / '));

  for (const [title, name, header, first] of [
    ['Deals by stage', 'deals-by-stage', 'Stage,Deals,TotalValueGbp', 'PROSPECTING,3,46850.50'],
    ['Contacts per account', 'contacts-per-account', 'AccountId,Account,Contacts', '1,Halcyon Freight,4'],
    ['Activities per user', 'activities-per-user', 'UserId,Username,Activities', '1,admin,20'],
    ['Users by role', 'users-by-role', 'Role,Users', null],
  ]) {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('section.report', { has: page.getByRole('heading', { name: title }) }).getByRole('button', { name: 'Download CSV' }).click(),
    ]);
    const file = path.join(os.tmpdir(), `ui-${name}.csv`);
    await download.saveAs(file);
    const lines = fs.readFileSync(file, 'utf8').split('\r\n');
    fs.unlinkSync(file);
    check(
      `CSV ${name}: saved as ${download.suggestedFilename()}, header row and CRLF correct`,
      new RegExp(`^${name}-\\d{4}-\\d{2}-\\d{2}\\.csv$`).test(download.suggestedFilename()) && lines[0] === header && (first === null || lines[1] === first),
      `${lines[0]} / ${lines[1]}`,
    );
  }

  await page.getByRole('link', { name: 'Users' }).click();
  await page.locator('tbody tr').first().waitFor();
  const users = await page.locator('tbody tr td:first-child').allInnerTexts();
  check('ADMIN: the users list shows people and never a password column', users.includes('admin') && users.includes('demo') && (await page.locator('th').allInnerTexts()).every((header) => !/password/i.test(header)), users.slice(0, 3).join(', '));
  await context.close();
}

async function sessionEndsBehindTheAppsBack(browser) {
  const { context, page } = await freshPage(browser);
  await signIn(page, 'Jwt', ADMIN);
  await page.getByRole('heading', { name: 'Reports' }).waitFor();
  const token = await page.evaluate(() => sessionStorage.getItem('nimbus.jwt'));
  await context.request.post(`${BASE}api/auth/logout`, { headers: { Authorization: `Bearer ${token}` } });
  await page.getByRole('link', { name: 'Users' }).click();
  await page.getByRole('heading', { name: 'Sign in to Nimbus CRM' }).waitFor();
  const notice = await page.getByRole('status').innerText();
  check('a signed-out credential sends the user to sign-in with "Your session ended"', /session ended/i.test(notice), notice);
  await context.close();
}

async function noSideways(browser) {
  for (const width of [320, 390, 768, 1100]) {
    const { context, page } = await freshPage(browser, { width, height: 800 });
    await signIn(page, 'Jwt', ADMIN);
    await page.locator('section.report').nth(3).locator('tbody tr').first().waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`reports page does not scroll sideways at ${width}px wide`, overflow <= 0, `${overflow}px over`);
    await context.close();
  }
}

const browser = await launch();
try {
  await signInModes(browser);
  await formsAndErrors(browser);
  await plainUser(browser);
  await admin(browser);
  await sessionEndsBehindTheAppsBack(browser);
  await noSideways(browser);
} finally {
  await browser.close();
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed} of ${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
