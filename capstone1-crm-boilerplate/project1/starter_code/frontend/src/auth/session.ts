import type { User } from '../types.ts';

/**
 * Where the signed-in session lives between page loads.
 *
 * sessionStorage, not localStorage: it survives a refresh but is gone when the tab closes,
 * and it is not shared with other tabs. Any script on the page can still read it, which is
 * why the app never renders untrusted HTML.
 */

const TOKEN_KEY = 'nimbus.token';
const USER_KEY = 'nimbus.user';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: User): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

type Listener = () => void;
let onUnauthorized: Listener | null = null;

/** The AuthProvider registers what to do when the API says the session is over. */
export function setUnauthorizedHandler(listener: Listener | null): void {
  onUnauthorized = listener;
}

export function notifyUnauthorized(): void {
  clearSession();
  onUnauthorized?.();
}
