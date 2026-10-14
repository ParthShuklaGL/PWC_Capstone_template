// The rest of the CRM pictures: every list, every form, both dialogs, the USER views and the phone views.
// Complements crm-screenshots.mjs (01-08) and screenshots.mjs (the sign-in, reports and users pictures).
//   SCREENSHOT_DIR=screenshots/dotnet npm run screenshots:more
// Needs the API in Development (the sample data is what these pictures show) and this frontend running.
// Nothing here saves anything: forms are shown, never submitted successfully, and dialogs are cancelled.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMIN, DEMO, freshPage, launch, signIn } from './browser.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(process.env.SCREENSHOT_DIR ?? path.join(here, '../../screenshots'));
fs.mkdirSync(OUT, { recursive: true });

const taken = [];
const shot = async (page, name, fullPage = true) => {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage });
  taken.push(name);
};
const nav = (page, name) => page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name }).click();

async function openSection(page, name) {
  await nav(page, name);
  await page.getByRole('heading', { name, level: 1 }).waitFor();
  await page.waitForFunction(() => document.querySelector('.card tbody tr') && !document.querySelector('.is-busy'));
}

const browser = await launch();
try {
  {
    const { context, page } = await freshPage(browser, { height: 900 });
    await signIn(page, 'Jwt', ADMIN);
    await page.getByRole('heading', { name: 'Reports' }).waitFor();

    await openSection(page, 'Accounts');
    await page.getByRole('button', { name: /^Edit / }).first().click();
    await page.getByRole('form', { name: 'Edit account' }).waitFor();
    await shot(page, '10-account-edit-form');
    await page.getByRole('form', { name: 'Edit account' }).getByRole('button', { name: 'Cancel' }).click();

    await openSection(page, 'Contacts');
    await shot(page, '11-contacts-list');

    await page.getByRole('button', { name: 'New contact' }).click();
    const create = page.getByRole('form', { name: 'New contact' });
    await create.getByLabel('Account').locator('option').nth(1).waitFor({ state: 'attached' });
    await create.getByLabel('Account').selectOption({ index: 1 });
    await create.getByLabel('First name').fill('Jordan');
    await create.getByLabel('Last name').fill('Whitfield');
    await create.getByLabel('Email').fill('jordan.whitfield@example.com');
    await create.getByLabel('Job title').fill('Head of Operations');
    await shot(page, '12-contact-new-form');
    await create.getByRole('button', { name: 'Cancel' }).click();

    await page.getByRole('button', { name: /^Edit / }).first().click();
    await page.getByRole('form', { name: 'Edit contact' }).waitFor();
    await shot(page, '13-contact-edit-form');
    await page.getByRole('form', { name: 'Edit contact' }).getByRole('button', { name: 'Cancel' }).click();

    // A contact that has deals: the server refuses the delete and the page says why.
    await page.getByLabel('Account', { exact: true }).selectOption({ label: 'Halcyon Freight' });
    await page.waitForFunction(() => !document.querySelector('.is-busy'));
    await page.getByRole('button', { name: /^Delete Maya/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete contact' }).click();
    await page.getByRole('alert').waitFor();
    await shot(page, '14-contact-blocked-delete');

    await openSection(page, 'Deals');
    await page.locator('.pipeline__stage').first().waitFor();
    await page.getByRole('button', { name: 'New deal' }).click();
    const deal = page.getByRole('form', { name: 'New deal' });
    await deal.getByLabel('Contact').locator('option').nth(1).waitFor({ state: 'attached' });
    await deal.getByLabel('Contact').selectOption({ index: 1 });
    await deal.getByLabel('Title').fill('Regional depot expansion');
    await deal.getByLabel('Value (GBP)').fill('52500');
    await deal.getByLabel('Expected close date').fill('2026-12-15');
    await deal.getByLabel('Stage').selectOption('PROPOSAL');
    await shot(page, '15-deal-new-form');
    await deal.getByRole('button', { name: 'Cancel' }).click();

    // Choosing Lost in the row opens the reason dialog; cancel it so nothing changes.
    await page.getByLabel(/^Stage of /).first().selectOption('LOST');
    await page.getByRole('dialog').waitFor();
    await shot(page, '16-deal-lost-reason-dialog', false);
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

    await page.getByRole('button', { name: /^Delete / }).first().click();
    await page.getByRole('dialog').waitFor();
    await shot(page, '17-deal-delete-confirm', false);
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await context.close();
  }

  {
    const { context, page } = await freshPage(browser, { height: 900 });
    await signIn(page, 'Cookie', DEMO);
    await page.getByRole('heading', { name: 'Reports' }).waitFor();
    await openSection(page, 'Accounts');
    await shot(page, '18-accounts-user-no-delete');
    await openSection(page, 'Contacts');
    await shot(page, '19-contacts-user-no-delete');
    await context.close();
  }

  {
    const { context, page } = await freshPage(browser, { width: 390, height: 844 });
    await signIn(page, 'Session', ADMIN);
    await page.getByRole('heading', { name: 'Reports' }).waitFor();
    await openSection(page, 'Accounts');
    await shot(page, '20-accounts-phone');
    await openSection(page, 'Contacts');
    await shot(page, '21-contacts-phone');
    await page.getByRole('button', { name: 'New contact' }).click();
    const phoneForm = page.getByRole('form', { name: 'New contact' });
    await phoneForm.waitFor();
    await phoneForm.getByLabel('Account').locator('option').nth(1).waitFor({ state: 'attached' });
    await shot(page, '22-contact-form-phone');
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`Saved ${taken.length} screenshots to ${OUT}: ${taken.join(', ')}`);
