import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, createContact, fetchAccounts, fetchContact, updateContact } from '../api/crm.ts';
import FormField from '../components/FormField.tsx';
import { STATUS_LABELS } from '../constants.ts';
import type { Account, ContactStatus } from '../types.ts';

export default function ContactFormPage() {
  const { contactRef } = useParams<{ contactRef: string }>();
  const [params] = useSearchParams();
  const editing = Boolean(contactRef);
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountRef, setAccountRef] = useState(params.get('account') ?? '');
  const [accountName, setAccountName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [status, setStatus] = useState<ContactStatus>('PROSPECT');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Only the fields this form needs are read from the contact. The response also carries a
    // finance-only creditRiskNote (planted defect PD-2): it is never put into state.
    const load = contactRef ? fetchContact(contactRef) : Promise.resolve(null);
    Promise.all([editing ? Promise.resolve([]) : fetchAccounts(), load])
      .then(([loadedAccounts, contact]) => {
        if (cancelled) return;
        setAccounts(loadedAccounts);
        if (contact) {
          setFirstName(contact.firstName);
          setLastName(contact.lastName);
          setEmail(contact.email);
          setPhone(contact.phone ?? '');
          setJobTitle(contact.jobTitle ?? '');
          setStatus(contact.status);
          setAccountName(contact.account.name);
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
  }, [contactRef, editing]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFields({});
    setMessage('');
    const common = {
      firstName,
      lastName,
      email,
      phone: phone.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
    };
    try {
      const saved = contactRef
        ? await updateContact(contactRef, { ...common, status })
        : await createContact({ ...common, accountRef });
      navigate(`/contacts/${saved.contactRef}`);
    } catch (caught) {
      if (caught instanceof ApiError && caught.body?.fields) {
        setFields(caught.body.fields);
        setMessage('Please fix the highlighted fields.');
      } else {
        setMessage(caught instanceof Error ? caught.message : 'Could not save. Nothing was changed.');
      }
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2 text-secondary" role="status">
        <div className="spinner-border spinner-border-sm" aria-hidden="true" />
        Loading…
      </div>
    );
  }

  const back = contactRef ? `/contacts/${contactRef}` : accountRef ? `/accounts/${accountRef}` : '/contacts';
  const text = (setter: (value: string) => void) => (e: { target: { value: string } }) => setter(e.target.value);

  return (
    <section>
      <p className="crumb">
        <Link to={back}>← Back</Link>
      </p>
      <h1>{editing ? 'Edit contact' : 'New contact'}</h1>

      <form onSubmit={submit} noValidate className="card shadow-sm">
        <div className="card-body row g-3">
          {message && (
            <div className="col-12">
              <div className="alert alert-danger mb-0" role="alert">
                {message}
              </div>
            </div>
          )}

          {editing ? (
            <div className="col-12 text-secondary">
              {contactRef} at <strong>{accountName}</strong>
            </div>
          ) : (
            <FormField id="contact-account" label="Account" error={fields.accountRef} className="col-12">
              {(props) => (
                <select {...props} className={`form-select ${props.className}`} value={accountRef}
                  onChange={text(setAccountRef)}>
                  <option value="">Choose an account…</option>
                  {accounts.map((account) => (
                    <option key={account.accountRef} value={account.accountRef}>
                      {account.name}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          )}

          <FormField id="contact-first" label="First name" error={fields.firstName}>
            {(props) => <input {...props} className={`form-control ${props.className}`} value={firstName} maxLength={80} onChange={text(setFirstName)} />}
          </FormField>
          <FormField id="contact-last" label="Last name" error={fields.lastName}>
            {(props) => <input {...props} className={`form-control ${props.className}`} value={lastName} maxLength={80} onChange={text(setLastName)} />}
          </FormField>
          <FormField id="contact-email" label="Email" error={fields.email}>
            {(props) => <input {...props} type="email" className={`form-control ${props.className}`} value={email} maxLength={160} onChange={text(setEmail)} />}
          </FormField>
          <FormField id="contact-phone" label="Phone" error={fields.phone}>
            {(props) => <input {...props} type="tel" className={`form-control ${props.className}`} value={phone} maxLength={40} onChange={text(setPhone)} />}
          </FormField>
          <FormField id="contact-title" label="Job title" error={fields.jobTitle}>
            {(props) => <input {...props} className={`form-control ${props.className}`} value={jobTitle} maxLength={120} onChange={text(setJobTitle)} />}
          </FormField>
          {editing && (
            <FormField id="contact-status" label="Status" error={fields.status}>
              {(props) => (
                <select {...props} className={`form-select ${props.className}`} value={status}
                  onChange={(e) => setStatus(e.target.value as ContactStatus)}>
                  {(Object.keys(STATUS_LABELS) as ContactStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          )}
        </div>
        <div className="card-footer bg-white d-flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Create contact'}
          </button>
          <button type="button" className="btn btn-light" onClick={() => navigate(back)}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
