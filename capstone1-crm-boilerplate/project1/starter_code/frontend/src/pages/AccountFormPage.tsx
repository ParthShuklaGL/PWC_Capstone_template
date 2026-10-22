import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, createAccount, fetchAccount, updateAccount } from '../api/crm.ts';
import FormField from '../components/FormField.tsx';

export default function AccountFormPage() {
  const { accountRef } = useParams<{ accountRef: string }>();
  const editing = Boolean(accountRef);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    if (!accountRef) return;
    let cancelled = false;
    fetchAccount(accountRef)
      .then((account) => {
        if (cancelled) return;
        setName(account.name);
        setIndustry(account.industry ?? '');
        setCountry(account.country ?? '');
        setWebsite(account.website ?? '');
        setLoading(false);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setMessage(caught instanceof Error ? caught.message : 'Could not load this account');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountRef]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFields({});
    setMessage('');
    const input = {
      name,
      industry: industry.trim() || undefined,
      country: country.trim() || undefined,
      website: website.trim() || undefined,
    };
    try {
      const saved = accountRef ? await updateAccount(accountRef, input) : await createAccount(input);
      navigate(`/accounts/${saved.accountRef}`);
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

  const back = accountRef ? `/accounts/${accountRef}` : '/accounts';

  return (
    <section>
      <p className="crumb">
        <Link to={back}>← Back</Link>
      </p>
      <h1>{editing ? 'Edit account' : 'New account'}</h1>

      <form onSubmit={submit} noValidate className="card shadow-sm">
        <div className="card-body row g-3">
          {message && (
            <div className="col-12">
              <div className="alert alert-danger mb-0" role="alert">
                {message}
              </div>
            </div>
          )}
          <FormField id="account-name" label="Name" error={fields.name} className="col-12">
            {(props) => (
              <input {...props} className={`form-control ${props.className}`} value={name} maxLength={200}
                onChange={(e) => setName(e.target.value)} />
            )}
          </FormField>
          <FormField id="account-industry" label="Industry" error={fields.industry}>
            {(props) => (
              <input {...props} className={`form-control ${props.className}`} value={industry} maxLength={80}
                onChange={(e) => setIndustry(e.target.value)} />
            )}
          </FormField>
          <FormField id="account-country" label="Country" error={fields.country}>
            {(props) => (
              <input {...props} className={`form-control ${props.className}`} value={country} maxLength={80}
                onChange={(e) => setCountry(e.target.value)} />
            )}
          </FormField>
          <FormField id="account-website" label="Website" error={fields.website} className="col-12">
            {(props) => (
              <input {...props} type="url" placeholder="https://" className={`form-control ${props.className}`}
                value={website} maxLength={200} onChange={(e) => setWebsite(e.target.value)} />
            )}
          </FormField>
        </div>
        <div className="card-footer bg-white d-flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Create account'}
          </button>
          <button type="button" className="btn btn-light" onClick={() => navigate(back)}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
