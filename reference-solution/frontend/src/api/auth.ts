import type { AuthMode, AuthenticatedVia, CsrfToken, LoginResponse, Me, User } from '../types.ts';
import { json, request } from './http.ts';
import { setToken } from './tokenStore.ts';

export async function login(mode: AuthMode, username: string, password: string): Promise<LoginResponse> {
  // A fresh sign-in replaces whatever the browser held before.
  setToken(null);
  const response = await request<LoginResponse>(
    '/auth/login',
    json('POST', { username, password, mode }),
    { expectSignedIn: false, csrf: false },
  );
  if (response.accessToken) {
    setToken(response.accessToken);
  }
  return response;
}

export function register(username: string, email: string, password: string): Promise<User> {
  return request<User>('/auth/register', json('POST', { username, email, password }), {
    expectSignedIn: false,
    csrf: false,
  });
}

/** Who the server thinks I am, or a 401 if nobody. Used at start-up, so a 401 is not "session ended". */
export function fetchMe(): Promise<Me> {
  return request<Me>('/auth/me', {}, { expectSignedIn: false });
}

/**
 * Ends the credential this request uses. Cookie and session credentials are sent by the browser on its
 * own, so the server asks for an anti-forgery token before it will sign them out; a Bearer token cannot
 * be forged by another site and needs none.
 */
export async function logout(via: AuthenticatedVia): Promise<void> {
  try {
    if (via === 'Bearer') {
      await request<void>('/auth/logout', { method: 'POST' }, { csrf: false });
    } else {
      const csrf = await request<CsrfToken>('/auth/csrf');
      await request<void>('/auth/logout', { method: 'POST', headers: { [csrf.headerName]: csrf.token } }, { csrf: false });
    }
  } finally {
    setToken(null);
  }
}
