import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/crm.ts';
import { useAuth } from '../auth/AuthContext.tsx';

/** Local demo accounts, published in the backend README. Never ship a list like this to production. */
const DEMO_ACCOUNTS = [
  { label: 'Priya (Admin)', email: 'admin@nimbus.test', password: 'Admin#2026' },
  { label: 'Aisha (Rep)', email: 'aisha@nimbus.test', password: 'Rep#2026' },
  { label: 'Ben (Rep)', email: 'ben@nimbus.test', password: 'Rep#2026' },
];

/** Only same-site paths, so a crafted link cannot bounce a user to another site after sign-in. */
function safeReturnTo(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export default function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));
  const expired = params.get('expired') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) {
    return <Navigate to={returnTo} replace />;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    const missing: Record<string, string> = {};
    if (!email.trim()) missing.email = 'Enter your email address.';
    if (!password) missing.password = 'Enter your password.';
    setFields(missing);
    setMessage('');
    if (Object.keys(missing).length > 0) return;

    setBusy(true);
    try {
      await signIn(email.trim(), password);
      navigate(returnTo, { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        setMessage('Email or password is incorrect.');
      } else if (caught instanceof ApiError && caught.body?.fields) {
        setFields(caught.body.fields);
      } else {
        setMessage('Could not reach the server. Is the API running on port 5080?');
      }
      setPassword('');
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login__card card shadow border-0">
        <div className="login__brand text-white">
          <i className="bi bi-cloud-fill fs-2" aria-hidden="true" />
          <div>
            <div className="fs-4 fw-semibold">Nimbus CRM</div>
            <div className="small opacity-75">Inside Sales pipeline</div>
          </div>
        </div>

        <form className="card-body p-4" onSubmit={submit} noValidate>
          <h1 className="h4 mb-3">Sign in</h1>

          {expired && !message && (
            <div className="alert alert-warning py-2" role="status">
              Your session has ended. Sign in again to continue.
            </div>
          )}
          {message && (
            <div className="alert alert-danger py-2" role="alert">
              {message}
            </div>
          )}

          <div className="mb-3">
            <label htmlFor="login-email" className="form-label">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              className={`form-control ${fields.email ? 'is-invalid' : ''}`}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-describedby={fields.email ? 'login-email-error' : undefined}
            />
            {fields.email && (
              <div id="login-email-error" className="invalid-feedback">
                {fields.email}
              </div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="login-password" className="form-label">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              className={`form-control ${fields.password ? 'is-invalid' : ''}`}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby={fields.password ? 'login-password-error' : undefined}
            />
            {fields.password && (
              <div id="login-password-error" className="invalid-feedback">
                {fields.password}
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary w-100" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="login__demo mt-4">
            <div className="small text-secondary mb-2">Demo accounts (local only): fill in and press Sign in</div>
            <div className="d-flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    setEmail(demo.email);
                    setPassword(demo.password);
                    setFields({});
                    setMessage('');
                  }}
                >
                  {demo.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
