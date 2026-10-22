import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { fetchMe, login } from '../api/crm.ts';
import type { User } from '../types.ts';
import { clearSession, getStoredUser, getToken, saveSession, setUnauthorizedHandler } from './session.ts';

export interface AuthState {
  user: User | null;
  isAdmin: boolean;
  /** True until a stored session has been checked with the server. */
  restoring: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => void;
}

const signedOut: AuthState = {
  user: null,
  isAdmin: false,
  restoring: false,
  signIn: () => Promise.reject(new Error('No AuthProvider')),
  signOut: () => undefined,
};

/** Exported so tests can render a page as a given user (see src/test/auth.tsx). */
export const AuthContext = createContext<AuthState>(signedOut);

/** Who is signed in. Outside an AuthProvider (in a component test, say) nobody is. */
export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => (getToken() ? getStoredUser() : null));
  const [restoring, setRestoring] = useState(() => Boolean(getToken()));

  // A stored token may have expired while the tab was closed: ask the server who it belongs to.
  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Any 401 from any call ends the session and comes back here once signed in again.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      const here = window.location.pathname + window.location.search;
      navigate(`/login?expired=1&returnTo=${encodeURIComponent(here)}`, { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await login(email, password);
    saveSession(response.token, response.user);
    setUser(response.user);
    return response.user;
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo<AuthState>(
    () => ({ user, isAdmin: user?.role === 'ADMIN', restoring, signIn, signOut }),
    [user, restoring, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Sends anyone who is not signed in to the sign-in page, remembering where they were going. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, restoring } = useAuth();
  const location = useLocation();
  if (restoring) {
    return (
      <div className="d-flex align-items-center gap-2 text-secondary p-4" role="status">
        <div className="spinner-border spinner-border-sm" aria-hidden="true" />
        Checking your session…
      </div>
    );
  }
  if (!user) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }
  return <>{children}</>;
}

/**
 * Admin-only screens. A convenience for the user, not the protection: the API refuses the
 * same actions with 403 whatever the browser shows.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/forbidden" replace />;
  return <>{children}</>;
}
