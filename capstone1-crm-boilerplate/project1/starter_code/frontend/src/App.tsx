import type { ReactNode } from 'react';
import { BrowserRouter, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, RequireAdmin, RequireAuth, useAuth } from './auth/AuthContext.tsx';
import AccountDetailPage from './pages/AccountDetailPage.tsx';
import AccountFormPage from './pages/AccountFormPage.tsx';
import AccountsPage from './pages/AccountsPage.tsx';
import ContactDetailPage from './pages/ContactDetailPage.tsx';
import ContactFormPage from './pages/ContactFormPage.tsx';
import ContactsPage from './pages/ContactsPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import DealDetailPage from './pages/DealDetailPage.tsx';
import DealFormPage from './pages/DealFormPage.tsx';
import DealsPage from './pages/DealsPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import PipelinePage from './pages/PipelinePage.tsx';
import { ForbiddenPage, NotFoundPage } from './pages/StatusPages.tsx';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link ${isActive ? 'active fw-semibold' : ''}`;

function Layout() {
  const { user, isAdmin, signOut } = useAuth();
  return (
    <>
      <nav className="navbar navbar-expand navbar-dark bg-primary app-nav">
        <div className="container-xl">
          <NavLink to="/" className="navbar-brand fw-semibold">
            <i className="bi bi-cloud-fill me-2" aria-hidden="true" />
            Nimbus CRM
          </NavLink>
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <NavLink to="/" end className={linkClass}>
                Dashboard
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/contacts" className={linkClass}>
                Contacts
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/accounts" className={linkClass}>
                Accounts
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/deals" className={linkClass}>
                {isAdmin ? 'Deals' : 'My deals'}
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/pipeline" className={linkClass}>
                Pipeline
              </NavLink>
            </li>
          </ul>
          {user && (
            <div className="d-flex align-items-center gap-2 text-white">
              <i className="bi bi-person-circle" aria-hidden="true" />
              <span className="small" data-testid="signed-in-as">
                {user.displayName}
              </span>
              <span className={`badge ${isAdmin ? 'text-bg-warning' : 'text-bg-light'}`}>
                {isAdmin ? 'Admin' : 'Sales rep'}
              </span>
              <button type="button" className="btn btn-sm btn-outline-light ms-2" onClick={signOut}>
                <i className="bi bi-box-arrow-right me-1" aria-hidden="true" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </nav>
      <main className="container-xl app-main">
        <Outlet />
      </main>
    </>
  );
}

const admin = (page: ReactNode) => <RequireAdmin>{page}</RequireAdmin>;

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/contacts/new" element={admin(<ContactFormPage />)} />
            <Route path="/contacts/:contactRef" element={<ContactDetailPage />} />
            <Route path="/contacts/:contactRef/edit" element={admin(<ContactFormPage />)} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/accounts/new" element={admin(<AccountFormPage />)} />
            <Route path="/accounts/:accountRef" element={<AccountDetailPage />} />
            <Route path="/accounts/:accountRef/edit" element={admin(<AccountFormPage />)} />
            <Route path="/deals" element={<DealsPage />} />
            <Route path="/deals/new" element={admin(<DealFormPage />)} />
            <Route path="/deals/:dealRef" element={<DealDetailPage />} />
            <Route path="/deals/:dealRef/edit" element={admin(<DealFormPage />)} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/forbidden" element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
