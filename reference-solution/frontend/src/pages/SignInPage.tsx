import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.tsx';
import { fieldErrorsFor, messageFor } from '../errors.ts';
import type { AuthMode } from '../types.ts';

const MODE_HELP: Record<AuthMode, string> = {
  Jwt: 'A signed token is returned and sent with every request as an Authorization header.',
  Cookie: 'The same token is kept in an HttpOnly cookie that scripts on the page cannot read.',
  Session: 'The server remembers your sign-in and gives the browser a session cookie.',
};

export default function SignInPage() {
  const { status, notice, signIn, register } = useAuth();
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<AuthMode>('Jwt');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (status === 'signedIn') {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    try {
      if (creating) {
        await register(username, email, password, mode);
      } else {
        await signIn(mode, username, password);
      }
    } catch (caught) {
      const found = fieldErrorsFor(caught);
      setFields(found);
      // Field messages appear beside their inputs; anything else is shown once, above the button.
      setError(Object.keys(found).length > 0 ? '' : messageFor(caught));
    } finally {
      setBusy(false);
    }
  }

  function toggle() {
    setCreating(!creating);
    setError('');
    setFields({});
  }

  return (
    <main className="center">
      <form className="card sign-in" onSubmit={onSubmit} noValidate>
        <h1>{creating ? 'Create an account' : 'Sign in to Nimbus CRM'}</h1>

        {notice && (
          <p className="notice notice--warn" role="status">
            {notice}
          </p>
        )}

        <label>
          Sign-in method
          <select value={mode} onChange={(event) => setMode(event.target.value as AuthMode)}>
            <option value="Jwt">JWT (Bearer token)</option>
            <option value="Cookie">Cookie (HttpOnly)</option>
            <option value="Session">Session (server-side)</option>
          </select>
        </label>
        <p className="hint">{MODE_HELP[mode]}</p>

        <label>
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            aria-invalid={Boolean(fields.username)}
          />
          {fields.username && <span className="field-error">{fields.username}</span>}
        </label>

        {creating && (
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              aria-invalid={Boolean(fields.email)}
            />
            {fields.email && <span className="field-error">{fields.email}</span>}
          </label>
        )}

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={creating ? 'new-password' : 'current-password'}
            aria-invalid={Boolean(fields.password)}
          />
          {fields.password && <span className="field-error">{fields.password}</span>}
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Please wait…' : creating ? 'Create account and sign in' : 'Sign in'}
        </button>
        <button type="button" className="link" onClick={toggle}>
          {creating ? 'I already have an account' : 'Create an account'}
        </button>
      </form>
    </main>
  );
}
