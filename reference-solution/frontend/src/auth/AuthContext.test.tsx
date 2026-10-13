import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from '../api/http.ts';
import { setToken } from '../api/tokenStore.ts';
import { AuthProvider, useAuth } from './AuthContext.tsx';

const body = (status: number, value: unknown) =>
  new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

const ME = (via: 'Bearer' | 'Cookies' | 'Session') => ({ id: 2, username: 'demo', role: 'USER', authenticatedVia: via });

/** A probe that shows the auth state and offers buttons for the actions under test. */
function Probe() {
  const { status, me, notice, signIn, signOut } = useAuth();
  return (
    <div>
      <p data-testid="state">{status}</p>
      <p data-testid="who">{me ? `${me.username}/${me.authenticatedVia}` : 'nobody'}</p>
      <p data-testid="notice">{notice}</p>
      <button onClick={() => void signIn('Cookie', 'demo', 'secret-password')}>sign in</button>
      <button onClick={() => void signOut()}>sign out</button>
      <button onClick={() => void request('/users').catch(() => undefined)}>call a protected endpoint</button>
    </div>
  );
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  setToken(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  setToken(null);
});

const urls = () => fetchMock.mock.calls.map((call) => `${call[1]?.method ?? 'GET'} ${call[0]}`);

describe('AuthProvider', () => {
  it('starts signed in when the server already knows who I am (a cookie or session survived a reload)', async () => {
    fetchMock.mockResolvedValue(body(200, ME('Session')));

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('signedIn'));
    expect(screen.getByTestId('who')).toHaveTextContent('demo/Session');
  });

  it('starts signed out, with no notice, when the server answers 401 at start-up', async () => {
    fetchMock.mockResolvedValue(body(401, { status: 401 }));

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('signedOut'));
    expect(screen.getByTestId('notice')).toBeEmptyDOMElement();
  });

  it('signs in, then asks the server who I am', async () => {
    fetchMock
      .mockResolvedValueOnce(body(401, { status: 401 })) // start-up check
      .mockResolvedValueOnce(body(200, { user: { id: 2 }, mode: 'Cookie', accessToken: null, expiresAt: null }))
      .mockResolvedValueOnce(body(200, ME('Cookies')));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('signedOut'));

    await userEvent.click(screen.getByRole('button', { name: 'sign in' }));

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('signedIn'));
    expect(screen.getByTestId('who')).toHaveTextContent('demo/Cookies');
    expect(urls()).toEqual(['GET /api/auth/me', 'POST /api/auth/login', 'GET /api/auth/me']);
  });

  it('goes back to signed out with an explanation when a later call comes back 401', async () => {
    fetchMock
      .mockResolvedValueOnce(body(200, ME('Cookies')))
      .mockResolvedValueOnce(body(401, { status: 401 }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('signedIn'));

    await userEvent.click(screen.getByRole('button', { name: 'call a protected endpoint' }));

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('signedOut'));
    expect(screen.getByTestId('notice')).toHaveTextContent(/session ended/i);
  });

  it('signs out a cookie sign-in by fetching a CSRF token first and sending it', async () => {
    fetchMock
      .mockResolvedValueOnce(body(200, ME('Cookies')))
      .mockResolvedValueOnce(body(200, { headerName: 'X-CSRF-TOKEN', token: 'csrf-123' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('signedIn'));

    await userEvent.click(screen.getByRole('button', { name: 'sign out' }));

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('signedOut'));
    expect(urls()).toEqual(['GET /api/auth/me', 'GET /api/auth/csrf', 'POST /api/auth/logout']);
    const logoutHeaders = new Headers(fetchMock.mock.calls[2][1].headers);
    expect(logoutHeaders.get('X-CSRF-TOKEN')).toBe('csrf-123');
  });

  it('signs out a JWT sign-in without any CSRF token, and forgets the stored token', async () => {
    setToken('jwt-value');
    fetchMock
      .mockResolvedValueOnce(body(200, ME('Bearer')))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('signedIn'));

    await userEvent.click(screen.getByRole('button', { name: 'sign out' }));

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('signedOut'));
    expect(urls()).toEqual(['GET /api/auth/me', 'POST /api/auth/logout']);
    expect(sessionStorage.getItem('nimbus.jwt')).toBeNull();
  });

  it('still ends the local sign-in when the server call fails', async () => {
    fetchMock
      .mockResolvedValueOnce(body(200, ME('Bearer')))
      .mockResolvedValueOnce(body(500, { status: 500 }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('signedIn'));

    await userEvent.click(screen.getByRole('button', { name: 'sign out' }));

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('signedOut'));
  });
});
