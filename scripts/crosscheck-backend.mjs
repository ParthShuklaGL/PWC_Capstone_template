#!/usr/bin/env node
// Cross-checks the whole CRM backend over HTTP: the existing contacts, accounts and
// activities endpoints, the deals API, sign-in, roles and deal ownership.
//
//   node scripts/crosscheck-backend.mjs
//   node scripts/crosscheck-backend.mjs --base http://localhost:5080
//
// Needs Node 22 and a running API. It changes data: it creates a few deals and moves
// them to WON and LOST, which cannot be deleted. Run db-setup/02-reset-schema.sql and
// restart the API to get back to the seeded state. Safe to run more than once.

const args = process.argv.slice(2);
const baseArg = args.indexOf('--base');
const BASE = (baseArg >= 0 ? args[baseArg + 1] : process.env.CRM_BASE) ?? 'http://localhost:5080';

let passed = 0;
let failed = 0;
let warned = 0;
const failures = [];
let section = '';

function heading(title) {
  section = title;
  console.log(`\n${title}`);
}

function record(ok, label, detail = '') {
  if (ok) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    failures.push(`${section}: ${label}${detail ? ` (${detail})` : ''}`);
    console.log(`  FAIL  ${label}${detail ? `  -> ${detail}` : ''}`);
  }
}

function check(label, condition, detail = '') {
  record(Boolean(condition), label, condition ? '' : String(detail));
}

function note(label) {
  console.log(`  note  ${label}`);
}

function warn(label) {
  warned++;
  console.log(`  WARN  ${label}`);
}

// Signed in as the admin for sections 1-4; section 5 checks every role.
let token = null;
const ADMIN = {
  email: process.env.CRM_ADMIN_EMAIL ?? 'admin@nimbus.test',
  password: process.env.CRM_ADMIN_PASSWORD ?? 'Admin#2026',
};
const REP_PASSWORD = process.env.CRM_REP_PASSWORD ?? 'Rep#2026';

async function call(method, path, body, as = token) {
  const init = { method, headers: {} };
  if (as) {
    init.headers.Authorization = `Bearer ${as}`;
  }
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(`${BASE}${path}`, init);
  } catch (error) {
    throw new Error(`Could not reach ${BASE}${path}: ${error.message}`);
  }
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, json, text };
}

const get = (path) => call('GET', path);
const post = (path, body) => call('POST', path, body);
const put = (path, body) => call('PUT', path, body);
const del = (path) => call('DELETE', path);

function isError(res, status, code) {
  return res.status === status && res.json?.error === code;
}

function describe(res) {
  return `HTTP ${res.status} ${res.text.slice(0, 160)}`;
}

const cents = (value) => Math.round(Number(value) * 100);

async function waitForApi() {
  const deadline = Date.now() + 60_000;
  let lastError = '';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/accounts`);
      // Any answer below 500 means the API is up (it answers 401 until you sign in).
      if (res.status < 500) {
        return;
      }
      lastError = `HTTP ${res.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  console.error(`The API did not answer at ${BASE} within 60 seconds (${lastError}).`);
  console.error('Start it first: see README.md, "Run it in VS Code".');
  process.exit(2);
}

// ---------------------------------------------------------------------------------------

async function existingEndpoints() {
  heading('1. Existing endpoints: contacts, accounts, activities');

  const accounts = await get('/api/accounts');
  check('GET /api/accounts returns 30 accounts', accounts.status === 200 && accounts.json?.length === 30, describe(accounts));

  const account = await get('/api/accounts/A-0008');
  check('GET /api/accounts/A-0008 returns the account', account.status === 200 && account.json?.accountRef === 'A-0008', describe(account));

  const missingAccount = await get('/api/accounts/A-9999');
  check('unknown account is 404 ACCOUNT_NOT_FOUND', isError(missingAccount, 404, 'ACCOUNT_NOT_FOUND'), describe(missingAccount));

  const people = await get('/api/accounts/A-0008/contacts');
  check('GET /api/accounts/A-0008/contacts lists its people', people.status === 200 && people.json?.length > 0, describe(people));

  const page = await get('/api/contacts?page=0&size=20');
  check('GET /api/contacts returns a page of 20', page.status === 200 && page.json?.items?.length === 20, describe(page));
  check('the list reports 150 contacts over 8 pages', page.json?.totalElements === 150 && page.json?.totalPages === 8, `totalElements=${page.json?.totalElements} totalPages=${page.json?.totalPages}`);

  const customers = await get('/api/contacts?page=0&size=20&status=CUSTOMER');
  check('status=CUSTOMER filters the list', customers.status === 200 && customers.json?.items?.every((c) => c.status === 'CUSTOMER'), describe(customers));

  const search = await get('/api/contacts/search?q=Fenwick');
  check('search finds Fenwick', search.status === 200 && search.json?.some((c) => c.lastName === 'Fenwick'), describe(search));

  const one = await get('/api/contacts/C-00089');
  check('GET /api/contacts/C-00089 returns Nadia Fenwick', one.status === 200 && one.json?.firstName === 'Nadia' && one.json?.lastName === 'Fenwick', describe(one));

  const missing = await get('/api/contacts/C-99999');
  check('unknown contact is 404 CONTACT_NOT_FOUND', isError(missing, 404, 'CONTACT_NOT_FOUND'), describe(missing));

  const activities = await get('/api/contacts/C-00001/activities');
  check('GET /api/contacts/C-00001/activities lists activity', activities.status === 200 && Array.isArray(activities.json) && activities.json.length > 0, describe(activities));

  const badActivity = await post('/api/contacts/C-00001/activities', {});
  check('an empty activity is 400 VALIDATION_FAILED naming type and subject',
    badActivity.status === 400 && badActivity.json?.error === 'VALIDATION_FAILED' && badActivity.json?.fields?.type && badActivity.json?.fields?.subject,
    describe(badActivity));
}

async function dealsReadOnly() {
  heading('2. Deals: reads, filters, summary');

  const list = await get('/api/deals?page=0&size=20');
  check('GET /api/deals returns a page of 20', list.status === 200 && list.json?.items?.length === 20, describe(list));
  const total = list.json?.totalElements ?? 0;
  check('at least the 32 seeded deals exist', total >= 32, `totalElements=${total}`);
  check('totalPages matches totalElements', list.json?.totalPages === Math.ceil(total / 20), `totalPages=${list.json?.totalPages}`);

  const first = list.json?.items?.[0] ?? {};
  const wanted = ['dealRef', 'title', 'value', 'currency', 'expectedCloseDate', 'stage', 'accountRef', 'accountName', 'contactRef', 'contactName', 'contactStatus'];
  const missingKeys = wanted.filter((k) => !(k in first));
  check('each deal carries the documented fields', missingKeys.length === 0, `missing: ${missingKeys.join(', ')}`);
  check('value is a number and currency is GBP', typeof first.value === 'number' && first.currency === 'GBP', JSON.stringify(first));
  check('expectedCloseDate is a calendar date (yyyy-MM-dd)', /^\d{4}-\d{2}-\d{2}$/.test(first.expectedCloseDate ?? ''), first.expectedCloseDate);

  // Ordering must hold across pages: this is the thing CRM-142 gets wrong for contacts.
  const second = await get('/api/deals?page=1&size=20');
  const lastOfFirst = list.json?.items?.at(-1)?.expectedCloseDate;
  const firstOfSecond = second.json?.items?.[0]?.expectedCloseDate;
  const sortedWithin = (items) => items.every((d, i) => i === 0 || items[i - 1].expectedCloseDate <= d.expectedCloseDate);
  check('deals are in expected-close order within a page', sortedWithin(list.json?.items ?? []) && sortedWithin(second.json?.items ?? []), '');
  check('and the order holds across the page boundary (no CRM-142 here)', lastOfFirst <= firstOfSecond, `${lastOfFirst} then ${firstOfSecond}`);

  const nego = await get('/api/deals?stage=NEGOTIATION&size=100');
  check('stage=NEGOTIATION returns only NEGOTIATION deals', nego.status === 200 && nego.json?.items?.length >= 5 && nego.json.items.every((d) => d.stage === 'NEGOTIATION'), describe(nego));

  const lower = await get('/api/deals?stage=negotiation&size=100');
  check('stage names are not case sensitive', lower.status === 200 && lower.json?.totalElements === nego.json?.totalElements, describe(lower));

  const typo = await get('/api/deals?stage=NEGOTIATIONS');
  check('an unknown stage is 400 VALIDATION_FAILED with fields.stage (not a 500)',
    typo.status === 400 && typo.json?.error === 'VALIDATION_FAILED' && typo.json?.fields?.stage, describe(typo));

  const numeric = await get('/api/deals?stage=3');
  check('a numeric stage is also 400', numeric.status === 400, describe(numeric));

  const one = await get('/api/deals/D-00016');
  check('GET /api/deals/D-00016 is the NEGOTIATION deal for C-00001',
    one.status === 200 && one.json?.stage === 'NEGOTIATION' && one.json?.contactRef === 'C-00001', describe(one));

  const missing = await get('/api/deals/D-99999');
  check('unknown deal is 404 DEAL_NOT_FOUND', isError(missing, 404, 'DEAL_NOT_FOUND'), describe(missing));

  const history = await get('/api/deals/D-00016/history');
  const stages = history.json?.map((h) => h.toStage) ?? [];
  check('history of D-00016 runs created, QUALIFIED, PROPOSAL, NEGOTIATION',
    history.status === 200 && history.json?.[0]?.fromStage === null && stages.join() === 'PROSPECTING,QUALIFIED,PROPOSAL,NEGOTIATION', `${history.status} ${stages.join()}`);
  check('history has no "who": the app has no authentication',
    history.json?.every((h) => !('changedBy' in h) && !('user' in h)), '');

  const missingHistory = await get('/api/deals/D-99999/history');
  check('history of an unknown deal is 404', isError(missingHistory, 404, 'DEAL_NOT_FOUND'), describe(missingHistory));

  const byContact = await get('/api/contacts/C-00003/deals');
  const outcomes = (byContact.json ?? []).map((d) => d.stage).sort();
  check('C-00003 has one WON and one LOST deal', byContact.status === 200 && outcomes.includes('WON') && outcomes.includes('LOST'), describe(byContact));
  check('and is a CUSTOMER: losing a deal did not undo the win', byContact.json?.every((d) => d.contactStatus === 'CUSTOMER'), '');

  const unknownContact = await get('/api/contacts/C-99999/deals');
  check('deals of an unknown contact is 404 CONTACT_NOT_FOUND', isError(unknownContact, 404, 'CONTACT_NOT_FOUND'), describe(unknownContact));

  // The number Priya cares about, checked against the list it summarises.
  const summary = await get('/api/deals/summary');
  const stagesOut = summary.json?.stages?.map((s) => s.stage) ?? [];
  check('summary lists all six stages in pipeline order',
    summary.status === 200 && stagesOut.join() === 'PROSPECTING,QUALIFIED,PROPOSAL,NEGOTIATION,WON,LOST', stagesOut.join());

  const all = await get('/api/deals?page=0&size=100');
  const rows = all.json?.items ?? [];
  check('(all deals fit in one request of 100)', rows.length === all.json?.totalElements, `got ${rows.length} of ${all.json?.totalElements}`);

  const byStage = {};
  for (const d of rows) {
    byStage[d.stage] ??= { count: 0, cents: 0 };
    byStage[d.stage].count++;
    byStage[d.stage].cents += cents(d.value);
  }
  let agree = true;
  let detail = '';
  for (const s of summary.json?.stages ?? []) {
    const expected = byStage[s.stage] ?? { count: 0, cents: 0 };
    if (s.count !== expected.count || cents(s.totalValue) !== expected.cents) {
      agree = false;
      detail += `${s.stage}: summary ${s.count}/${s.totalValue}, list ${expected.count}/${expected.cents / 100}. `;
    }
  }
  check('every stage in the summary agrees with the deal list (count and value to the penny)', agree, detail);

  const openStages = ['PROSPECTING', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'];
  const openCount = openStages.reduce((n, s) => n + (byStage[s]?.count ?? 0), 0);
  const openCents = openStages.reduce((n, s) => n + (byStage[s]?.cents ?? 0), 0);
  check('openCount and openValue cover the four open stages only (not WON, not LOST)',
    summary.json?.openCount === openCount && cents(summary.json?.openValue) === openCents,
    `openCount ${summary.json?.openCount} vs ${openCount}, openValue ${summary.json?.openValue} vs ${openCents / 100}`);
  note(`pipeline right now: ${openCount} open deals worth GBP ${(openCents / 100).toLocaleString('en-GB')}`);
  return summary.json;
}

async function dealsValidation() {
  heading('3. Deals: creating (every way it should be refused)');

  const empty = await post('/api/deals', {});
  const wanted = ['title', 'accountRef', 'contactRef', 'value', 'expectedCloseDate'];
  const missing = wanted.filter((f) => !empty.json?.fields?.[f]);
  check('an empty body is 400 VALIDATION_FAILED naming every missing field',
    empty.status === 400 && empty.json?.error === 'VALIDATION_FAILED' && missing.length === 0, `${describe(empty)} missing: ${missing.join()}`);

  const good = { title: 'Crosscheck', accountRef: 'A-0008', contactRef: 'C-00001', value: 1000, expectedCloseDate: '2099-12-31' };

  const negative = await post('/api/deals', { ...good, value: -5 });
  check('a negative value is 400 with fields.value', negative.status === 400 && negative.json?.fields?.value, describe(negative));

  const zero = await post('/api/deals', { ...good, value: 0 });
  check('a zero value is 400 with fields.value', zero.status === 400 && zero.json?.fields?.value, describe(zero));

  const longTitle = await post('/api/deals', { ...good, title: 'x'.repeat(201) });
  check('a 201-character title is 400 with fields.title', longTitle.status === 400 && longTitle.json?.fields?.title, describe(longTitle));

  const past = await post('/api/deals', { ...good, expectedCloseDate: '2020-01-01' });
  check('an expected close date in the past is 400 with fields.expectedCloseDate',
    past.status === 400 && past.json?.fields?.expectedCloseDate, describe(past));

  const badDate = await post('/api/deals', { ...good, expectedCloseDate: 'next tuesday' });
  check('an unreadable date is 400 with fields.expectedCloseDate',
    badDate.status === 400 && badDate.json?.fields?.expectedCloseDate, describe(badDate));

  const wrongAccount = await post('/api/deals', { ...good, accountRef: 'A-0001' });
  check('a contact from a different account is 400 with fields.contactRef (C-00001 works at A-0008)',
    wrongAccount.status === 400 && wrongAccount.json?.fields?.contactRef, describe(wrongAccount));

  const noAccount = await post('/api/deals', { ...good, accountRef: 'A-9999' });
  check('an unknown account is 404 ACCOUNT_NOT_FOUND', isError(noAccount, 404, 'ACCOUNT_NOT_FOUND'), describe(noAccount));

  const noContact = await post('/api/deals', { ...good, contactRef: 'C-99999' });
  check('an unknown contact is 404 CONTACT_NOT_FOUND', isError(noContact, 404, 'CONTACT_NOT_FOUND'), describe(noContact));
}

async function dealLifecycle(before) {
  heading('4. Deals: the whole lifecycle, and the effect on the contact');

  // A prospect we can safely promote. Put them back to PROSPECT first so reruns work.
  const contactRef = 'C-00013';
  const contact = await get(`/api/contacts/${contactRef}`);
  const accountRef = contact.json?.account?.accountRef;
  check(`${contactRef} exists and has an account`, contact.status === 200 && accountRef, describe(contact));
  if (!accountRef) {
    return;
  }

  const reset = await put(`/api/contacts/${contactRef}`, {
    firstName: contact.json.firstName,
    lastName: contact.json.lastName,
    email: contact.json.email,
    phone: contact.json.phone,
    jobTitle: contact.json.jobTitle,
    status: 'PROSPECT',
  });
  check(`${contactRef} reset to PROSPECT`, reset.status === 200 && reset.json?.status === 'PROSPECT', describe(reset));

  const created = await post('/api/deals', { title: 'Crosscheck: practice-wide licence', accountRef, contactRef, value: 12345.67, expectedCloseDate: '2099-12-31' });
  check('POST /api/deals is 201 and starts in PROSPECTING',
    created.status === 201 && created.json?.stage === 'PROSPECTING' && /^D-\d{5}$/.test(created.json?.dealRef ?? ''), describe(created));
  const ref = created.json?.dealRef;
  if (!ref) {
    return;
  }
  check('the new deal carries the account and contact names', created.json.accountRef === accountRef && created.json.contactRef === contactRef && created.json.contactName && created.json.accountName, JSON.stringify(created.json));
  check('value keeps its pence', created.json.value === 12345.67, `value=${created.json.value}`);
  check('the contact is still a PROSPECT', created.json.contactStatus === 'PROSPECT', created.json.contactStatus);

  const fetched = await get(`/api/deals/${ref}`);
  check('the new deal can be fetched', fetched.status === 200 && fetched.json?.title === 'Crosscheck: practice-wide licence', describe(fetched));

  const edited = await put(`/api/deals/${ref}`, { title: 'Crosscheck: revised', value: 20000, expectedCloseDate: '2099-11-30' });
  check('PUT edits title, value and expected close date', edited.status === 200 && edited.json?.title === 'Crosscheck: revised' && edited.json?.value === 20000 && edited.json?.expectedCloseDate === '2099-11-30', describe(edited));

  const editedBad = await put(`/api/deals/${ref}`, { title: '', value: 0, expectedCloseDate: '2099-11-30' });
  check('PUT with an empty title and zero value is 400 naming both', editedBad.status === 400 && editedBad.json?.fields?.title && editedBad.json?.fields?.value, describe(editedBad));

  const editedMissing = await put('/api/deals/D-99999', { title: 'x', value: 1, expectedCloseDate: '2099-11-30' });
  check('PUT on an unknown deal is 404', isError(editedMissing, 404, 'DEAL_NOT_FOUND'), describe(editedMissing));

  const stage = (to, extra = {}) => post(`/api/deals/${ref}/stage`, { stage: to, ...extra });

  const jump = await stage('NEGOTIATION');
  check('PROSPECTING to NEGOTIATION is refused: 409 DEAL_STAGE_TRANSITION_INVALID', isError(jump, 409, 'DEAL_STAGE_TRANSITION_INVALID'), describe(jump));
  check('and the message says why, in words', typeof jump.json?.message === 'string' && jump.json.message.length > 20, jump.json?.message);

  const jumpWon = await stage('WON', { closeDate: '2026-10-05' });
  check('PROSPECTING straight to WON is refused too', isError(jumpWon, 409, 'DEAL_STAGE_TRANSITION_INVALID'), describe(jumpWon));

  const typo = await stage('NEGOTIATIONS');
  check('an unknown stage is 400 with fields.stage', typo.status === 400 && typo.json?.fields?.stage, describe(typo));

  const noStage = await post(`/api/deals/${ref}/stage`, {});
  check('a missing stage is 400 with fields.stage', noStage.status === 400 && noStage.json?.fields?.stage, describe(noStage));

  const same = await stage('PROSPECTING');
  check('moving to the stage it is already in is refused', isError(same, 409, 'DEAL_STAGE_TRANSITION_INVALID'), describe(same));

  const q1 = await stage('QUALIFIED');
  check('PROSPECTING to QUALIFIED is allowed', q1.status === 200 && q1.json?.stage === 'QUALIFIED', describe(q1));

  const back = await stage('PROSPECTING');
  check('and a deal may go back one stage', back.status === 200 && back.json?.stage === 'PROSPECTING', describe(back));

  const q2 = await stage('QUALIFIED');
  const prop = await stage('PROPOSAL');
  check('QUALIFIED to PROPOSAL is allowed', q2.status === 200 && prop.status === 200 && prop.json?.stage === 'PROPOSAL', describe(prop));

  const backTwo = await stage('PROSPECTING');
  check('going back two stages is refused', isError(backTwo, 409, 'DEAL_STAGE_TRANSITION_INVALID'), describe(backTwo));

  const wonEarly = await stage('WON', { closeDate: '2026-10-05' });
  check('PROPOSAL straight to WON is refused: a deal can only be won from NEGOTIATION', isError(wonEarly, 409, 'DEAL_STAGE_TRANSITION_INVALID'), describe(wonEarly));

  const nego = await stage('NEGOTIATION');
  check('PROPOSAL to NEGOTIATION is allowed', nego.status === 200 && nego.json?.stage === 'NEGOTIATION', describe(nego));

  const noClose = await stage('WON');
  check('winning without a closeDate is 400 with fields.closeDate', noClose.status === 400 && noClose.json?.fields?.closeDate, describe(noClose));

  const still = await get(`/api/deals/${ref}`);
  check('and the refused attempts left the deal in NEGOTIATION', still.json?.stage === 'NEGOTIATION' && still.json?.contactStatus === 'PROSPECT', describe(still));

  const deleteOpen = await del(`/api/deals/${ref}`);
  check('a deal that has got past PROSPECTING cannot be deleted: 409 DEAL_DELETE_NOT_ALLOWED', isError(deleteOpen, 409, 'DEAL_DELETE_NOT_ALLOWED'), describe(deleteOpen));

  const won = await stage('WON', { closeDate: '2026-10-05' });
  check('NEGOTIATION to WON with a closeDate is allowed', won.status === 200 && won.json?.stage === 'WON' && won.json?.closedDate === '2026-10-05', describe(won));
  check('the response already shows the contact as a CUSTOMER', won.json?.contactStatus === 'CUSTOMER', won.json?.contactStatus);

  const customer = await get(`/api/contacts/${contactRef}`);
  check('winning a deal made the contact a CUSTOMER on the contact record', customer.json?.status === 'CUSTOMER', customer.json?.status);

  const editWon = await put(`/api/deals/${ref}`, { title: 'Too late', value: 1, expectedCloseDate: '2099-11-30' });
  check('a WON deal cannot be edited: 409 DEAL_CLOSED', isError(editWon, 409, 'DEAL_CLOSED'), describe(editWon));

  const moveWon = await stage('NEGOTIATION');
  check('and cannot be moved: WON is final', isError(moveWon, 409, 'DEAL_STAGE_TRANSITION_INVALID'), describe(moveWon));

  const deleteWon = await del(`/api/deals/${ref}`);
  check('and cannot be deleted', isError(deleteWon, 409, 'DEAL_DELETE_NOT_ALLOWED'), describe(deleteWon));

  const history = await get(`/api/deals/${ref}/history`);
  const trail = history.json?.map((h) => `${h.fromStage ?? 'null'}>${h.toStage}`).join(' ');
  check('the history records every successful move and none of the refused ones',
    trail === 'null>PROSPECTING PROSPECTING>QUALIFIED QUALIFIED>PROSPECTING PROSPECTING>QUALIFIED QUALIFIED>PROPOSAL PROPOSAL>NEGOTIATION NEGOTIATION>WON', trail);
  check('history is oldest first', history.json?.every((h, i) => i === 0 || history.json[i - 1].changedAt <= h.changedAt), '');

  // Losing one deal must not undo a win.
  const second = await post('/api/deals', { title: 'Crosscheck: second deal', accountRef, contactRef, value: 5000, expectedCloseDate: '2099-12-31' });
  const ref2 = second.json?.dealRef;
  check('a second deal for the same contact can be created', second.status === 201 && ref2, describe(second));
  check('and shows the contact as the CUSTOMER they now are', second.json?.contactStatus === 'CUSTOMER', second.json?.contactStatus);
  if (ref2) {
    const lostNoReason = await post(`/api/deals/${ref2}/stage`, { stage: 'LOST' });
    check('losing without a reason is 400 with fields.lostReason', lostNoReason.status === 400 && lostNoReason.json?.fields?.lostReason, describe(lostNoReason));

    const lost = await post(`/api/deals/${ref2}/stage`, { stage: 'LOST', lostReason: 'Crosscheck: no budget' });
    check('PROSPECTING to LOST with a reason is allowed (a deal can die at any open stage)',
      lost.status === 200 && lost.json?.stage === 'LOST' && lost.json?.lostReason === 'Crosscheck: no budget' && lost.json?.closedDate, describe(lost));

    const afterLoss = await get(`/api/contacts/${contactRef}`);
    check('losing a deal did NOT undo the win: the contact is still a CUSTOMER', afterLoss.json?.status === 'CUSTOMER', afterLoss.json?.status);

    const moveLost = await post(`/api/deals/${ref2}/stage`, { stage: 'PROSPECTING' });
    check('a LOST deal is final too', isError(moveLost, 409, 'DEAL_STAGE_TRANSITION_INVALID'), describe(moveLost));
  }

  const theirs = await get(`/api/contacts/${contactRef}/deals`);
  const theirRefs = (theirs.json ?? []).map((d) => d.dealRef);
  check('GET /api/contacts/{ref}/deals lists both new deals', theirRefs.includes(ref) && (!ref2 || theirRefs.includes(ref2)), theirRefs.join());

  // A deal that never got anywhere can be deleted.
  const third = await post('/api/deals', { title: 'Crosscheck: to be deleted', accountRef, contactRef, value: 100, expectedCloseDate: '2099-12-31' });
  const ref3 = third.json?.dealRef;
  check('a third deal can be created', third.status === 201 && ref3, describe(third));
  if (ref3) {
    const removed = await del(`/api/deals/${ref3}`);
    check('a PROSPECTING deal can be deleted: 204', removed.status === 204, describe(removed));
    const gone = await get(`/api/deals/${ref3}`);
    check('and is gone: 404', isError(gone, 404, 'DEAL_NOT_FOUND'), describe(gone));
    const goneHistory = await get(`/api/deals/${ref3}/history`);
    check('and so is its history', isError(goneHistory, 404, 'DEAL_NOT_FOUND'), describe(goneHistory));
    const deleteAgain = await del(`/api/deals/${ref3}`);
    check('deleting it again is 404', isError(deleteAgain, 404, 'DEAL_NOT_FOUND'), describe(deleteAgain));
  }

  // The summary must have moved by exactly what we did.
  const after = (await get('/api/deals/summary')).json;
  const diff = (stageName, key) => {
    const a = after?.stages?.find((s) => s.stage === stageName)?.[key] ?? 0;
    const b = before?.stages?.find((s) => s.stage === stageName)?.[key] ?? 0;
    return key === 'totalValue' ? cents(a) - cents(b) : a - b;
  };
  check('summary: WON gained exactly one deal worth 20000.00', diff('WON', 'count') === 1 && diff('WON', 'totalValue') === 2000000, `count ${diff('WON', 'count')}, cents ${diff('WON', 'totalValue')}`);
  check('summary: LOST gained exactly one deal worth 5000.00', diff('LOST', 'count') === 1 && diff('LOST', 'totalValue') === 500000, `count ${diff('LOST', 'count')}, cents ${diff('LOST', 'totalValue')}`);
  check('summary: the open total did not move (one deal won, one lost, one deleted)', after?.openCount === before?.openCount && cents(after?.openValue) === cents(before?.openValue), `openCount ${before?.openCount} -> ${after?.openCount}`);

  note(`left behind (closed deals cannot be deleted): ${ref}, ${ref2 ?? '-'}. ${contactRef} is now a CUSTOMER.`);
}

// ---------------------------------------------------------------------------------------

console.log(`CRM backend cross-check against ${BASE}`);
await waitForApi();

async function signIn(email, password) {
  const res = await call('POST', '/api/auth/login', { email, password }, null);
  return res.status === 200 ? res.json.token : null;
}

// ---------------------------------------------------------------------------------------

async function authAndRoles() {
  heading('5. Sign-in, roles and deal ownership');

  const anonymous = await call('GET', '/api/deals', undefined, null);
  check('no token: GET /api/deals is 401 UNAUTHENTICATED', isError(anonymous, 401, 'UNAUTHENTICATED'), describe(anonymous));

  const bad = await call('POST', '/api/auth/login', { email: ADMIN.email, password: 'wrong' }, null);
  check('wrong password is 401 INVALID_CREDENTIALS', isError(bad, 401, 'INVALID_CREDENTIALS'), describe(bad));

  const empty = await call('POST', '/api/auth/login', {}, null);
  check('empty login is 400 VALIDATION_FAILED naming email and password', empty.status === 400 && empty.json?.fields?.email && empty.json?.fields?.password, describe(empty));

  const admin = await signIn(ADMIN.email, ADMIN.password);
  const aisha = await signIn('aisha@nimbus.test', REP_PASSWORD);
  const ben = await signIn('ben@nimbus.test', REP_PASSWORD);
  check('admin, aisha and ben can all sign in', admin && aisha && ben, 'a demo account could not sign in');
  if (!(admin && aisha && ben)) {
    return;
  }

  const me = await call('GET', '/api/auth/me', undefined, aisha);
  check('GET /api/auth/me returns role USER for a rep', me.status === 200 && me.json?.role === 'USER' && me.json?.userRef === 'U-0002', describe(me));

  const all = await call('GET', '/api/deals?size=100', undefined, admin);
  const mine = await call('GET', '/api/deals?size=100', undefined, aisha);
  const his = await call('GET', '/api/deals?size=100', undefined, ben);
  const adminOwned = all.json?.items?.filter((d) => d.ownerRef === 'U-0001').length ?? 0;
  check('admin sees every deal; the two reps see exactly the rest (admin-owned excluded)', all.json?.totalElements === mine.json?.totalElements + his.json?.totalElements + adminOwned, `${all.json?.totalElements} vs ${mine.json?.totalElements}+${his.json?.totalElements}+${adminOwned}`);
  check('every deal a rep sees is owned by that rep', mine.json?.items?.every((d) => d.ownerRef === 'U-0002') && his.json?.items?.every((d) => d.ownerRef === 'U-0003'), 'a deal with another owner leaked');

  const sumAll = await call('GET', '/api/deals/summary', undefined, admin);
  const sumA = await call('GET', '/api/deals/summary', undefined, aisha);
  const sumB = await call('GET', '/api/deals/summary', undefined, ben);
  check('summary is scoped: rep open totals plus admin-owned open deals equal the admin total', cents(sumAll.json?.openValue) === cents(sumA.json?.openValue) + cents(sumB.json?.openValue) + cents(all.json?.items?.filter((d) => d.ownerRef === 'U-0001' && !['WON', 'LOST'].includes(d.stage)).reduce((s, d) => s + d.value, 0) ?? 0), `${sumAll.json?.openValue} vs ${sumA.json?.openValue}+${sumB.json?.openValue}`);

  const bensDeal = his.json?.items?.find((d) => d.stage === 'PROSPECTING') ?? his.json?.items?.[0];
  const peek = await call('GET', `/api/deals/${bensDeal.dealRef}`, undefined, aisha);
  check("a rep asking for another rep's deal gets 404 DEAL_NOT_FOUND", isError(peek, 404, 'DEAL_NOT_FOUND'), describe(peek));
  const peekHistory = await call('GET', `/api/deals/${bensDeal.dealRef}/history`, undefined, aisha);
  check("...and cannot read its history either", isError(peekHistory, 404, 'DEAL_NOT_FOUND'), describe(peekHistory));
  const steal = await call('POST', `/api/deals/${bensDeal.dealRef}/stage`, { stage: 'QUALIFIED' }, aisha);
  check("...and cannot move it", isError(steal, 404, 'DEAL_NOT_FOUND'), describe(steal));

  const createAsRep = await call('POST', '/api/deals', {}, aisha);
  check('a rep cannot create a deal: 403 FORBIDDEN', isError(createAsRep, 403, 'FORBIDDEN'), describe(createAsRep));
  const editAsRep = await call('PUT', `/api/deals/${bensDeal.dealRef}`, {}, ben);
  check('a rep cannot edit a deal, even their own: 403', editAsRep.status === 403, describe(editAsRep));
  const deleteAsRep = await call('DELETE', `/api/deals/${bensDeal.dealRef}`, undefined, ben);
  check('a rep cannot delete a deal: 403', deleteAsRep.status === 403, describe(deleteAsRep));
  const putContact = await call('PUT', '/api/contacts/C-00001', {}, aisha);
  check('a rep cannot edit a contact: 403', putContact.status === 403, describe(putContact));
  const postContact = await call('POST', '/api/contacts', {}, aisha);
  check('a rep cannot add a contact: 403', postContact.status === 403, describe(postContact));
  const postAccount = await call('POST', '/api/accounts', {}, aisha);
  check('a rep cannot add an account: 403', postAccount.status === 403, describe(postAccount));
  const users = await call('GET', '/api/users', undefined, aisha);
  check('a rep cannot list users: 403', users.status === 403, describe(users));

  const readContacts = await call('GET', '/api/contacts?page=0&size=5', undefined, aisha);
  check('a rep can read contacts and accounts', readContacts.status === 200 && (await call('GET', '/api/accounts', undefined, aisha)).status === 200, describe(readContacts));

  const logged = await call('POST', '/api/contacts/C-00001/activities', { type: 'NOTE', subject: 'Rep check-in', notes: 'crosscheck', occurredAt: new Date().toISOString() }, aisha);
  check('a rep can log an activity', logged.status === 201, describe(logged));

  const ownStage = mine.json?.items?.find((d) => d.stage === 'PROSPECTING');
  if (ownStage) {
    const moved = await call('POST', `/api/deals/${ownStage.dealRef}/stage`, { stage: 'QUALIFIED' }, aisha);
    check('a rep can move their own deal', moved.status === 200 && moved.json?.stage === 'QUALIFIED', describe(moved));
    note(`${ownStage.dealRef} was moved to QUALIFIED by Aisha`);
  }

  const adminUsers = await call('GET', '/api/users', undefined, admin);
  check('admin can list users (3 demo accounts)', adminUsers.status === 200 && adminUsers.json?.length >= 3, describe(adminUsers));

  const stamp = Date.now().toString().slice(-6);
  const account = await call('POST', '/api/accounts', { name: `Crosscheck Co ${stamp}`, industry: 'Testing', country: 'UK' }, admin);
  check('admin can add an account', account.status === 201 && /^A-\d{4}$/.test(account.json?.accountRef ?? ''), describe(account));
  const contact = await call('POST', '/api/contacts', { accountRef: account.json?.accountRef, firstName: 'Cross', lastName: `Check${stamp}`, email: `cross.${stamp}@example.com` }, admin);
  check('admin can add a contact to it', contact.status === 201 && contact.json?.contactRef, describe(contact));
  const edited = await call('PUT', `/api/accounts/${account.json?.accountRef}`, { name: `Crosscheck Co ${stamp} Ltd`, industry: 'Testing', country: 'UK' }, admin);
  check('admin can edit the account', edited.status === 200 && edited.json?.name?.endsWith('Ltd'), describe(edited));
  const owned = await call('POST', '/api/deals', { title: `Owner check ${stamp}`, accountRef: account.json?.accountRef, contactRef: contact.json?.contactRef, value: 1000, expectedCloseDate: '2027-12-31', ownerRef: 'U-0003' }, admin);
  check('admin can create a deal owned by a chosen rep', owned.status === 201 && owned.json?.ownerRef === 'U-0003', describe(owned));
  const badOwner = await call('POST', '/api/deals', { title: 'x', accountRef: account.json?.accountRef, contactRef: contact.json?.contactRef, value: 1, expectedCloseDate: '2027-12-31', ownerRef: 'U-9999' }, admin);
  check('an unknown ownerRef is 400 naming ownerRef', badOwner.status === 400 && badOwner.json?.fields?.ownerRef, describe(badOwner));
  const benSees = await call('GET', `/api/deals/${owned.json?.dealRef}`, undefined, ben);
  check('the chosen rep can open it; the other rep cannot', benSees.status === 200 && (await call('GET', `/api/deals/${owned.json?.dealRef}`, undefined, aisha)).status === 404, describe(benSees));
  const removed = await call('DELETE', `/api/deals/${owned.json?.dealRef}`, undefined, admin);
  check('admin can delete a PROSPECTING deal', removed.status === 204, describe(removed));

  note(`left behind: account ${account.json?.accountRef} and contact ${contact.json?.contactRef} (no delete endpoint exists)`);
}

try {
  token = await signIn(ADMIN.email, ADMIN.password);
  if (!token) {
    throw new Error(`Could not sign in as ${ADMIN.email}. Set CRM_ADMIN_EMAIL / CRM_ADMIN_PASSWORD if you changed the demo accounts.`);
  }
  await existingEndpoints();
  const before = await dealsReadOnly();
  await dealsValidation();
  await dealLifecycle(before);
  await authAndRoles();
} catch (error) {
  console.error(`\nStopped early: ${error.message}`);
  process.exit(2);
}

console.log(`\n${passed} passed, ${failed} failed, ${warned} warnings`);
if (failed > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f}`);
  }
  process.exit(1);
}
process.exit(0);
