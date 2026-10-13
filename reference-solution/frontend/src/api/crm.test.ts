import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accounts, contacts, deals, fetchAllAccounts } from './crm.ts';
import { request } from './http.ts';
import { setToken } from './tokenStore.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const empty = { items: [], page: 0, size: 10, total: 0 };
const newAccount = { name: 'A', industry: null, country: null, website: null };

let fetchMock: ReturnType<typeof vi.fn>;
const urls = () => fetchMock.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${url}`);
const headersOf = (call: number) => new Headers(fetchMock.mock.calls[call][1].headers);

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  setToken(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  setToken(null);
});

describe('list calls', () => {
  it('ask for ten rows and leave out every empty filter', async () => {
    fetchMock.mockResolvedValue(json(200, empty));

    await accounts.list({ page: 0, search: '' });

    expect(urls()).toEqual(['GET /api/accounts?size=10&page=0']);
  });

  it('send the page, the search and the filters under the names the API expects', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(200, empty)));

    await deals.list({ page: 2, search: 'fleet roll', stage: 'WON', accountId: '3', contactId: '' });
    await contacts.list({ page: 1, search: 'okafor', accountId: 3, status: 'CUSTOMER' });

    expect(urls()).toEqual([
      'GET /api/deals?size=10&page=2&search=fleet+roll&stage=WON&accountId=3',
      'GET /api/contacts?size=10&page=1&search=okafor&accountId=3&status=CUSTOMER',
    ]);
  });
});

describe('create, update, delete', () => {
  it('POST a new account and return the saved row', async () => {
    fetchMock.mockResolvedValue(json(201, { id: 9, name: 'Proof Co' }));
    setToken('jwt');

    const saved = await accounts.create({ name: 'Proof Co', industry: null, country: null, website: null });

    expect(saved.id).toBe(9);
    expect(urls()).toEqual(['POST /api/accounts']);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ name: 'Proof Co', industry: null, country: null, website: null });
  });

  it('PUT every editable field of a deal to its own address, and never send closedDate', async () => {
    fetchMock.mockResolvedValue(json(200, { id: 7 }));
    setToken('jwt');

    await deals.update(7, { contactId: 1, title: 'T', value: 10, expectedCloseDate: '2026-12-01', stage: 'LOST', lostReason: 'Budget' });

    expect(urls()).toEqual(['PUT /api/deals/7']);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(Object.keys(body).sort()).toEqual(['contactId', 'expectedCloseDate', 'lostReason', 'stage', 'title', 'value']);
  });

  it('DELETE resolves with nothing on a 204', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    setToken('jwt');

    await expect(contacts.remove(4)).resolves.toBeUndefined();
    expect(urls()).toEqual(['DELETE /api/contacts/4']);
  });
});

describe('pickers', () => {
  it('read pages of 100 until the total is reached', async () => {
    const rows = (from: number, count: number) => Array.from({ length: count }, (_, index) => ({ id: from + index }));
    fetchMock
      .mockResolvedValueOnce(json(200, { items: rows(0, 100), page: 0, size: 100, total: 130 }))
      .mockResolvedValueOnce(json(200, { items: rows(100, 30), page: 1, size: 100, total: 130 }));

    const all = await fetchAllAccounts();

    expect(all).toHaveLength(130);
    expect(urls()).toEqual(['GET /api/accounts?page=0&size=100', 'GET /api/accounts?page=1&size=100']);
  });
});

describe('the CSRF token on changes', () => {
  it('is fetched and sent for a cookie or session sign-in (no JWT held by the browser)', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { headerName: 'X-CSRF-TOKEN', token: 'csrf-abc' }))
      .mockResolvedValueOnce(json(201, { id: 1 }));

    await accounts.create(newAccount);

    expect(urls()).toEqual(['GET /api/auth/csrf', 'POST /api/accounts']);
    expect(headersOf(1).get('X-CSRF-TOKEN')).toBe('csrf-abc');
    expect(headersOf(1).has('Authorization')).toBe(false);
  });

  it('is sent on PUT and DELETE too', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(url === '/api/auth/csrf' ? json(200, { headerName: 'X-CSRF-TOKEN', token: 't' }) : json(200, { id: 1 })),
    );

    await deals.update(1, { contactId: 1, title: 'T', value: 1, expectedCloseDate: '2026-12-01', stage: 'WON', lostReason: null });
    await deals.remove(1).catch(() => undefined);

    const changes = fetchMock.mock.calls.filter(([url]) => url !== '/api/auth/csrf');
    expect(changes.map(([url, init]) => `${init.method} ${url}`)).toEqual(['PUT /api/deals/1', 'DELETE /api/deals/1']);
    expect(changes.every(([, init]) => new Headers(init.headers).get('X-CSRF-TOKEN') === 't')).toBe(true);
  });

  it('is not fetched for a JWT sign-in, which sends a Bearer header instead', async () => {
    setToken('jwt-value');
    fetchMock.mockResolvedValue(json(201, { id: 1 }));

    await accounts.create(newAccount);

    expect(urls()).toEqual(['POST /api/accounts']);
    expect(headersOf(0).get('Authorization')).toBe('Bearer jwt-value');
    expect(headersOf(0).has('X-CSRF-TOKEN')).toBe(false);
  });

  it('is not fetched for a read', async () => {
    fetchMock.mockResolvedValue(json(200, empty));

    await accounts.list({});

    expect(urls()).toEqual(['GET /api/accounts?size=10']);
  });

  it('is skipped when the caller says so (sign-in and register happen before any credential exists)', async () => {
    fetchMock.mockResolvedValue(json(200, {}));

    await request('/auth/login', { method: 'POST' }, { expectSignedIn: false, csrf: false });

    expect(urls()).toEqual(['POST /api/auth/login']);
  });
});
