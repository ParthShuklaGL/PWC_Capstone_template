import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ApiError,
  createDeal,
  fetchAccountContacts,
  fetchAccounts,
  fetchDeal,
  updateDeal,
} from '../api/crm.ts';
import type { Account, ContactSummary } from '../types.ts';

export default function DealFormPage() {
  const { dealRef } = useParams<{ dealRef: string }>();
  const editing = Boolean(dealRef);
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [accountRef, setAccountRef] = useState('');
  const [contactRef, setContactRef] = useState('');
  const [title, setTitle] = useState('');
  // Held as text so pennies are never lost to float rounding while typing.
  const [value, setValue] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = editing && dealRef ? fetchDeal(dealRef) : Promise.resolve(null);
    Promise.all([fetchAccounts(), load])
      .then(([loadedAccounts, deal]) => {
        if (cancelled) return;
        setAccounts(loadedAccounts);
        if (deal) {
          setTitle(deal.title);
          setValue(deal.value.toFixed(2));
          setExpectedCloseDate(deal.expectedCloseDate);
          setAccountRef(deal.accountRef);
          setContactRef(deal.contactRef);
        }
        setLoading(false);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setMessage(caught instanceof Error ? caught.message : 'Could not load the form');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editing, dealRef]);

  useEffect(() => {
    if (!accountRef || editing) return;
    let cancelled = false;
    fetchAccountContacts(accountRef)
      .then((loaded) => {
        if (!cancelled) setContacts(loaded);
      })
      .catch(() => {
        if (!cancelled) setContacts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [accountRef, editing]);

  function onAccountChange(next: string) {
    setAccountRef(next);
    setContactRef('');
    setContacts([]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    setFields({});
    const amount = value.trim() === '' ? undefined : Number(value);
    const closeDate = expectedCloseDate || undefined;
    try {
      const saved =
        editing && dealRef
          ? await updateDeal(dealRef, { title, value: amount, expectedCloseDate: closeDate })
          : await createDeal({
              title,
              value: amount,
              expectedCloseDate: closeDate,
              accountRef,
              contactRef,
            });
      navigate(`/deals/${saved.dealRef}`);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFields(caught.body?.fields ?? {});
        setMessage(
          caught.body?.fields ? 'Please fix the highlighted fields.' : caught.message,
        );
      } else {
        setMessage('Could not reach the server. Nothing was saved.');
      }
      setBusy(false);
    }
  }

  function invalid(name: string) {
    return fields[name] ? 'is-invalid' : '';
  }

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2 text-secondary" role="status">
        <div className="spinner-border spinner-border-sm" aria-hidden="true" />
        Loading…
      </div>
    );
  }

  return (
    <section>
      <p className="crumb">
        <Link to={editing ? `/deals/${dealRef}` : '/deals'}>← Back</Link>
      </p>
      <h1>{editing ? 'Edit deal' : 'New deal'}</h1>

      <form onSubmit={submit} noValidate className="card shadow-sm">
        <div className="card-body row g-3">
          {message && (
            <div className="col-12">
              <div className="alert alert-danger mb-0" role="alert">
                {message}
              </div>
            </div>
          )}

          {!editing && (
            <>
              <div className="col-md-6">
                <label htmlFor="deal-account" className="form-label">
                  Account
                </label>
                <select
                  id="deal-account"
                  className={`form-select ${invalid('accountRef')}`}
                  value={accountRef}
                  onChange={(event) => onAccountChange(event.target.value)}
                >
                  <option value="">Choose an account…</option>
                  {accounts.map((account) => (
                    <option key={account.accountRef} value={account.accountRef}>
                      {account.name}
                    </option>
                  ))}
                </select>
                {fields.accountRef && <div className="invalid-feedback">{fields.accountRef}</div>}
              </div>

              <div className="col-md-6">
                <label htmlFor="deal-contact" className="form-label">
                  Contact
                </label>
                <select
                  id="deal-contact"
                  className={`form-select ${invalid('contactRef')}`}
                  value={contactRef}
                  disabled={!accountRef}
                  onChange={(event) => setContactRef(event.target.value)}
                >
                  <option value="">
                    {accountRef ? 'Choose a contact…' : 'Choose an account first'}
                  </option>
                  {contacts.map((contact) => (
                    <option key={contact.contactRef} value={contact.contactRef}>
                      {contact.firstName} {contact.lastName}
                    </option>
                  ))}
                </select>
                {fields.contactRef && <div className="invalid-feedback">{fields.contactRef}</div>}
              </div>
            </>
          )}

          <div className="col-12">
            <label htmlFor="deal-title" className="form-label">
              Title
            </label>
            <input
              id="deal-title"
              className={`form-control ${invalid('title')}`}
              value={title}
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
            />
            {fields.title && <div className="invalid-feedback">{fields.title}</div>}
          </div>

          <div className="col-md-6">
            <label htmlFor="deal-value" className="form-label">
              Value (GBP)
            </label>
            <div className="input-group has-validation">
              <span className="input-group-text">£</span>
              <input
                id="deal-value"
                className={`form-control ${invalid('value')}`}
                inputMode="decimal"
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
              {fields.value && <div className="invalid-feedback">{fields.value}</div>}
            </div>
          </div>

          <div className="col-md-6">
            <label htmlFor="deal-close" className="form-label">
              Expected close date
            </label>
            <input
              id="deal-close"
              type="date"
              className={`form-control ${invalid('expectedCloseDate')}`}
              value={expectedCloseDate}
              onChange={(event) => setExpectedCloseDate(event.target.value)}
            />
            {fields.expectedCloseDate && (
              <div className="invalid-feedback">{fields.expectedCloseDate}</div>
            )}
          </div>
        </div>

        <div className="card-footer bg-white d-flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Create deal'}
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => navigate(editing ? `/deals/${dealRef}` : '/deals')}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
