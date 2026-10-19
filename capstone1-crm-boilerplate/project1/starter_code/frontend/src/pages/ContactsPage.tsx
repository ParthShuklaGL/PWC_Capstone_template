import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { fetchContacts, searchContacts } from '../api/crm.ts';
import Pagination from '../components/Pagination.tsx';
import StatusFilter from '../components/StatusFilter.tsx';
import { PAGE_SIZE, formatStatus, type StatusFilter as Filter } from '../constants.ts';
import type { ContactSummary, LoadStatus } from '../types.ts';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    const load = submittedQuery
      ? searchContacts(submittedQuery).then((results) => ({
          items: results,
          totalPages: 1,
          totalElements: results.length,
        }))
      : fetchContacts(page, PAGE_SIZE, filter).then((response) => ({
          items: response.items,
          totalPages: response.totalPages,
          totalElements: response.totalElements,
        }));

    load
      .then((result) => {
        if (cancelled) {
          return;
        }
        setContacts(result.items);
        setTotalPages(result.totalPages);
        setTotalElements(result.totalElements);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return;
        }
        setError(caught instanceof Error ? caught.message : 'Could not load contacts');
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [page, filter, submittedQuery]);

  function onFilterChange(next: Filter) {
    setFilter(next);
    setPage(0);
  }

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setSubmittedQuery(query.trim());
    setPage(0);
  }

  return (
    <section>
      <h1>Contacts</h1>

      <div className="toolbar">
        <form className="search" onSubmit={onSearch} role="search">
          <label className="search__label" htmlFor="contact-search">
            Search contacts
          </label>
          <input
            id="contact-search"
            className="search__input"
            type="search"
            placeholder="Name or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" className="search__button">
            Search
          </button>
          {submittedQuery && (
            <button
              type="button"
              className="search__button search__button--clear"
              onClick={() => {
                setQuery('');
                setSubmittedQuery('');
              }}
            >
              Clear
            </button>
          )}
        </form>

        {!submittedQuery && <StatusFilter selected={filter} onSelect={onFilterChange} />}
      </div>

      {status === 'loading' && <p className="notice">Loading contacts…</p>}

      {status === 'error' && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}

      {status === 'ready' && contacts.length === 0 && (
        <p className="notice">No contacts match that.</p>
      )}

      {status === 'ready' && contacts.length > 0 && (
        <>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Account</th>
                <th scope="col">Job title</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.contactRef}>
                  <td>
                    <Link to={`/contacts/${contact.contactRef}`}>
                      {contact.lastName}, {contact.firstName}
                    </Link>
                  </td>
                  <td>{contact.accountName ?? '—'}</td>
                  <td>{contact.jobTitle ?? '—'}</td>
                  <td>
                    <span className={`badge badge--${contact.status.toLowerCase()}`}>
                      {formatStatus(contact.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!submittedQuery && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalElements={totalElements}
              onChange={setPage}
            />
          )}
        </>
      )}
    </section>
  );
}
