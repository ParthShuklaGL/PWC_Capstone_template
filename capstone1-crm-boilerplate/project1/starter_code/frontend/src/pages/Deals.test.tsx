import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DealsPage from './DealsPage.tsx';
import DealFormPage from './DealFormPage.tsx';
import PipelinePage from './PipelinePage.tsx';
import * as crm from '../api/crm.ts';
import type { Deal, DealSummary, PageResponse } from '../types.ts';

vi.mock('../api/crm.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/crm.ts')>();
  return {
    ...original,
    fetchDeals: vi.fn(),
    fetchDeal: vi.fn(),
    fetchDealSummary: vi.fn(),
    fetchAccounts: vi.fn(),
    fetchAccountContacts: vi.fn(),
    createDeal: vi.fn(),
    moveDealStage: vi.fn(),
  };
});

function deal(overrides: Partial<Deal> = {}): Deal {
  return {
    dealRef: 'D-00016',
    title: 'Procurement automation',
    value: 145000,
    currency: 'GBP',
    expectedCloseDate: '2026-12-01',
    stage: 'NEGOTIATION',
    closedDate: null,
    lostReason: null,
    accountRef: 'A-0008',
    accountName: 'Tuchet & Sons',
    contactRef: 'C-00001',
    contactName: 'Ada Lovelace',
    contactStatus: 'PROSPECT',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function page(items: Deal[]): PageResponse<Deal> {
  return { items, page: 0, size: 20, totalElements: items.length, totalPages: 1 };
}

const summary: DealSummary = {
  currency: 'GBP',
  openCount: 20,
  openValue: 1247500,
  stages: [
    { stage: 'PROSPECTING', count: 5, totalValue: 136750 },
    { stage: 'QUALIFIED', count: 5, totalValue: 342500 },
    { stage: 'PROPOSAL', count: 5, totalValue: 318750 },
    { stage: 'NEGOTIATION', count: 5, totalValue: 449500 },
    { stage: 'WON', count: 7, totalValue: 325000 },
    { stage: 'LOST', count: 5, totalValue: 228000 },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('DealsPage', () => {
  function renderPage(url = '/deals') {
    return render(
      <MemoryRouter initialEntries={[url]}>
        <DealsPage />
      </MemoryRouter>,
    );
  }

  it('AC_03_ListsDealsWithMoneyAndStage', async () => {
    vi.mocked(crm.fetchDeals).mockResolvedValue(page([deal()]));
    renderPage();

    expect(await screen.findByText('Procurement automation')).toBeInTheDocument();
    expect(screen.getByText('£145,000.00')).toBeInTheDocument();
    expect(screen.getByText('Negotiation', { selector: '.badge' })).toBeInTheDocument();
  });

  it('AC_03_SaysSoWhenThereAreNoDeals', async () => {
    vi.mocked(crm.fetchDeals).mockResolvedValue(page([]));
    renderPage();
    expect(await screen.findByText('No deals in this stage.')).toBeInTheDocument();
  });

  it('AC_03_ShowsAnErrorWhenDealsCannotBeLoaded', async () => {
    vi.mocked(crm.fetchDeals).mockRejectedValue(new Error('Request failed with 500'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Request failed with 500');
  });

  it('AC_03_FilteringByStageAsksTheApiForThatStage', async () => {
    vi.mocked(crm.fetchDeals).mockResolvedValue(page([deal()]));
    renderPage();
    await screen.findByText('Procurement automation');

    await userEvent.click(screen.getByRole('button', { name: 'Negotiation' }));

    await waitFor(() => expect(crm.fetchDeals).toHaveBeenLastCalledWith(0, 20, 'NEGOTIATION'));
  });
});

describe('PipelinePage', () => {
  it('AC_06_ShowsTheServersTotalsNotOnesAddedUpInTheBrowser', async () => {
    vi.mocked(crm.fetchDealSummary).mockResolvedValue(summary);
    // A deliberately different deal value: the header must still read the summary's figure.
    vi.mocked(crm.fetchDeals).mockResolvedValue(page([deal({ value: 1 })]));

    render(
      <MemoryRouter>
        <PipelinePage />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('open-total')).toHaveTextContent('£1,247,500.00');
    expect(screen.getByText('across 20 open deals')).toBeInTheDocument();
    expect(screen.getByLabelText('Prospecting column')).toHaveTextContent('£136,750.00');
  });

  it('AC_06_MovingACardRefetchesTheBoard', async () => {
    vi.mocked(crm.fetchDealSummary).mockResolvedValue(summary);
    vi.mocked(crm.fetchDeals).mockResolvedValue(page([deal({ stage: 'PROSPECTING' })]));
    vi.mocked(crm.moveDealStage).mockResolvedValue(deal({ stage: 'QUALIFIED' }));

    render(
      <MemoryRouter>
        <PipelinePage />
      </MemoryRouter>,
    );
    await screen.findByTestId('open-total');
    const callsBefore = vi.mocked(crm.fetchDealSummary).mock.calls.length;

    await userEvent.click(
      screen.getByRole('button', { name: /Move Procurement automation forward to Qualified/ }),
    );

    expect(crm.moveDealStage).toHaveBeenCalledWith('D-00016', { stage: 'QUALIFIED' });
    await waitFor(() =>
      expect(vi.mocked(crm.fetchDealSummary).mock.calls.length).toBeGreaterThan(callsBefore),
    );
  });
});

describe('DealFormPage', () => {
  function renderForm() {
    return render(
      <MemoryRouter initialEntries={['/deals/new']}>
        <Routes>
          <Route path="/deals/new" element={<DealFormPage />} />
          <Route path="/deals/:dealRef" element={<p>Saved deal page</p>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('AC_04_ShowsEachServerMessageBesideItsInput', async () => {
    vi.mocked(crm.fetchAccounts).mockResolvedValue([]);
    vi.mocked(crm.createDeal).mockRejectedValue(
      new crm.ApiError(
        400,
        {
          error: 'VALIDATION_FAILED',
          fields: { title: 'title is required', value: 'value must be greater than zero' },
        },
        'invalid',
      ),
    );
    renderForm();

    await userEvent.click(await screen.findByRole('button', { name: 'Create deal' }));

    expect(await screen.findByText('title is required')).toBeInTheDocument();
    expect(screen.getByText('value must be greater than zero')).toBeInTheDocument();
  });

  it('AC_04_OnlyOffersContactsFromTheChosenAccount', async () => {
    vi.mocked(crm.fetchAccounts).mockResolvedValue([
      { accountRef: 'A-0008', name: 'Tuchet & Sons', industry: null, country: null, website: null },
    ]);
    vi.mocked(crm.fetchAccountContacts).mockResolvedValue([
      {
        contactRef: 'C-00001',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: null,
        jobTitle: null,
        status: 'PROSPECT',
        accountRef: 'A-0008',
        accountName: 'Tuchet & Sons',
      },
    ]);
    renderForm();

    expect(await screen.findByLabelText('Contact')).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText('Account'), 'A-0008');

    expect(crm.fetchAccountContacts).toHaveBeenCalledWith('A-0008');
    expect(await screen.findByRole('option', { name: 'Ada Lovelace' })).toBeInTheDocument();
  });

  it('AC_04_SubmittingTwiceCreatesOneDeal', async () => {
    vi.mocked(crm.fetchAccounts).mockResolvedValue([]);
    vi.mocked(crm.createDeal).mockImplementation(
      () => new Promise(() => {}), // never settles: the request is still running
    );
    renderForm();

    const submit = await screen.findByRole('button', { name: 'Create deal' });
    await userEvent.click(submit);
    await userEvent.click(screen.getByRole('button', { name: 'Saving…' }));

    expect(crm.createDeal).toHaveBeenCalledTimes(1);
  });
});
