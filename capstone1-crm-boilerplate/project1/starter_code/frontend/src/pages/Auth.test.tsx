import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as crm from '../api/crm.ts';
import { AuthProvider, RequireAdmin, RequireAuth } from '../auth/AuthContext.tsx';
import { ADMIN, REP, SignedInAs } from '../test/auth.tsx';
import type { User } from '../types.ts';
import DealDetailPage from './DealDetailPage.tsx';
import DealsPage from './DealsPage.tsx';
import LoginPage from './LoginPage.tsx';

vi.mock('../api/crm.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/crm.ts')>()),
  login: vi.fn(),
  fetchMe: vi.fn(),
  fetchDeals: vi.fn(),
  fetchDeal: vi.fn(),
  fetchDealHistory: vi.fn(),
}));

const deal = {
  dealRef: 'D-00001',
  title: 'Compliance reporting pilot',
  value: 18500,
  currency: 'GBP',
  expectedCloseDate: '2026-11-30',
  stage: 'PROSPECTING' as const,
  closedDate: null,
  lostReason: null,
  accountRef: 'A-0015',
  accountName: 'Ilex Pharmaceuticals',
  contactRef: 'C-00002',
  contactName: 'Béatrice Ellingham',
  contactStatus: 'PROSPECT' as const,
  ownerRef: 'U-0002',
  ownerName: 'Aisha Khan',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function renderLogin(path = '/login') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/deals" element={<p>Deals screen</p>} />
          <Route path="/" element={<p>Dashboard screen</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function renderAs(user: User, path: string, element: React.ReactNode, routePath: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SignedInAs user={user}>
        <Routes>
          <Route path={routePath} element={element} />
          <Route path="/forbidden" element={<p>Forbidden screen</p>} />
        </Routes>
      </SignedInAs>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('AUTH-01 sign in', () => {
  it('AUTH_01_WrongPasswordSaysSoAndKeepsTheEmail', async () => {
    vi.mocked(crm.login).mockRejectedValue(
      new crm.ApiError(401, { error: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' }, 'x'),
    );
    renderLogin();
    await userEvent.type(screen.getByLabelText('Email'), 'admin@nimbus.test');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
    expect(screen.getByLabelText('Email')).toHaveValue('admin@nimbus.test');
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });

  it('AUTH_01_EmptyFieldsAreFlaggedWithoutCallingTheApi', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(crm.login).not.toHaveBeenCalled();
  });

  it('AUTH_01_SuccessGoesBackToWhereTheUserWasHeadingAndStoresTheSession', async () => {
    vi.mocked(crm.login).mockResolvedValue({ token: 'jwt-token', expiresAt: '2099-01-01T00:00:00Z', user: REP });
    renderLogin('/login?returnTo=%2Fdeals');
    await userEvent.click(screen.getByRole('button', { name: 'Aisha (Rep)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Deals screen')).toBeInTheDocument();
    expect(sessionStorage.getItem('nimbus.token')).toBe('jwt-token');
  });

  it('AUTH_01_AReturnToOnAnotherSiteIsIgnored', async () => {
    vi.mocked(crm.login).mockResolvedValue({ token: 't', expiresAt: '2099-01-01T00:00:00Z', user: REP });
    renderLogin('/login?returnTo=%2F%2Fevil.example');
    await userEvent.click(screen.getByRole('button', { name: 'Aisha (Rep)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Dashboard screen')).toBeInTheDocument();
  });

  it('AUTH_02_AnExpiredSessionExplainsWhyYouAreHere', () => {
    renderLogin('/login?expired=1');
    expect(screen.getByRole('status')).toHaveTextContent('Your session has ended');
  });

  it('AUTH_02_SignedOutVisitorsAreSentToSignIn', () => {
    render(
      <MemoryRouter initialEntries={['/deals']}>
        <Routes>
          <Route path="/deals" element={<RequireAuth><p>Deals screen</p></RequireAuth>} />
          <Route path="/login" element={<p>Sign-in screen</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Sign-in screen')).toBeInTheDocument();
  });
});

describe('AUTH-03 role-aware screens', () => {
  beforeEach(() => {
    vi.mocked(crm.fetchDeals).mockResolvedValue({ items: [deal], page: 0, size: 20, totalElements: 1, totalPages: 1 });
    vi.mocked(crm.fetchDeal).mockResolvedValue(deal);
    vi.mocked(crm.fetchDealHistory).mockResolvedValue([]);
  });

  it('AUTH_03_ARepSeesMyDealsWithNoNewDealButton', async () => {
    renderAs(REP, '/deals', <DealsPage />, '/deals');
    expect(await screen.findByRole('heading', { name: 'My deals' })).toBeInTheDocument();
    expect(await screen.findByText('Compliance reporting pilot')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New deal/ })).not.toBeInTheDocument();
  });

  it('AUTH_03_AnAdminSeesEveryDealAndCanCreateOne', async () => {
    renderAs(ADMIN, '/deals', <DealsPage />, '/deals');
    expect(await screen.findByRole('heading', { name: 'Deals' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New deal/ })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: 'Owner' })).toBeInTheDocument();
  });

  it('AUTH_03_ARepCanMoveButNotEditOrDeleteTheirDeal', async () => {
    renderAs(REP, '/deals/D-00001', <DealDetailPage />, '/deals/:dealRef');
    expect(await screen.findByRole('heading', { name: 'Compliance reporting pilot' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Move stage' })).toBeInTheDocument();
  });

  it('AUTH_03_AnAdminCanEditAndDeleteAProspectingDeal', async () => {
    renderAs(ADMIN, '/deals/D-00001', <DealDetailPage />, '/deals/:dealRef');
    expect(await screen.findByRole('link', { name: /Edit/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument();
    expect(screen.getByText('Aisha Khan')).toBeInTheDocument();
  });

  it('AUTH_03_ARepTypingAnAdminUrlLandsOnForbidden', () => {
    renderAs(REP, '/deals/new', <RequireAdmin><p>Deal form</p></RequireAdmin>, '/deals/new');
    expect(screen.getByText('Forbidden screen')).toBeInTheDocument();
    expect(screen.queryByText('Deal form')).not.toBeInTheDocument();
  });
});
