// Drives the accounts, contacts and deals screens in a real browser against the real API.
//   1. start MySQL, the API (Development, raised login limit) and this frontend (see ../../README.md)
//   2. npm run e2e:crm
// Everything it creates is named "E2E <run id> ..." and is deleted again (through the UI, then a safety net
// through the API), so the sample data is left as it was found and the script can run again.
import { ADMIN, BASE, DEMO, freshPage, launch, signIn } from './browser.mjs';
import { request as playwrightRequest } from 'playwright-core';

const results = [];
function check(name, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`);
}

const RUN = Date.now().toString(36);
const PREFIX = 'E2E';
const ACCOUNT = `${PREFIX} Acme ${RUN}`;
const CONTACT_FIRST = `${PREFIX}Ada`;
const CONTACT_LAST = `Lovelace${RUN}`;
const CONTACT = `${CONTACT_FIRST} ${CONTACT_LAST}`;
const DEAL = `${PREFIX} renewal ${RUN}`;

const todayLabel = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const nav = (page, name) => page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name }).click();
const row = (page, text) => page.locator('tbody tr', { hasText: text });
const rowsOf = (page) => page.locator('.card tbody tr');
const rowTexts = (page) => rowsOf(page).evaluateAll((trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()));
const fieldOf = (scope, label) => scope.locator('.field').filter({ has: scope.page().locator(`label:text-is("${label}")`) });
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function open(page, section, heading) {
  await nav(page, section);
  await page.getByRole('heading', { name: heading, level: 1 }).waitFor();
  await page.waitForFunction(() => document.querySelector('.card tbody tr') || [...document.querySelectorAll('.card .notice')].some((n) => !/Loading/.test(n.innerText)));
}

async function search(page, label, text) {
  const reload = page.waitForResponse((response) => response.url().includes('/api/') && response.request().method() === 'GET' && response.url().includes('search='));
  await page.getByRole('searchbox', { name: label }).fill(text);
  await page.getByRole('searchbox', { name: label }).press('Enter');
  await reload;
  await page.waitForFunction(() => !document.querySelector('.is-busy'));
}

/** Removes whatever an earlier or failed run left behind, through the API, bottom-up. */
async function apiCleanup() {
  let removed = 0;
  const api = await playwrightRequest.newContext({ baseURL: BASE });
  try {
    const login = await api.post('api/auth/login', { data: { username: ADMIN.username, password: ADMIN.password, mode: 'Jwt' } });
    const { accessToken } = await login.json();
    const headers = { Authorization: `Bearer ${accessToken}` };
    for (const [resource, query] of [['deals', PREFIX], ['contacts', PREFIX], ['accounts', PREFIX]]) {
      const list = await (await api.get(`api/${resource}?search=${query}&size=100`, { headers })).json();
      for (const item of list.items) {
        await api.delete(`api/${resource}/${item.id}`, { headers });
        removed += 1;
      }
    }
  } finally {
    await api.dispose();
  }
  return removed;
}

/** Accounts: create (with a server error beside Website), edit. Returns with the page on the accounts list. */
async function accounts(browser) {
  const { context, page } = await freshPage(browser, { height: 900 });
  await signIn(page, 'Jwt', ADMIN);
  await page.getByRole('heading', { name: 'Reports' }).waitFor();
  check('nav: Reports, Accounts, Contacts, Deals and (ADMIN) Users links are shown',
    (await page.getByRole('navigation', { name: 'Main' }).getByRole('link').allInnerTexts()).join(',') === 'Reports,Accounts,Contacts,Deals,Users');

  await open(page, 'Accounts', 'Accounts');
  const seeded = await rowsOf(page).count();
  check('accounts: the list shows rows with name, industry, country, website and contact count', seeded > 0 && (await page.locator('th').allInnerTexts()).join('|').startsWith('NAME|INDUSTRY|COUNTRY|WEBSITE|CONTACTS'), `${seeded} rows`);
  check('accounts: ADMIN sees Delete buttons', (await page.getByRole('button', { name: /^Delete / }).count()) === seeded);

  await page.getByRole('button', { name: 'New account' }).click();
  const form = page.getByRole('form', { name: 'New account' });
  await form.getByLabel('Name', { exact: true }).fill('  ');
  await form.getByRole('button', { name: 'Create account' }).click();
  check('account form: a blank name is flagged beside the Name input', (await fieldOf(form, 'Name').locator('.field-error').innerText()) === 'Name is required.');

  await form.getByLabel('Name', { exact: true }).fill(ACCOUNT);
  await form.getByLabel('Industry').fill('Testing');
  await form.getByLabel('Website').fill('not a web address');
  const rejected = page.waitForResponse((response) => response.url().endsWith('/api/accounts') && response.request().method() === 'POST');
  await form.getByRole('button', { name: 'Create account' }).click();
  check('account form: the server answers 400', (await rejected).status() === 400);
  const websiteError = await fieldOf(form, 'Website').locator('.field-error').innerText();
  check('account form: the server message for Website is beside the Website input and nowhere else',
    /full http or https address/i.test(websiteError) && (await form.locator('.field-error').count()) === 1 && (await form.getByLabel('Website').getAttribute('aria-invalid')) === 'true' && (await form.getByLabel('Name', { exact: true }).getAttribute('aria-invalid')) === 'false', websiteError);

  await form.getByLabel('Website').fill('https://e2e.example.com');
  await form.getByRole('button', { name: 'Create account' }).click();
  await page.getByRole('status').filter({ hasText: `Created account ${ACCOUNT}` }).waitFor();
  await search(page, 'Search accounts', ACCOUNT);
  check('account: created, and found by search with its website', (await rowsOf(page).count()) === 1 && /e2e\.example\.com/.test(await rowsOf(page).first().innerText()));

  await page.getByRole('button', { name: `Edit ${ACCOUNT}` }).click();
  const edit = page.getByRole('form', { name: 'Edit account' });
  check('account: the edit form starts with the saved values', (await edit.getByLabel('Industry').inputValue()) === 'Testing');
  await edit.getByLabel('Industry').fill('Quality assurance');
  await edit.getByLabel('Country').fill('Ireland');
  await edit.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('status').filter({ hasText: `Saved account ${ACCOUNT}` }).waitFor();
  await row(page, 'Quality assurance').waitFor();
  check('account: edited, and the list shows the new industry and country', /Quality assurance Ireland/.test((await rowTexts(page))[0]));

  // The contact count is a link to the contacts of this account.
  await context.close();
}

/** Contact and deal creation with server errors, the stage rules, and the blocked deletes. */
async function contactsAndDeals(browser) {
  const { context, page } = await freshPage(browser, { height: 900 });
  await signIn(page, 'Jwt', ADMIN);
  await open(page, 'Contacts', 'Contacts');

  await page.getByRole('button', { name: 'New contact' }).click();
  const form = page.getByRole('form', { name: 'New contact' });
  await form.getByLabel('Account', { exact: true }).selectOption({ label: ACCOUNT });
  await form.getByLabel('First name').fill(CONTACT_FIRST);
  await form.getByLabel('Last name').fill(CONTACT_LAST);
  await form.getByLabel('Email').fill('not-an-email');
  await form.getByRole('button', { name: 'Create contact' }).click();
  const emailError = await fieldOf(form, 'Email').locator('.field-error').innerText();
  check('contact form: the server message for Email is beside the Email input', emailError.length > 0 && (await form.locator('.field-error').count()) === 1, emailError);
  await form.getByLabel('Email').fill(`ada.${RUN}@example.com`);
  await form.getByLabel('Job title').fill('Engineer');
  await form.getByLabel('Status').selectOption('CUSTOMER');
  await form.getByRole('button', { name: 'Create contact' }).click();
  await page.getByRole('status').filter({ hasText: `Created contact ${CONTACT}` }).waitFor();
  await search(page, 'Search contacts', CONTACT_LAST);
  check('contact: created with its account and status, and found by search', /Customer/.test(await rowsOf(page).first().innerText()) && (await rowsOf(page).first().innerText()).includes(ACCOUNT));

  await page.getByRole('button', { name: `Edit ${CONTACT}` }).click();
  const edit = page.getByRole('form', { name: 'Edit contact' });
  await edit.getByLabel('Status').selectOption('PROSPECT');
  await edit.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('status').filter({ hasText: `Saved contact ${CONTACT}` }).waitFor();
  await row(page, 'Prospect').waitFor();
  check('contact: edited (status Customer to Prospect)', true);

  // A deal for that contact, reached from the contact's Deals link.
  await page.getByRole('link', { name: `Deals of ${CONTACT}` }).click();
  await page.getByRole('heading', { name: 'Deals', level: 1 }).waitFor();
  await page.locator('.chip', { hasText: CONTACT }).waitFor();
  check('contact: the Deals link opens the deals list filtered to that contact', page.url().includes('contactId='));
  await page.locator('.card .notice', { hasText: /No deals match/ }).waitFor();
  check('deals: a contact with no deals shows the empty message', true);

  await page.getByRole('button', { name: 'New deal' }).click();
  const deal = page.getByRole('form', { name: 'New deal' });
  await deal.getByLabel('Contact').locator('option', { hasText: CONTACT }).waitFor({ state: 'attached' });
  check('deal form: the contact is preselected from the filter', (await deal.getByLabel('Contact').inputValue()) !== '');
  await deal.getByLabel('Title').fill(DEAL);
  await deal.getByLabel('Value (GBP)').fill('-5');
  await deal.getByLabel('Expected close date').fill('2027-01-15');
  await deal.getByRole('button', { name: 'Create deal' }).click();
  const valueError = await fieldOf(deal, 'Value (GBP)').locator('.field-error').innerText();
  check('deal form: the server message for Value is beside the Value input', valueError.length > 0 && (await deal.locator('.field-error').count()) === 1, valueError);
  check('deal form: lost reason is hidden until the stage is Lost', (await deal.getByLabel('Lost reason', { exact: false }).count()) === 0);
  await deal.getByLabel('Value (GBP)').fill('1234.5');
  await deal.getByLabel('Stage').selectOption('LOST');
  check('deal form: choosing Lost shows the lost reason input', (await deal.getByLabel('Lost reason', { exact: false }).count()) === 1);
  await deal.getByRole('button', { name: 'Create deal' }).click();
  check('deal form: Lost without a reason is refused beside the reason input', /why the deal was lost/i.test(await fieldOf(deal, 'Lost reason (required)').locator('.field-error').innerText()));
  await deal.getByLabel('Stage').selectOption('NEGOTIATION');
  check('deal form: choosing another stage hides the lost reason again', (await deal.getByLabel('Lost reason', { exact: false }).count()) === 0);
  await deal.getByRole('button', { name: 'Create deal' }).click();
  await page.getByRole('status').filter({ hasText: `Created deal ${DEAL}` }).waitFor();
  await row(page, DEAL).waitFor();
  const text = await row(page, DEAL).innerText();
  check('deal: created, shown with contact, account, GBP value, expected close date and stage', text.includes(CONTACT) && text.includes(ACCOUNT) && text.includes('£1,234.50') && text.includes('15 Jan 2027'), text.replace(/\s+/g, ' '));
  check('deal: an open deal has no closed date', (await row(page, DEAL).locator('td').nth(6).innerText()) === '—');

  // Stage change to WON stamps today's date; the pipeline summary follows.
  const wonCount = async () => Number((await page.locator('.pipeline__stage--won .pipeline__count').innerText()).split(' ')[0]);
  const before = await wonCount();
  await page.getByLabel(`Stage of ${DEAL}`).selectOption('WON');
  await page.getByRole('status').filter({ hasText: `Moved ${DEAL} to Won` }).waitFor();
  await page.waitForFunction((title) => [...document.querySelectorAll('tbody tr')].some((tr) => tr.innerText.includes(title) && tr.children[6].innerText.trim() !== '—'), DEAL);
  check('deal: the stage select to Won shows the date the server stamped as closed', (await row(page, DEAL).locator('td').nth(6).innerText()) === todayLabel, `${await row(page, DEAL).locator('td').nth(6).innerText()} vs ${todayLabel}`);
  await page.waitForFunction((n) => Number(document.querySelector('.pipeline__stage--won .pipeline__count').innerText.split(' ')[0]) === n, before + 1);
  check('deal: the pipeline summary counted the new Won deal', (await wonCount()) === before + 1, `${before} -> ${before + 1}`);

  // Lost needs a reason.
  await page.getByLabel(`Stage of ${DEAL}`).selectOption('LOST');
  const lost = page.getByRole('dialog');
  await lost.getByRole('button', { name: 'Mark as lost' }).click();
  check('deal: moving to Lost asks for a reason and refuses an empty one', /why the deal was lost/i.test(await lost.locator('.field-error').innerText()));
  await lost.getByLabel('Lost reason (required)').fill('Budget cut');
  await lost.getByRole('button', { name: 'Mark as lost' }).click();
  await page.getByRole('status').filter({ hasText: `Moved ${DEAL} to Lost` }).waitFor();
  await row(page, 'Lost: Budget cut').waitFor();
  check('deal: Lost with a reason is saved and the reason is shown', (await page.getByLabel(`Stage of ${DEAL}`).inputValue()) === 'LOST');

  await page.getByLabel(`Stage of ${DEAL}`).selectOption('QUALIFIED');
  await page.getByRole('status').filter({ hasText: `Moved ${DEAL} to Qualified` }).waitFor();
  await page.waitForFunction((title) => [...document.querySelectorAll('tbody tr')].some((tr) => tr.innerText.includes(title) && !tr.innerText.includes('Lost:') && tr.children[6].innerText.trim() === '—'), DEAL);
  check('deal: reopening clears the closed date and the lost reason', (await row(page, DEAL).locator('td').nth(6).innerText()) === '—');

  // Editing through the form.
  await page.getByRole('button', { name: `Edit ${DEAL}` }).click();
  const editDeal = page.getByRole('form', { name: 'Edit deal' });
  await editDeal.getByLabel('Value (GBP)').fill('2000');
  await editDeal.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('status').filter({ hasText: `Saved deal ${DEAL}` }).waitFor();
  await row(page, '£2,000.00').waitFor();
  check('deal: edited through the form (value now £2,000.00)', true);

  // Blocked deletes: the account has a contact, the contact has a deal.
  await open(page, 'Accounts', 'Accounts');
  await search(page, 'Search accounts', ACCOUNT);
  await page.getByRole('button', { name: `Delete ${ACCOUNT}` }).click();
  const confirm = page.getByRole('dialog');
  check('delete: a confirm dialog names the account first', (await confirm.innerText()).includes(ACCOUNT));
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  check('delete: Cancel sends nothing and leaves the row', (await page.getByRole('dialog').count()) === 0 && (await rowsOf(page).count()) === 1);
  await page.getByRole('button', { name: `Delete ${ACCOUNT}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete account' }).click();
  const accountBlocked = await page.getByRole('alert').innerText();
  check('delete: an account with contacts is refused (409) and the server message is shown', /still has contacts/i.test(accountBlocked) && (await rowsOf(page).count()) === 1, accountBlocked);

  await open(page, 'Contacts', 'Contacts');
  await search(page, 'Search contacts', CONTACT_LAST);
  await page.getByRole('button', { name: `Delete ${CONTACT}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete contact' }).click();
  const contactBlocked = await page.getByRole('alert').innerText();
  check('delete: a contact with deals is refused (409) and the server message is shown', /still has deals or logged activities/i.test(contactBlocked), contactBlocked);

  await context.close();
}

/** A plain USER: no delete buttons anywhere, and the server refuses a delete sent by hand. */
async function plainUser(browser) {
  const { context, page } = await freshPage(browser, { height: 900 });
  await signIn(page, 'Cookie', DEMO);
  await page.getByRole('heading', { name: 'Reports' }).waitFor();
  for (const [section, heading] of [['Accounts', 'Accounts'], ['Contacts', 'Contacts'], ['Deals', 'Deals']]) {
    await open(page, section, heading);
    const edits = await page.getByRole('button', { name: /^Edit / }).count();
    check(`USER: ${section} list shows Edit buttons but no Delete buttons`, edits > 0 && (await page.getByRole('button', { name: /^Delete / }).count()) === 0, `${edits} edit buttons`);
  }
  await search(page, 'Search deals', DEAL);
  const outcome = await page.evaluate(async (title) => {
    const found = await (await fetch(`/api/deals?search=${encodeURIComponent(title)}`)).json();
    const csrf = await (await fetch('/api/auth/csrf')).json();
    const response = await fetch(`/api/deals/${found.items[0].id}`, { method: 'DELETE', headers: { [csrf.headerName]: csrf.token } });
    return response.status;
  }, DEAL);
  check('USER: a delete sent straight to the API is refused (403)', outcome === 403, String(outcome));

  // A USER can create and change, though: cookie sign-in with the CSRF token.
  await page.getByLabel(`Stage of ${DEAL}`).selectOption('PROPOSAL');
  await page.getByRole('status').filter({ hasText: `Moved ${DEAL} to Proposal` }).waitFor();
  check('USER (cookie): a stage change is accepted, so the CSRF token was sent', true);
  await context.close();
}

/** Search, filters and paging change the rows, and the request carries them. */
async function filters(browser) {
  const { context, page } = await freshPage(browser, { height: 900 });
  await signIn(page, 'Jwt', DEMO);
  await page.getByRole('heading', { name: 'Reports' }).waitFor();

  await open(page, 'Contacts', 'Contacts');
  const total = Number((await page.locator('.pager__total').innerText()).split(' ')[0]);
  const firstPage = await rowTexts(page);
  check('contacts: the first page has 10 rows and the pager shows the total', firstPage.length === 10 && total > 10 && /Page 1 of/.test(await page.locator('.pager').innerText()), `${firstPage.length} rows of ${total}`);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForFunction((first) => document.querySelector('.card tbody tr')?.innerText.replace(/\s+/g, ' ').trim() !== first, firstPage[0]);
  const secondPage = await rowTexts(page);
  check('contacts: Next shows different rows and "Page 2"', secondPage[0] !== firstPage[0] && /Page 2 of/.test(await page.locator('.pager').innerText()) && page.url().includes('page=1'));
  await page.getByRole('button', { name: 'Previous' }).click();
  await page.waitForFunction((first) => document.querySelector('.card tbody tr')?.innerText.replace(/\s+/g, ' ').trim() === first, firstPage[0]);

  const requested = page.waitForRequest((request) => request.url().includes('/api/contacts') && request.url().includes('status=CUSTOMER'));
  await page.getByLabel('Status').selectOption('CUSTOMER');
  const request = await requested;
  check('contacts: the status filter sends status=CUSTOMER', new URL(request.url()).searchParams.get('status') === 'CUSTOMER');
  await page.waitForFunction(() => !document.querySelector('.is-busy'));
  check('contacts: every row shown is a Customer', (await rowTexts(page)).every((text) => /Customer/.test(text)));

  const byAccount = page.waitForRequest((r) => r.url().includes('/api/contacts') && r.url().includes('accountId='));
  await page.getByLabel('Account', { exact: true }).selectOption({ label: 'Halcyon Freight' });
  check('contacts: the account filter sends accountId', new URL((await byAccount).url()).searchParams.has('accountId'));
  await page.waitForFunction(() => !document.querySelector('.is-busy'));
  const halcyon = await rowTexts(page);
  check('contacts: the rows narrow to that account and status', halcyon.length > 0 && halcyon.length < 10 && halcyon.every((text) => text.includes('Halcyon Freight') && /Customer/.test(text)), `${halcyon.length} rows`);

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.card tbody tr').length === 10);
  await search(page, 'Search contacts', 'okafor');
  const found = await rowTexts(page);
  check('contacts: search matches the name or email', found.length >= 1 && found.every((text) => /okafor/i.test(text)), `${found.length} rows`);

  // From an account to its contacts, and from the deals page filters.
  await open(page, 'Accounts', 'Accounts');
  const halcyonRow = row(page, 'Halcyon Freight');
  const count = (await halcyonRow.locator('td').nth(4).innerText()).trim();
  await halcyonRow.getByRole('link', { name: /contacts at/ }).click();
  await page.getByRole('heading', { name: 'Contacts', level: 1 }).waitFor();
  await page.waitForFunction((n) => document.querySelectorAll('.card tbody tr').length === n, Number(count));
  check('accounts: the contact count links to that account\'s contacts', (await rowTexts(page)).every((text) => text.includes('Halcyon Freight')) && page.url().includes('accountId='), `${count} contacts`);

  await open(page, 'Deals', 'Deals');
  const pipelineCells = await page.locator('.pipeline__stage').evaluateAll((buttons) => buttons.map((b) => b.innerText.replace(/\s+/g, ' ')));
  check('deals: the pipeline summary shows six stages with deal counts and GBP values', pipelineCells.length === 6 && pipelineCells.every((cell) => /\d+ deals?/.test(cell) && /£/.test(cell)), pipelineCells[0]);
  const stageRequest = page.waitForRequest((r) => r.url().includes('/api/deals') && r.url().includes('stage=WON'));
  await page.getByLabel('Stage', { exact: true }).selectOption('WON');
  check('deals: the stage filter sends stage=WON', new URL((await stageRequest).url()).searchParams.get('stage') === 'WON');
  await page.waitForFunction(() => !document.querySelector('.is-busy'));
  const stages = await page.locator('.card tbody tr select.stage-select').evaluateAll((selects) => selects.map((s) => s.value));
  check('deals: only Won deals are listed, each with a closed date', stages.length > 0 && stages.every((s) => s === 'WON'), `${stages.length} rows`);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.card tbody tr').length === 10);

  const accountRequest = page.waitForRequest((r) => r.url().includes('/api/deals') && r.url().includes('accountId='));
  await page.locator('#filter-account').selectOption({ label: 'Halcyon Freight' });
  await accountRequest;
  await page.waitForFunction(() => !document.querySelector('.is-busy'));
  const dealRows = await rowTexts(page);
  check('deals: the account filter narrows the list to that account', dealRows.length > 0 && dealRows.every((text) => text.includes('Halcyon Freight')), `${dealRows.length} rows`);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await search(page, 'Search deals', 'zzzz-no-such-deal');
  await page.locator('.card .notice', { hasText: /No deals match/ }).waitFor();
  check('deals: a search with no match shows the empty message', true);
  await context.close();
}

/** Every sign-in mode can create a deal, and delete it; cookie and session send the CSRF token. */
async function allModesCreateADeal(browser) {
  for (const mode of ['Jwt', 'Cookie', 'Session']) {
    const { context, page } = await freshPage(browser, { height: 900 });
    const title = `${PREFIX} ${mode} deal ${RUN}`;
    const sent = [];
    page.on('request', (request) => {
      const { pathname } = new URL(request.url());
      if (pathname.startsWith('/api/') && request.method() !== 'GET') sent.push({ method: request.method(), pathname, csrf: Boolean(request.headers()['x-csrf-token']), bearer: Boolean(request.headers().authorization) });
    });
    await signIn(page, mode, ADMIN);
    await page.getByRole('heading', { name: 'Reports' }).waitFor();
    await open(page, 'Deals', 'Deals');
    sent.length = 0;
    await page.getByRole('button', { name: 'New deal' }).click();
    const form = page.getByRole('form', { name: 'New deal' });
    await form.getByLabel('Title').fill(title);
    await form.getByLabel('Contact').selectOption({ label: `${CONTACT} (${ACCOUNT})` });
    await form.getByLabel('Value (GBP)').fill('99.99');
    await form.getByLabel('Expected close date').fill('2027-02-01');
    const created = page.waitForResponse((response) => response.url().endsWith('/api/deals') && response.request().method() === 'POST');
    await form.getByRole('button', { name: 'Create deal' }).click();
    check(`${mode}: creating a deal is accepted (201)`, (await created).status() === 201);
    await page.getByRole('status').filter({ hasText: `Created deal ${title}` }).waitFor();
    const post = sent.find((call) => call.method === 'POST' && call.pathname === '/api/deals');
    check(`${mode}: ${mode === 'Jwt' ? 'a Bearer token is sent and no CSRF token' : 'the X-CSRF-TOKEN header is sent'}`, mode === 'Jwt' ? post?.bearer && !post.csrf : post?.csrf && !post.bearer, JSON.stringify(post));

    await search(page, 'Search deals', title);
    await page.getByRole('button', { name: `Delete ${title}` }).click();
    const deleted = page.waitForResponse((response) => response.url().includes('/api/deals/') && response.request().method() === 'DELETE');
    await page.getByRole('dialog').getByRole('button', { name: 'Delete deal' }).click();
    check(`${mode}: ADMIN deleting a deal is accepted (204)`, (await deleted).status() === 204);
    await page.getByRole('status').filter({ hasText: `Deleted deal ${title}` }).waitFor();
    await page.locator('.card .notice', { hasText: /No deals match/ }).waitFor();
    check(`${mode}: the deleted deal is gone from the list`, true);
    const del = sent.find((call) => call.method === 'DELETE');
    check(`${mode}: the delete also carried the right credential`, mode === 'Jwt' ? del?.bearer : del?.csrf, JSON.stringify(del));
    await context.close();
  }
}

/** The 401 flow reaches the new screens too. */
async function sessionEnds(browser) {
  const { context, page } = await freshPage(browser);
  await signIn(page, 'Jwt', ADMIN);
  await page.getByRole('heading', { name: 'Reports' }).waitFor();
  const token = await page.evaluate(() => sessionStorage.getItem('nimbus.jwt'));
  await context.request.post(`${BASE}api/auth/logout`, { headers: { Authorization: `Bearer ${token}` } });
  await nav(page, 'Deals');
  await page.getByRole('heading', { name: 'Sign in to Nimbus CRM' }).waitFor();
  check('deals: a signed-out credential sends the user to sign-in with "Your session ended"', /session ended/i.test(await page.getByRole('status').innerText()));
  await context.close();
}

async function noSideways(browser) {
  for (const width of [320, 390, 768, 1100]) {
    const { context, page } = await freshPage(browser, { width, height: 800 });
    await signIn(page, 'Jwt', ADMIN);
    await page.getByRole('heading', { name: 'Reports' }).waitFor();
    const over = {};
    for (const [section, heading] of [['Accounts', 'Accounts'], ['Contacts', 'Contacts'], ['Deals', 'Deals']]) {
      await open(page, section, heading);
      await page.waitForFunction(() => !document.querySelector('.is-busy'));
      if (section === 'Deals') await page.locator('.pipeline__stage').first().waitFor();
      over[section] = await overflow(page);
    }
    await page.getByRole('button', { name: 'New deal' }).click();
    await page.getByRole('form', { name: 'New deal' }).getByLabel('Stage').selectOption('LOST');
    over.dealForm = await overflow(page);
    check(`accounts, contacts, deals and the deal form do not scroll sideways at ${width}px wide`, Object.values(over).every((px) => px <= 0), JSON.stringify(over));
    await context.close();
  }
}

await apiCleanup();
const browser = await launch();
try {
  await accounts(browser);
  await contactsAndDeals(browser);
  await plainUser(browser);
  await filters(browser);
  await allModesCreateADeal(browser);
  await sessionEnds(browser);
  await noSideways(browser);
} finally {
  // Delete what the checks created, bottom-up, through the UI as ADMIN; then the API safety net.
  try {
    const { context, page } = await freshPage(browser, { height: 900 });
    await signIn(page, 'Jwt', ADMIN);
    await page.getByRole('heading', { name: 'Reports' }).waitFor();
    for (const [section, heading, label, term, confirm] of [
      ['Deals', 'Deals', 'Search deals', DEAL, 'Delete deal'],
      ['Contacts', 'Contacts', 'Search contacts', CONTACT_LAST, 'Delete contact'],
      ['Accounts', 'Accounts', 'Search accounts', ACCOUNT, 'Delete account'],
    ]) {
      await open(page, section, heading);
      await search(page, label, term);
      const target = page.getByRole('button', { name: /^Delete / }).first();
      if (await target.count()) {
        await target.click();
        await page.getByRole('dialog').getByRole('button', { name: confirm }).click();
        await page.getByRole('status').filter({ hasText: /^Deleted/ }).waitFor({ timeout: 8000 }).catch(() => {});
      }
    }
    await context.close();
  } catch (error) {
    console.log(`cleanup through the UI failed: ${error.message}`);
  }
  const leftover = await apiCleanup();
  check('cleanup: the UI deleted everything this run created (the API safety net found nothing left)', leftover === 0, `${leftover} left`);
  await browser.close();
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed} of ${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
