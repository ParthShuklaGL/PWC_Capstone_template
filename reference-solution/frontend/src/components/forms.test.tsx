import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { contact, deal, mockApi, pageOf, problem, reply, account } from '../test/harness.tsx';
import { setToken } from '../api/tokenStore.ts';
import AccountForm from './AccountForm.tsx';
import ContactForm from './ContactForm.tsx';
import DealForm from './DealForm.tsx';

afterEach(() => {
  vi.unstubAllGlobals();
  setToken(null);
});

const fieldOf = (label: string) => screen.getByLabelText(label).closest('.field') as HTMLElement;

describe('AccountForm', () => {
  it('puts the server message for each PascalCase field beside its own input', async () => {
    setToken('jwt');
    mockApi((call) =>
      call.method === 'POST'
        ? problem(400, { errors: { Name: ["'Name' must not be empty."], Website: ['Website must be a full http or https address.'] } })
        : undefined,
    );
    render(<AccountForm account={null} onSaved={vi.fn()} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Name'), 'Proof Co');
    await userEvent.type(screen.getByLabelText('Website'), 'nonsense');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await within(fieldOf('Website')).findByText('Website must be a full http or https address.')).toBeInTheDocument();
    expect(within(fieldOf('Name')).getByText("'Name' must not be empty.")).toBeInTheDocument();
    expect(screen.getByLabelText('Website')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Industry')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('flags a blank name in the browser without calling the server', async () => {
    const calls = mockApi(() => undefined);
    render(<AccountForm account={null} onSaved={vi.fn()} onCancel={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(within(fieldOf('Name')).getByText('Name is required.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('shows a 404 or 409 as one message above the buttons, not against a field', async () => {
    setToken('jwt');
    mockApi(() => problem(404, { detail: 'That account does not exist.', code: 'ACCOUNT_NOT_FOUND' }));
    render(<AccountForm account={account()} onSaved={vi.fn()} onCancel={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That account does not exist.');
    expect(document.querySelector('.field-error')).toBeNull();
  });

  it('keeps a server field message that the form has no input for, instead of dropping it', async () => {
    setToken('jwt');
    mockApi(() => problem(400, { errors: { Mystery: ['Something unexpected.'] } }));
    render(<AccountForm account={account()} onSaved={vi.fn()} onCancel={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something unexpected.');
  });

  it('disables the submit button while saving, so a double click sends one request', async () => {
    setToken('jwt');
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));
    render(<AccountForm account={account()} onSaved={vi.fn()} onCancel={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    const saving = screen.getByRole('button', { name: 'Saving…' });
    expect(saving).toBeDisabled();
    await userEvent.click(saving);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('sends blank optional text as null and calls onSaved with the saved row', async () => {
    setToken('jwt');
    const saved = account({ id: 9, name: 'Proof Co' });
    const calls = mockApi(() => reply(201, saved));
    const onSaved = vi.fn();
    render(<AccountForm account={null} onSaved={onSaved} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Name'), '  Proof Co ');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(calls[0].body).toEqual({ name: 'Proof Co', industry: null, country: null, website: null });
  });
});

describe('ContactForm', () => {
  it('loads the account picker from the accounts API and maps field errors', async () => {
    setToken('jwt');
    const calls = mockApi((call) => {
      if (call.method === 'GET') return reply(200, pageOf([account(), account({ id: 2, name: 'Brightwater Foods' })]));
      return problem(400, { errors: { Email: ["'Email' is not a valid email address."], LastName: ["'Last Name' must not be empty."] } });
    });
    render(<ContactForm contact={null} onSaved={vi.fn()} onCancel={vi.fn()} />);

    await screen.findByRole('option', { name: 'Brightwater Foods' });
    expect(calls[0].url).toBe('/api/accounts?page=0&size=100');
    await userEvent.selectOptions(screen.getByLabelText('Account'), 'Brightwater Foods');
    await userEvent.type(screen.getByLabelText('First name'), 'Ada');
    await userEvent.type(screen.getByLabelText('Last name'), 'L');
    await userEvent.type(screen.getByLabelText('Email'), 'bad');
    await userEvent.click(screen.getByRole('button', { name: 'Create contact' }));

    expect(await within(fieldOf('Email')).findByText("'Email' is not a valid email address.")).toBeInTheDocument();
    expect(within(fieldOf('Last name')).getByText("'Last Name' must not be empty.")).toBeInTheDocument();
    expect(calls.at(-1)?.body).toMatchObject({ accountId: 2, status: 'PROSPECT', email: 'bad' });
  });

  it('says so, and cannot be submitted, when the accounts fail to load', async () => {
    mockApi(() => problem(500, { title: 'An unexpected error occurred.' }));
    render(<ContactForm contact={contact()} onSaved={vi.fn()} onCancel={vi.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });
});

describe('DealForm', () => {
  const contacts = pageOf([contact()]);

  it('shows the lost reason only for the Lost stage, and requires it there', async () => {
    setToken('jwt');
    const calls = mockApi((call) => (call.method === 'GET' ? reply(200, contacts) : undefined));
    render(<DealForm deal={deal()} onSaved={vi.fn()} onCancel={vi.fn()} />);
    await screen.findByRole('option', { name: /Maya Okafor/ });

    expect(screen.queryByLabelText(/Lost reason/)).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Stage'), 'LOST');
    expect(screen.getByLabelText(/Lost reason/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(within(fieldOf('Lost reason (required)')).getByText('Say why the deal was lost.')).toBeInTheDocument();
    expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(0);

    await userEvent.selectOptions(screen.getByLabelText('Stage'), 'WON');
    expect(screen.queryByLabelText(/Lost reason/)).not.toBeInTheDocument();
  });

  it('sends the reason for Lost and null for every other stage, and never a closedDate', async () => {
    setToken('jwt');
    const calls = mockApi((call) => (call.method === 'GET' ? reply(200, contacts) : reply(200, deal())));
    render(<DealForm deal={deal({ stage: 'LOST', lostReason: 'Budget cut', closedDate: '2026-10-12' })} onSaved={vi.fn()} onCancel={vi.fn()} />);
    await screen.findByRole('option', { name: /Maya Okafor/ });

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(1));
    expect(calls.find((call) => call.method === 'PUT')?.body).toEqual({
      contactId: 1, title: 'Fleet rollout', value: 48000, expectedCloseDate: '2026-10-02', stage: 'LOST', lostReason: 'Budget cut',
    });

    await userEvent.selectOptions(screen.getByLabelText('Stage'), 'QUALIFIED');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(2));
    const second = calls.filter((call) => call.method === 'PUT')[1].body as Record<string, unknown>;
    expect(second.lostReason).toBeNull();
    expect(second).not.toHaveProperty('closedDate');
  });

  it('maps the server LostReason and Value errors beside their inputs', async () => {
    setToken('jwt');
    mockApi((call) =>
      call.method === 'GET'
        ? reply(200, contacts)
        : problem(400, { errors: { LostReason: ['Say why the deal was lost.'], Value: ["'Value' must be between 0 and 1000000000000."] } }),
    );
    render(<DealForm deal={deal()} onSaved={vi.fn()} onCancel={vi.fn()} />);
    await screen.findByRole('option', { name: /Maya Okafor/ });

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await within(fieldOf('Value (GBP)')).findByText(/must be between 0/)).toBeInTheDocument();
    // The reason has no input while the stage is not Lost, so its message joins the general one rather than vanishing.
    expect(screen.getByRole('alert')).toHaveTextContent('Say why the deal was lost.');
  });
});
