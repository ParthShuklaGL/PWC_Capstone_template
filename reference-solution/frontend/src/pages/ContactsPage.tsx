import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { contacts, CRM_PAGE_SIZE, fetchAllAccounts } from '../api/crm.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import Banner from '../components/Banner.tsx';
import ConfirmDialog from '../components/ConfirmDialog.tsx';
import ContactForm from '../components/ContactForm.tsx';
import ListState from '../components/ListState.tsx';
import Pager from '../components/Pager.tsx';
import SearchBar from '../components/SearchBar.tsx';
import { titleCase } from '../format.ts';
import { CONTACT_STATUSES, type Contact, type ContactStatus } from '../types.ts';
import { useDeleteFlow } from '../useDeleteFlow.ts';
import { useClampPage, useListParams } from '../useListParams.ts';
import { useLoad } from '../useLoad.ts';

const FILTERS = ['search', 'accountId', 'status'] as const;

/** Contacts: search, filter by account and status, create, edit, and (ADMIN only) delete. */
export default function ContactsPage() {
  const { me } = useAuth();
  const isAdmin = me?.role === 'ADMIN';
  const { values, page, setFilter, setPage } = useListParams(FILTERS);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<Contact | 'new' | null>(null);
  const [notice, setNotice] = useState('');

  const accountList = useLoad(fetchAllAccounts);
  const load = useCallback(
    () => contacts.list({ page, search: values.search, accountId: values.accountId, status: values.status as ContactStatus | '' }),
    [page, values.search, values.accountId, values.status, version],
  );
  const { status, data, error } = useLoad(load);
  useClampPage(data, page, CRM_PAGE_SIZE, setPage);

  const reload = () => setVersion((current) => current + 1);
  const removal = useDeleteFlow<Contact>(contacts.remove, (row) => {
    setNotice(`Deleted contact ${row.firstName} ${row.lastName}.`);
    reload();
  });

  function onSaved(saved: Contact) {
    const name = `${saved.firstName} ${saved.lastName}`;
    setNotice(editing === 'new' ? `Created contact ${name}.` : `Saved contact ${name}.`);
    setEditing(null);
    reload();
  }

  const rows = data?.items ?? [];
  const filtered = Boolean(values.search || values.accountId || values.status);

  return (
    <section>
      <div className="page-head">
        <h1>Contacts</h1>
        <button type="button" className="primary" onClick={() => setEditing('new')} disabled={editing !== null}>
          New contact
        </button>
      </div>

      <Banner kind="ok" message={notice} onDismiss={() => setNotice('')} />
      <Banner kind="error" message={removal.error} onDismiss={removal.dismissError} />

      {editing !== null && (
        <ContactForm
          key={editing === 'new' ? 'new' : editing.id}
          contact={editing === 'new' ? null : editing}
          defaultAccountId={values.accountId ? Number(values.accountId) : undefined}
          onSaved={onSaved}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="filters">
        <SearchBar key={values.search} label="Search contacts" placeholder="Name or email" value={values.search} onSearch={(text) => setFilter({ search: text })} />
        <div className="field field--inline">
          <label htmlFor="filter-account">Account</label>
          <select id="filter-account" value={values.accountId} onChange={(event) => setFilter({ accountId: event.target.value })}>
            <option value="">All accounts</option>
            {(accountList.data ?? []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field field--inline">
          <label htmlFor="filter-status">Status</label>
          <select id="filter-status" value={values.status} onChange={(event) => setFilter({ status: event.target.value })}>
            <option value="">All statuses</option>
            {CONTACT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </select>
        </div>
        {filtered && (
          <button type="button" className="link" onClick={() => setFilter({ search: '', accountId: '', status: '' })}>
            Clear filters
          </button>
        )}
      </div>

      <div className="card">
        <ListState
          status={status}
          error={error}
          hasData={data !== null}
          isEmpty={rows.length === 0}
          emptyText={filtered ? 'No contacts match these filters.' : 'No contacts yet. Create the first one.'}
        >
          <table className="stacked">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Job title</th>
                <th scope="col">Account</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((contact) => {
                const name = `${contact.firstName} ${contact.lastName}`;
                return (
                  <tr key={contact.id}>
                    <td data-label="">{name}</td>
                    <td data-label="Email">{contact.email}</td>
                    <td data-label="Job title">{contact.jobTitle ?? '—'}</td>
                    <td data-label="Account">{contact.accountName}</td>
                    <td data-label="Status">
                      <span className={`badge badge--${contact.status.toLowerCase()}`}>{titleCase(contact.status)}</span>
                    </td>
                    <td className="row-actions" data-label="">
                      <Link to={`/deals?contactId=${contact.id}`} aria-label={`Deals of ${name}`}>
                        Deals
                      </Link>
                      <button type="button" onClick={() => setEditing(contact)} aria-label={`Edit ${name}`}>
                        Edit
                      </button>
                      {isAdmin && (
                        <button type="button" className="danger" onClick={() => removal.ask(contact)} aria-label={`Delete ${name}`}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ListState>
      </div>

      {data && data.total > 0 && <Pager page={page} size={CRM_PAGE_SIZE} total={data.total} busy={status === 'loading'} onPage={setPage} />}

      {removal.target && (
        <ConfirmDialog title="Delete this contact?" confirmLabel="Delete contact" busy={removal.busy} onConfirm={() => void removal.confirm()} onCancel={removal.cancel}>
          <p>
            <strong>
              {removal.target.firstName} {removal.target.lastName}
            </strong>{' '}
            will be removed for good. The server refuses if they still have deals or logged activities.
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
