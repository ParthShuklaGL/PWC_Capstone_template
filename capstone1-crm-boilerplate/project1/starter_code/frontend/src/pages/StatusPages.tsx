import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.tsx';

/** Where an admin-only URL lands for a rep. The API would refuse the action with 403 anyway. */
export function ForbiddenPage() {
  const { user } = useAuth();
  return (
    <section className="text-center py-5">
      <i className="bi bi-shield-lock display-4 text-secondary" aria-hidden="true" />
      <h1 className="mt-3">You don&rsquo;t have access to this page</h1>
      <p className="text-secondary">
        {user ? `Signed in as ${user.displayName} (${user.role === 'ADMIN' ? 'Admin' : 'Sales rep'}).` : ''} Only
        an admin can add or change accounts, contacts and deals.
      </p>
      <Link to="/" className="btn btn-primary">
        Back to the dashboard
      </Link>
    </section>
  );
}

export function NotFoundPage() {
  return (
    <section className="text-center py-5">
      <i className="bi bi-signpost-split display-4 text-secondary" aria-hidden="true" />
      <h1 className="mt-3">Page not found</h1>
      <p className="text-secondary">That address doesn&rsquo;t match anything in Nimbus CRM.</p>
      <Link to="/" className="btn btn-primary">
        Back to the dashboard
      </Link>
    </section>
  );
}
