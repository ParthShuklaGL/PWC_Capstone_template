import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.tsx';

const VIA_LABEL = { Bearer: 'JWT', Cookies: 'cookie', Session: 'session' } as const;

export default function Layout() {
  const { me, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function onSignOut() {
    setSigningOut(true);
    await signOut();
  }

  return (
    <>
      <header className="app-header">
        <span className="app-header__brand">Nimbus CRM</span>
        <nav className="app-header__nav" aria-label="Main">
          <NavLink to="/" end>
            Reports
          </NavLink>
          <NavLink to="/accounts">Accounts</NavLink>
          <NavLink to="/contacts">Contacts</NavLink>
          <NavLink to="/deals">Deals</NavLink>
          {me?.role === 'ADMIN' && <NavLink to="/users">Users</NavLink>}
        </nav>
        <span className="app-header__who">
          {me?.username} ({me?.role}) via {me ? VIA_LABEL[me.authenticatedVia] : ''}
        </span>
        <button type="button" onClick={onSignOut} disabled={signingOut}>
          Sign out
        </button>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </>
  );
}
