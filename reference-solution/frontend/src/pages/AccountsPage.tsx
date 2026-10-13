import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { accounts, CRM_PAGE_SIZE } from '../api/crm.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import AccountForm from '../components/AccountForm.tsx';
import Banner from '../components/Banner.tsx';
import ConfirmDialog from '../components/ConfirmDialog.tsx';
import ListState from '../components/ListState.tsx';
import Pager from '../components/Pager.tsx';
import SearchBar from '../components/SearchBar.tsx';
import type { Account } from '../types.ts';
import { useDeleteFlow } from '../useDeleteFlow.ts';
import { useClampPage, useListParams } from '../useListParams.ts';
import { useLoad } from '../useLoad.ts';

const FILTERS = ['search'] as const;

/** Accounts: search, page, create, edit, and (ADMIN only) delete. Each row links to that account's contacts. */
export default function AccountsPage() {
  const { me } = useAuth();
  const isAdmin = me?.role === 'ADMIN';
  const { values, page, setFilter, setPage } = useListParams(FILTERS);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<Account | 'new' | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(() => accounts.list({ page, search: values.search }), [page, values.search, version]);
  const { status, data, error } = useLoad(load);
  useClampPage(data, page, CRM_PAGE_SIZE, setPage);

  const reload = () => setVersion((current) => current + 1);
  const removal = useDeleteFlow<Account>(accounts.remove, (row) => {
    setNotice(`Deleted account ${row.name}.`);
    reload();
  });

  function onSaved(saved: Account) {
    setNotice(editing === 'new' ? `Created account ${saved.name}.` : `Saved account ${saved.name}.`);
    setEditing(null);
    reload();
  }

  const rows = data?.items ?? [];

  return (
    <section>
      <div className="page-head">
        <h1>Accounts</h1>
        <button type="button" className="primary" onClick={() => setEditing('new')} disabled={editing !== null}>
          New account
        </button>
      </div>

      <Banner kind="ok" message={notice} onDismiss={() => setNotice('')} />
      <Banner kind="error" message={removal.error} onDismiss={removal.dismissError} />

      {editing !== null && (
        <AccountForm key={editing === 'new' ? 'new' : editing.id} account={editing === 'new' ? null : editing} onSaved={onSaved} onCancel={() => setEditing(null)} />
      )}

      <div className="filters">
        <SearchBar key={values.search} label="Search accounts" placeholder="Search by name" value={values.search} onSearch={(text) => setFilter({ search: text })} />
      </div>

      <div className="card">
        <ListState
          status={status}
          error={error}
          hasData={data !== null}
          isEmpty={rows.length === 0}
          emptyText={values.search ? 'No accounts match that search.' : 'No accounts yet. Create the first one.'}
        >
          <table className="stacked">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Industry</th>
                <th scope="col">Country</th>
                <th scope="col">Website</th>
                <th scope="col" className="num">Contacts</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((account) => (
                <tr key={account.id}>
                  <td data-label="">{account.name}</td>
                  <td data-label="Industry">{account.industry ?? '—'}</td>
                  <td data-label="Country">{account.country ?? '—'}</td>
                  <td data-label="Website">
                    {account.website ? (
                      <a href={account.website} target="_blank" rel="noopener noreferrer">
                        {account.website.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="num" data-label="Contacts">
                    <Link to={`/contacts?accountId=${account.id}`} aria-label={`${account.contactCount} contacts at ${account.name}`}>
                      {account.contactCount}
                    </Link>
                  </td>
                  <td className="row-actions" data-label="">
                    <button type="button" onClick={() => setEditing(account)} aria-label={`Edit ${account.name}`}>
                      Edit
                    </button>
                    {isAdmin && (
                      <button type="button" className="danger" onClick={() => removal.ask(account)} aria-label={`Delete ${account.name}`}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ListState>
      </div>

      {data && data.total > 0 && <Pager page={page} size={CRM_PAGE_SIZE} total={data.total} busy={status === 'loading'} onPage={setPage} />}

      {removal.target && (
        <ConfirmDialog title="Delete this account?" confirmLabel="Delete account" busy={removal.busy} onConfirm={() => void removal.confirm()} onCancel={removal.cancel}>
          <p>
            <strong>{removal.target.name}</strong> will be removed for good. The server refuses if it still has contacts.
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
