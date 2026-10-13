import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setToken } from '../api/tokenStore.ts';
import { ADMIN_ME, USER_ME, account, contact, deal, mockApi, pageOf, problem, reply, renderAs, type Call } from '../test/harness.tsx';
import AccountsPage from './AccountsPage.tsx';
import ContactsPage from './ContactsPage.tsx';
import DealsPage from './DealsPage.tsx';

beforeEach(() => setToken('jwt'));
afterEach(() => {
  vi.unstubAllGlobals();
  setToken(null);
});

const STAGES = [
  { stage: 'PROSPECTING', deals: 3, totalValue: 46850.5 },
  { stage: 'WON', deals: 5, totalValue: 137400 },
];

/** Answers the reads every screen makes; `extra` answers the rest. */
function api(extra: (call: Call) => ReturnType<typeof reply> | undefined = () => undefined) {
  return mockApi((call) => {
    const own = extra(call);
    if (own) return own;
    if (call.method !== 'GET') return undefined;
    if (call.url.startsWith('/api/accounts')) return reply(200, pageOf([account(), account({ id: 2, name: 'Brightwater Foods', contactCount: 0 })]));
    if (call.url.startsWith('/api/contacts/')) return reply(200, contact());
    if (call.url.startsWith('/api/contacts')) return reply(200, pageOf([contact(), contact({ id: 2, firstName: 'Priya', lastName: 'Nair', status: 'PROSPECT' })]));
    if (call.url.startsWith('/api/deals')) return reply(200, pageOf([deal(), deal({ id: 8, title: 'Invoice automation', stage: 'WON', closedDate: '2026-10-02' })]));
    if (call.url === '/api/reports/deals-by-stage') return reply(200, STAGES);
    return undefined;
  });
}

describe('AccountsPage', () => {
  it('lists accounts with their contact count linked to the filtered contacts', async () => {
    api();
    renderAs(ADMIN_ME, <AccountsPage />);

    const row = (await screen.findByText('Halcyon Freight')).closest('tr')!;
    expect(within(row).getByText('Logistics')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: '4 contacts at Halcyon Freight' })).toHaveAttribute('href', '/contacts?accountId=1');
  });

  it('shows Delete buttons to an ADMIN and none to a USER', async () => {
    api();
    const { unmount } = renderAs(ADMIN_ME, <AccountsPage />);
    await screen.findByText('Halcyon Freight');
    expect(screen.getAllByRole('button', { name: /^Delete / })).toHaveLength(2);
    unmount();

    renderAs(USER_ME, <AccountsPage />);
    await screen.findByText('Halcyon Freight');
    expect(screen.getAllByRole('button', { name: /^Edit / })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /^Delete / })).not.toBeInTheDocument();
  });

  it('asks first, and shows the server 409 message for an account that still has contacts', async () => {
    const calls = api((call) =>
      call.method === 'DELETE' ? problem(409, { detail: 'This account still has contacts. Move or delete them first.', code: 'ACCOUNT_HAS_CONTACTS' }) : undefined,
    );
    renderAs(ADMIN_ME, <AccountsPage />);
    await screen.findByText('Halcyon Freight');

    await userEvent.click(screen.getByRole('button', { name: 'Delete Halcyon Freight' }));
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This account still has contacts. Move or delete them first.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Halcyon Freight')).toBeInTheDocument();
    expect(calls.filter((call) => call.method === 'DELETE').map((call) => call.url)).toEqual(['/api/accounts/1']);
  });

  it('sends the search text as the search parameter, one request per search', async () => {
    const calls = api();
    renderAs(ADMIN_ME, <AccountsPage />);
    await screen.findByText('Halcyon Freight');

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search accounts' }), 'bright{Enter}');

    await waitFor(() => expect(calls.at(-1)?.url).toBe('/api/accounts?size=10&page=0&search=bright'));
    expect(calls.filter((call) => call.url.includes('search=')).length).toBe(1);
  });

  it('says so when the list is empty and when it fails', async () => {
    mockApi(() => reply(200, pageOf([])));
    const { unmount } = renderAs(ADMIN_ME, <AccountsPage />);
    expect(await screen.findByText(/No accounts yet/)).toBeInTheDocument();
    unmount();

    mockApi(() => problem(500, { title: 'An unexpected error occurred.' }));
    renderAs(ADMIN_ME, <AccountsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
  });
});

describe('ContactsPage', () => {
  it('turns the status and account filters into request parameters', async () => {
    const calls = api();
    renderAs(ADMIN_ME, <ContactsPage />);
    await screen.findByText('Maya Okafor');
    await screen.findByRole('option', { name: 'Brightwater Foods' });

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'CUSTOMER');
    await waitFor(() => expect(calls.at(-1)?.url).toBe('/api/contacts?size=10&page=0&status=CUSTOMER'));
    await userEvent.selectOptions(screen.getByLabelText('Account'), 'Brightwater Foods');

    await waitFor(() => expect(calls.at(-1)?.url).toBe('/api/contacts?size=10&page=0&accountId=2&status=CUSTOMER'));
  });

  it('starts from the filters in the address, as when linked from an account', async () => {
    const calls = api();
    renderAs(ADMIN_ME, <ContactsPage />, '/contacts?accountId=1&page=1');

    await screen.findByText('Maya Okafor');

    expect(calls.find((call) => call.url.startsWith('/api/contacts?'))?.url).toBe('/api/contacts?size=10&page=1&accountId=1');
  });

  it('shows Delete only to an ADMIN, and the 409 history message when the server refuses', async () => {
    api((call) =>
      call.method === 'DELETE'
        ? problem(409, { detail: 'This contact still has deals or logged activities, so it cannot be deleted.', code: 'CONTACT_HAS_HISTORY' })
        : undefined,
    );
    const { unmount } = renderAs(USER_ME, <ContactsPage />);
    await screen.findByText('Maya Okafor');
    expect(screen.queryByRole('button', { name: /^Delete / })).not.toBeInTheDocument();
    unmount();

    renderAs(ADMIN_ME, <ContactsPage />);
    await screen.findByText('Maya Okafor');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Maya Okafor' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete contact' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('still has deals or logged activities');
  });

  it('links each contact to that contact\'s deals', async () => {
    api();
    renderAs(USER_ME, <ContactsPage />);

    expect(await screen.findByRole('link', { name: 'Deals of Maya Okafor' })).toHaveAttribute('href', '/deals?contactId=1');
  });
});

describe('DealsPage', () => {
  it('shows the pipeline summary from the report, with GBP values, and does not add anything up', async () => {
    const calls = api();
    renderAs(ADMIN_ME, <DealsPage />);

    const won = await screen.findByRole('button', { name: /Won/ });
    expect(won).toHaveTextContent('5 deals');
    expect(won).toHaveTextContent('£137,400.00');
    expect(screen.getByRole('button', { name: /Prospecting/ })).toHaveTextContent('£46,850.50');
    expect(calls.some((call) => call.url === '/api/reports/deals-by-stage')).toBe(true);
  });

  it('filters the list when a stage tile or the stage select is chosen', async () => {
    const calls = api();
    renderAs(ADMIN_ME, <DealsPage />);
    await screen.findByRole('button', { name: /Won/ });

    await userEvent.click(screen.getByRole('button', { name: /Won/ }));
    await waitFor(() => expect(calls.at(-1)?.url).toBe('/api/deals?size=10&page=0&stage=WON'));
    expect(screen.getByRole('button', { name: /Won/ })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.selectOptions(screen.getByLabelText('Stage', { selector: '#filter-stage' }), 'PROPOSAL');
    await waitFor(() => expect(calls.at(-1)?.url).toBe('/api/deals?size=10&page=0&stage=PROPOSAL'));
  });

  it('shows value in GBP, dates as 2 Oct 2026, and a closed date only for closed deals', async () => {
    api();
    renderAs(ADMIN_ME, <DealsPage />);

    const open = (await screen.findByText('Fleet rollout')).closest('tr')!;
    expect(within(open).getByText('£48,000.00')).toBeInTheDocument();
    expect(within(open).getByText('2 Oct 2026')).toBeInTheDocument();
    expect(within(open).getByText('—')).toBeInTheDocument();
    const won = screen.getByText('Invoice automation').closest('tr')!;
    expect(within(won).getAllByText('2 Oct 2026')).toHaveLength(2);
  });

  it('changes the stage with a PUT of every field, then refreshes the list and the summary', async () => {
    const calls = api((call) => (call.method === 'PUT' ? reply(200, deal({ stage: 'PROPOSAL' })) : undefined));
    renderAs(ADMIN_ME, <DealsPage />);
    await screen.findByText('Fleet rollout');
    const listReads = () => calls.filter((call) => call.url.startsWith('/api/deals?')).length;
    const before = listReads();

    await userEvent.selectOptions(screen.getByLabelText('Stage of Fleet rollout'), 'PROPOSAL');

    await waitFor(() => expect(listReads()).toBe(before + 1));
    expect(calls.find((call) => call.method === 'PUT')).toMatchObject({
      url: '/api/deals/7',
      body: { contactId: 1, title: 'Fleet rollout', value: 48000, expectedCloseDate: '2026-10-02', stage: 'PROPOSAL', lostReason: null },
    });
    expect(calls.filter((call) => call.url === '/api/reports/deals-by-stage')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent('Moved Fleet rollout to Proposal.');
  });

  it('asks for a reason before moving a deal to Lost, and sends it', async () => {
    const calls = api((call) => (call.method === 'PUT' ? reply(200, deal({ stage: 'LOST', lostReason: 'Budget cut' })) : undefined));
    renderAs(ADMIN_ME, <DealsPage />);
    await screen.findByText('Fleet rollout');

    await userEvent.selectOptions(screen.getByLabelText('Stage of Fleet rollout'), 'LOST');
    const dialog = screen.getByRole('dialog');
    expect(calls.some((call) => call.method === 'PUT')).toBe(false);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as lost' }));
    expect(within(dialog).getByText('Say why the deal was lost.')).toBeInTheDocument();
    expect(calls.some((call) => call.method === 'PUT')).toBe(false);

    await userEvent.type(within(dialog).getByLabelText('Lost reason (required)'), 'Budget cut');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as lost' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(calls.find((call) => call.method === 'PUT')?.body).toMatchObject({ stage: 'LOST', lostReason: 'Budget cut' });
  });

  it('shows the server problem when a stage change is refused, and keeps the old stage', async () => {
    api((call) => (call.method === 'PUT' ? problem(404, { detail: 'That deal does not exist.', code: 'DEAL_NOT_FOUND' }) : undefined));
    renderAs(ADMIN_ME, <DealsPage />);
    await screen.findByText('Fleet rollout');

    await userEvent.selectOptions(screen.getByLabelText('Stage of Fleet rollout'), 'QUALIFIED');

    expect(await screen.findByRole('alert')).toHaveTextContent('That deal does not exist.');
    expect(screen.getByLabelText('Stage of Fleet rollout')).toHaveValue('NEGOTIATION');
  });

  it('shows Delete only to an ADMIN', async () => {
    api();
    const { unmount } = renderAs(USER_ME, <DealsPage />);
    await screen.findByText('Fleet rollout');
    expect(screen.queryByRole('button', { name: /^Delete / })).not.toBeInTheDocument();
    unmount();

    renderAs(ADMIN_ME, <DealsPage />);
    await screen.findByText('Fleet rollout');
    expect(screen.getAllByRole('button', { name: /^Delete / })).toHaveLength(2);
  });

  it('names the contact the list is filtered to, and can remove that filter', async () => {
    const calls = api();
    renderAs(ADMIN_ME, (
      <Routes>
        <Route path="/deals" element={<DealsPage />} />
      </Routes>
    ), '/deals?contactId=1');

    expect(await screen.findByText(/Contact: Maya Okafor/)).toBeInTheDocument();
    expect(calls.find((call) => call.url.startsWith('/api/deals?'))?.url).toBe('/api/deals?size=10&page=0&contactId=1');

    await userEvent.click(screen.getByRole('button', { name: 'Remove the contact filter' }));
    await waitFor(() => expect(calls.at(-1)?.url).toBe('/api/deals?size=10&page=0'));
  });
});
