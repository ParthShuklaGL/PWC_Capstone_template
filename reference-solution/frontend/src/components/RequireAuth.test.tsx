import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../auth/AuthContext.tsx';
import type { Me } from '../types.ts';
import { RequireAdmin, RequireAuth } from './RequireAuth.tsx';

const user: Me = { id: 2, username: 'demo', role: 'USER', authenticatedVia: 'Bearer' };
const admin: Me = { id: 1, username: 'admin', role: 'ADMIN', authenticatedVia: 'Bearer' };

function renderAt(path: string, auth: Pick<AuthContextValue, 'status' | 'me'>) {
  const value: AuthContextValue = {
    ...auth,
    notice: '',
    signIn: vi.fn(),
    register: vi.fn(),
    signOut: vi.fn(),
  };
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/sign-in" element={<p>SIGN IN SCREEN</p>} />
          <Route element={<RequireAuth />}>
            <Route index element={<p>HOME</p>} />
            <Route element={<RequireAdmin />}>
              <Route path="users" element={<p>USERS SCREEN</p>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('RequireAuth', () => {
  it('sends a signed-out visitor to the sign-in screen', () => {
    renderAt('/', { status: 'signedOut', me: null });

    expect(screen.getByText('SIGN IN SCREEN')).toBeInTheDocument();
    expect(screen.queryByText('HOME')).not.toBeInTheDocument();
  });

  it('waits while it is still finding out whether anyone is signed in', () => {
    renderAt('/', { status: 'loading', me: null });

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('SIGN IN SCREEN')).not.toBeInTheDocument();
  });

  it('shows the page to a signed-in user', () => {
    renderAt('/', { status: 'signedIn', me: user });

    expect(screen.getByText('HOME')).toBeInTheDocument();
  });
});

describe('RequireAdmin', () => {
  it('shows an admin-only page to an admin', () => {
    renderAt('/users', { status: 'signedIn', me: admin });

    expect(screen.getByText('USERS SCREEN')).toBeInTheDocument();
  });

  it('shows a "no access" page, not the screen, to a plain user', () => {
    renderAt('/users', { status: 'signedIn', me: user });

    expect(screen.getByRole('heading', { name: /do not have access/i })).toBeInTheDocument();
    expect(screen.queryByText('USERS SCREEN')).not.toBeInTheDocument();
  });

  it('sends a signed-out visitor to sign-in rather than showing "no access"', () => {
    renderAt('/users', { status: 'signedOut', me: null });

    expect(screen.getByText('SIGN IN SCREEN')).toBeInTheDocument();
  });
});
