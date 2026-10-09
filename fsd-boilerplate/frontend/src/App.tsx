import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, login, logout, me, register, savedMode, type AuthMode, type User } from './api.ts';
import ProductsPage from './pages/ProductsPage.tsx';
import ReportsPage from './pages/ReportsPage.tsx';
import UsersPage from './pages/UsersPage.tsx';

type Tab = 'products' | 'reports' | 'users';

const MODE_HELP: Record<AuthMode, string> = {
  jwt: 'A signed token is returned and sent as an Authorization header.',
  cookie: 'The same token is stored in an HttpOnly cookie that scripts cannot read.',
  session: 'The server remembers the login and gives the browser a session cookie.',
};

function LoginForm({ onSignedIn }: { onSignedIn: (user: User, mode: AuthMode) => void }) {
  const [mode, setMode] = useState<AuthMode>(savedMode());
  const [creating, setCreating] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (creating) {
        await register(username, email, password);
      }
      onSignedIn(await login(mode, username, password), mode);
    } catch (caught) {
      const fields = caught instanceof ApiError ? Object.values(caught.fields) : [];
      setError(fields.length > 0 ? fields.join(' ') : (caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card login" onSubmit={submit}>
      <h1>{creating ? 'Create an account' : 'Sign in'}</h1>

      <label>
        Sign-in method
        <select value={mode} onChange={(e) => setMode(e.target.value as AuthMode)}>
          <option value="jwt">JWT (Bearer token)</option>
          <option value="cookie">Cookie (HttpOnly JWT)</option>
          <option value="session">Session (server-side)</option>
        </select>
      </label>
      <p className="hint">{MODE_HELP[mode]}</p>

      <label>
        Username
        <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
      </label>
      {creating && (
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
      )}
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={creating ? 'new-password' : 'current-password'}
          minLength={creating ? 8 : undefined}
          required
        />
      </label>

      {error && <p className="error" role="alert">{error}</p>}

      <button type="submit" disabled={busy}>
        {busy ? 'Please wait…' : creating ? 'Create account and sign in' : 'Sign in'}
      </button>
      <button type="button" className="link" onClick={() => setCreating(!creating)}>
        {creating ? 'I already have an account' : 'Create an account'}
      </button>
      {!creating && <p className="hint">Demo: admin / Admin#12345 or demo / User#12345</p>}
    </form>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<AuthMode>(savedMode());
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>('products');

  // Pick up an existing login (a session or cookie survives a page reload).
  useEffect(() => {
    me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  async function signOut() {
    try {
      await logout();
    } finally {
      setUser(null);
      setTab('products');
    }
  }

  if (checking) {
    return <p className="notice">Loading…</p>;
  }

  if (!user) {
    return (
      <main className="center">
        <LoginForm
          onSignedIn={(signedIn, usedMode) => {
            setUser(signedIn);
            setMode(usedMode);
          }}
        />
      </main>
    );
  }

  const tabs: Tab[] = user.role === 'ADMIN' ? ['products', 'reports', 'users'] : ['products', 'reports'];

  return (
    <>
      <header className="bar">
        <strong>FSD Boilerplate</strong>
        <nav>
          {tabs.map((t) => (
            <button key={t} className={t === tab ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
        <span className="who">
          {user.username} ({user.role}) via {mode}
        </span>
        <button onClick={signOut}>Sign out</button>
      </header>
      <main>
        {tab === 'products' && <ProductsPage isAdmin={user.role === 'ADMIN'} />}
        {tab === 'reports' && <ReportsPage isAdmin={user.role === 'ADMIN'} />}
        {tab === 'users' && user.role === 'ADMIN' && <UsersPage currentUser={user.username} />}
      </main>
    </>
  );
}
