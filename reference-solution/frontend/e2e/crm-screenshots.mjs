// Takes the pictures of the accounts, contacts and deals screens from the running app.
//   npm run screenshots:crm                       writes into ../../screenshots (reference-solution/screenshots)
//   SCREENSHOT_DIR=some/folder npm run screenshots:crm
// Needs the API in Development (the sample data is what these pictures show) and this frontend running.
// Nothing here saves anything: forms are filled in and shown, never submitted successfully.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMIN, DEMO, freshPage, launch, signIn } from './browser.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(process.env.SCREENSHOT_DIR ?? path.join(here, '../../screenshots'));
fs.mkdirSync(OUT, { recursive: true });

const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
const nav = (page, name) => page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name }).click();

async function listReady(page) {
  await page.waitForFunction(() => document.querySelector('.card tbody tr') && !document.querySelector('.is-busy'));
}

async function openSection(page, name) {
  await nav(page, name);
  await page.getByRole('heading', { name, level: 1 }).waitFor();
  await listReady(page);
}

const taken = [];
const browser = await launch();
try {
  {
    const { context, page } = await freshPage(browser, { height: 900 });
    await signIn(page, 'Jwt', ADMIN);
    await page.getByRole('heading', { name: 'Reports' }).waitFor();

    await openSection(page, 'Accounts');
    await shot(page, '01-accounts-list');
    taken.push('01-accounts-list');

    // Two server messages, each beside its own input.
    await page.getByRole('button', { name: 'New account' }).click();
    const form = page.getByRole('form', { name: 'New account' });
    await form.getByLabel('Name', { exact: true }).fill('Northwind Traders');
    await form.getByLabel('Industry').fill('Wholesale and distribution of everyday goods to retailers across the whole of Europe and beyond');
    await form.getByLabel('Website').fill('northwind');
    await form.getByRole('button', { name: 'Create account' }).click();
    await form.locator('.field-error').nth(1).waitFor();
    await shot(page, '02-new-account-field-errors');
    taken.push('02-new-account-field-errors');
    await form.getByRole('button', { name: 'Cancel' }).click();

    // A delete the server refuses.
    await page.getByRole('button', { name: 'Delete Halcyon Freight' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete account' }).click();
    await page.getByRole('alert').waitFor();
    await shot(page, '06-blocked-delete-message');
    taken.push('06-blocked-delete-message');

    await openSection(page, 'Contacts');
    await page.getByLabel('Account', { exact: true }).selectOption({ label: 'Halcyon Freight' });
    await page.getByLabel('Status').selectOption('CUSTOMER');
    await page.waitForFunction(() => !document.querySelector('.is-busy'));
    await shot(page, '03-contacts-filtered');
    taken.push('03-contacts-filtered');

    await openSection(page, 'Deals');
    await page.locator('.pipeline__stage').first().waitFor();
    await shot(page, '04-deals-pipeline');
    taken.push('04-deals-pipeline');

    // Edit a deal, choose Lost and leave the reason empty: the field appears and says it is needed.
    await page.getByRole('button', { name: /^Edit / }).first().click();
    const edit = page.getByRole('form', { name: 'Edit deal' });
    await edit.getByLabel('Contact').locator('option').nth(1).waitFor({ state: 'attached' });
    await edit.getByLabel('Stage').selectOption('LOST');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await edit.locator('.field-error').waitFor();
    await shot(page, '05-deal-edit-lost-reason');
    taken.push('05-deal-edit-lost-reason');
    await context.close();
  }

  {
    const { context, page } = await freshPage(browser, { height: 900 });
    await signIn(page, 'Cookie', DEMO);
    await page.getByRole('heading', { name: 'Reports' }).waitFor();
    await openSection(page, 'Deals');
    await page.locator('.pipeline__stage').first().waitFor();
    await shot(page, '07-user-no-delete-buttons');
    taken.push('07-user-no-delete-buttons');
    await context.close();
  }

  {
    const { context, page } = await freshPage(browser, { width: 390, height: 844, colorScheme: 'dark' });
    await signIn(page, 'Session', ADMIN);
    await page.getByRole('heading', { name: 'Reports' }).waitFor();
    await openSection(page, 'Deals');
    await page.locator('.pipeline__stage').first().waitFor();
    await shot(page, '08-deals-phone-dark');
    taken.push('08-deals-phone-dark');
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`Saved ${taken.length} screenshots to ${OUT}: ${taken.join(', ')}`);
