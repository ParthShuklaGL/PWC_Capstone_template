import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '../api/auth.ts';
import { setUnauthorizedHandler } from '../api/http.ts';
import { setToken } from '../api/tokenStore.ts';
import type { AuthMode, Me } from '../types.ts';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface AuthContextValue {
  status: AuthStatus;
  me: Me | null;
  /** A message for the sign-in screen, such as "Your session ended." Empty when there is nothing to say. */
  notice: string;
  signIn: (mode: AuthMode, username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, mode: AuthMode) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return value;
}

const SESSION_ENDED = 'Your session ended. Please sign in again.';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const [notice, setNotice] = useState('');

  // Pick up a sign-in that survived a reload: a session or cookie, or a JWT kept for this tab.
  useEffect(() => {
    let cancelled = false;
    authApi
      .fetchMe()
      .then((found) => {
        if (!cancelled) {
          setMe(found);
          setStatus('signedIn');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('signedOut');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Any later call that comes back 401 means the credential ended (expired, signed out elsewhere,
  // user deactivated): go back to sign-in and say why.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setMe(null);
      setStatus('signedOut');
      setNotice(SESSION_ENDED);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const signIn = useCallback(async (mode: AuthMode, username: string, password: string) => {
    await authApi.login(mode, username, password);
    setMe(await authApi.fetchMe());
    setNotice('');
    setStatus('signedIn');
  }, []);

  const register = useCallback(
    async (username: string, email: string, password: string, mode: AuthMode) => {
      await authApi.register(username, email, password);
      await signIn(mode, username, password);
    },
    [signIn],
  );

  const signOut = useCallback(async () => {
    const via = me?.authenticatedVia ?? 'Bearer';
    try {
      await authApi.logout(via);
    } catch {
      // The local sign-in is cleared below either way; a failed call usually means the credential
      // had already ended.
    } finally {
      setMe(null);
      setNotice('');
      setStatus('signedOut');
    }
  }, [me]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, me, notice, signIn, register, signOut }),
    [status, me, notice, signIn, register, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
