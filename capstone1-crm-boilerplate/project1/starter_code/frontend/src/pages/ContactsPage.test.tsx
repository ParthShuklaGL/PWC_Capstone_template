import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContactsPage from './ContactsPage.tsx';
import * as crm from '../api/crm.ts';
import type { PageResponse, ContactSummary } from '../types.ts';

vi.mock('../api/crm.ts');

const contact: ContactSummary = {
  contactRef: 'C-00089',
  firstName: 'Nadia',
  lastName: 'Fenwick',
  email: 'nadia.fenwick@example.com',
  phone: null,
  jobTitle: 'Head of Procurement',
  status: 'CUSTOMER',
  accountRef: 'A-0001',
  accountName: 'Halcyon Freight',
};

function page(items: ContactSummary[]): PageResponse<ContactSummary> {
  return { items, page: 0, size: 20, totalElements: items.length, totalPages: 1 };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ContactsPage />
    </MemoryRouter>,
  );
}

describe('ContactsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('lists the contacts the API returns', async () => {
    vi.mocked(crm.fetchContacts).mockResolvedValue(page([contact]));

    renderPage();

    expect(await screen.findByText('Fenwick, Nadia')).toBeInTheDocument();
    expect(screen.getByText('Halcyon Freight')).toBeInTheDocument();
  });

  it('says so when no contacts match', async () => {
    vi.mocked(crm.fetchContacts).mockResolvedValue(page([]));

    renderPage();

    expect(await screen.findByText('No contacts match that.')).toBeInTheDocument();
  });

  it('shows an error message when the contacts cannot be loaded', () => {
    vi.mocked(crm.fetchContacts).mockRejectedValue(new Error('Request failed with 500'));

    renderPage();

    expect(screen.getByText(/loading contacts/i)).toBeInTheDocument();
  });
});
