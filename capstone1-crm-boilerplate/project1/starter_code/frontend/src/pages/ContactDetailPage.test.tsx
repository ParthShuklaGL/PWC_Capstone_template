import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContactDetailPage from './ContactDetailPage.tsx';
import * as crm from '../api/crm.ts';
import type { ContactDetail, Deal } from '../types.ts';

vi.mock('../api/crm.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/crm.ts')>()),
  fetchContact: vi.fn(),
  fetchActivities: vi.fn(),
  fetchContactDeals: vi.fn(),
  createActivity: vi.fn(),
}));

const contact: ContactDetail = {
  contactRef: 'C-00001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: null,
  jobTitle: 'CTO',
  status: 'CUSTOMER',
  lastContactedAt: null,
  account: { accountRef: 'A-0008', name: 'Tuchet & Sons', industry: null, country: null, website: null },
};

const deal = {
  dealRef: 'D-00016',
  title: 'Procurement automation',
  value: 145000,
  stage: 'WON',
} as Deal;

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/contacts/C-00001']}>
      <Routes>
        <Route path="/contacts/:contactRef" element={<ContactDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ContactDetailPage (US-07)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(crm.fetchContact).mockResolvedValue(contact);
    vi.mocked(crm.fetchActivities).mockResolvedValue([]);
  });

  it('AC_07_ListsTheContactsDealsAsLinks', async () => {
    vi.mocked(crm.fetchContactDeals).mockResolvedValue([deal]);
    renderPage();

    const link = await screen.findByRole('link', { name: 'Procurement automation' });
    expect(link).toHaveAttribute('href', '/deals/D-00016');
    expect(screen.getByText('£145,000.00')).toBeInTheDocument();
  });

  it('AC_07_SaysSoWhenThereAreNoDeals', async () => {
    vi.mocked(crm.fetchContactDeals).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No deals for this contact yet.')).toBeInTheDocument();
  });

  it('AC_07_LoggedActivityAppearsAtTheTopWithoutAReload', async () => {
    vi.mocked(crm.fetchContactDeals).mockResolvedValue([]);
    vi.mocked(crm.createActivity).mockResolvedValue({
      id: 99,
      type: 'CALL',
      subject: 'Renewal check-in',
      notes: null,
      occurredAt: '2026-10-19T09:00:00Z',
    });
    renderPage();

    await userEvent.type(await screen.findByLabelText('Subject'), 'Renewal check-in');
    await userEvent.click(screen.getByRole('button', { name: 'Log activity' }));

    expect(await screen.findByText('Renewal check-in', { selector: 'p' })).toBeInTheDocument();
    expect(crm.createActivity).toHaveBeenCalledWith('C-00001', {
      type: 'CALL',
      subject: 'Renewal check-in',
      notes: undefined,
    });
  });

  it('AC_07_ShowsTheSubjectErrorBesideTheInput', async () => {
    vi.mocked(crm.fetchContactDeals).mockResolvedValue([]);
    vi.mocked(crm.createActivity).mockRejectedValue(
      new crm.ApiError(
        400,
        { error: 'VALIDATION_FAILED', fields: { subject: 'subject is required' } },
        'invalid',
      ),
    );
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Log activity' }));

    expect(await screen.findByText('subject is required')).toBeInTheDocument();
  });
});
