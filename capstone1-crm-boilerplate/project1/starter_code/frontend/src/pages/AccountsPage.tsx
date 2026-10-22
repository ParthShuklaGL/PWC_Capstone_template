import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAccounts } from '../api/crm.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import type { Account, LoadStatus } from '../types.ts';

export default function AccountsPage() {
  const { isAdmin } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filter, setFilter] = useState('');
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchAccounts()
      .then((loaded) => {
        if (cancelled) return;
        setAccounts(loaded);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : 'Could not load accounts');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Thirty accounts arrive in one response, so filtering them here is honest: it is the whole list.
  const shown = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return accounts;
    return accounts.filter((a) =>
      [a.name, a.industry, a.country].some((v) => v?.toLowerCase().includes(term)),
    );
  }, [accounts, filter]);

  return (
    <section>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="mb-0">Accounts</h1>
        {isAdmin && (
          <Link to="/accounts/new" className="btn btn-primary">
            <i className="bi bi-plus-lg me-1" aria-hidden="true" />
            New account
          </Link>
        )}
      </div>

      <div className="mb-3" style={{ maxWidth: '22rem' }}>
        <label htmlFor="account-filter" className="visually-hidden">
          Filter accounts
        </label>
        <input
          id="account-filter"
          type="search"
          className="form-control"
          placeholder="Filter by name, industry or country"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </div>

      {status === 'loading' && (
        <div className="d-flex align-items-center gap-2 text-secondary" role="status">
          <div className="spinner-border spinner-border-sm" aria-hidden="true" />
          Loading accounts…
        </div>
      )}
      {status === 'error' && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {status === 'ready' && shown.length === 0 && (
        <div className="alert alert-light border">No accounts match that.</div>
      )}

      {status === 'ready' && shown.length > 0 && (
        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Account</th>
                  <th scope="col">Industry</th>
                  <th scope="col">Country</th>
                  <th scope="col">Website</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((account) => (
                  <tr key={account.accountRef}>
                    <td>
                      <Link to={`/accounts/${account.accountRef}`} className="fw-semibold">
                        {account.name}
                      </Link>
                      <div className="small text-secondary">{account.accountRef}</div>
                    </td>
                    <td>{account.industry ?? '—'}</td>
                    <td>{account.country ?? '—'}</td>
                    <td>
                      {account.website ? (
                        <a href={account.website} target="_blank" rel="noreferrer noopener">
                          {account.website.replace(/^https?:\/\/(www\.)?/, '')}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {status === 'ready' && (
        <p className="small text-secondary mt-2">
          {shown.length} of {accounts.length} accounts
        </p>
      )}
    </section>
  );
}
