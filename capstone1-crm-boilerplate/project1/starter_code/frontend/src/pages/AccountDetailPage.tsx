import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, fetchAccount, fetchAccountContacts } from '../api/crm.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { formatStatus } from '../constants.ts';
import type { Account, ContactSummary, LoadStatus } from '../types.ts';

export default function AccountDetailPage() {
  const { accountRef } = useParams<{ accountRef: string }>();
  const { isAdmin } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accountRef) return;
    let cancelled = false;
    setStatus('loading');
    Promise.all([fetchAccount(accountRef), fetchAccountContacts(accountRef)])
      .then(([loadedAccount, loadedContacts]) => {
        if (cancelled) return;
        setAccount(loadedAccount);
        setContacts(loadedContacts);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(
          caught instanceof ApiError && caught.status === 404
            ? `Account ${accountRef} was not found.`
            : caught instanceof Error
              ? caught.message
              : 'Could not load this account',
        );
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [accountRef]);

  if (status === 'loading') {
    return (
      <div className="d-flex align-items-center gap-2 text-secondary" role="status">
        <div className="spinner-border spinner-border-sm" aria-hidden="true" />
        Loading…
      </div>
    );
  }

  if (status === 'error' || !account) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
        <div className="mt-2">
          <Link to="/accounts">← All accounts</Link>
        </div>
      </div>
    );
  }

  return (
    <section>
      <p className="crumb">
        <Link to="/accounts">← All accounts</Link>
      </p>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h1 className="mb-1">{account.name}</h1>
          <div className="text-secondary">
            {account.accountRef} · {account.industry ?? 'No industry'} · {account.country ?? 'No country'}
          </div>
        </div>
        {isAdmin && (
          <div className="d-flex gap-2">
            <Link to={`/accounts/${account.accountRef}/edit`} className="btn btn-outline-primary">
              <i className="bi bi-pencil me-1" aria-hidden="true" />
              Edit account
            </Link>
            <Link to={`/contacts/new?account=${account.accountRef}`} className="btn btn-primary">
              <i className="bi bi-person-plus me-1" aria-hidden="true" />
              Add contact
            </Link>
          </div>
        )}
      </div>

      {account.website && (
        <p>
          <i className="bi bi-globe me-1" aria-hidden="true" />
          <a href={account.website} target="_blank" rel="noreferrer noopener">
            {account.website}
          </a>
        </p>
      )}

      <div className="card shadow-sm">
        <div className="card-body">
          <h2 className="h5 mt-0">People at {account.name}</h2>
          {contacts.length === 0 ? (
            <p className="text-secondary mb-0">Nobody recorded at this account yet.</p>
          ) : (
            <ul className="list-group list-group-flush">
              {contacts.map((contact) => (
                <li
                  key={contact.contactRef}
                  className="list-group-item px-0 d-flex justify-content-between align-items-center"
                >
                  <span>
                    <Link to={`/contacts/${contact.contactRef}`}>
                      {contact.firstName} {contact.lastName}
                    </Link>
                    <span className="text-secondary small ms-2">{contact.jobTitle ?? ''}</span>
                  </span>
                  <span className={`badge badge--${contact.status.toLowerCase()}`}>
                    {formatStatus(contact.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
