import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.tsx';
import NotAllowedPage from '../pages/NotAllowedPage.tsx';

/** Signed-out visitors are sent to the sign-in screen, and come back to where they were after signing in. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <p className="notice">Loading…</p>;
  }
  if (status === 'signedOut') {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/**
 * Hides admin-only screens from everyone else. This is a convenience, not the guard: the server answers
 * 403 to a non-admin whatever the page does.
 */
export function RequireAdmin() {
  const { me } = useAuth();
  return me?.role === 'ADMIN' ? <Outlet /> : <NotAllowedPage />;
}
