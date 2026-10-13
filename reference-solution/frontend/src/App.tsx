import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.tsx';
import Layout from './components/Layout.tsx';
import { RequireAdmin, RequireAuth } from './components/RequireAuth.tsx';
import AccountsPage from './pages/AccountsPage.tsx';
import ContactsPage from './pages/ContactsPage.tsx';
import DealsPage from './pages/DealsPage.tsx';
import ReportsPage from './pages/ReportsPage.tsx';
import SignInPage from './pages/SignInPage.tsx';
import UsersPage from './pages/UsersPage.tsx';

function NotFound() {
  return (
    <section className="card notice-page">
      <h1>Page not found</h1>
      <p>
        <Link to="/">Back to the reports</Link>
      </p>
    </section>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/sign-in" element={<SignInPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route index element={<ReportsPage />} />
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="deals" element={<DealsPage />} />
              <Route element={<RequireAdmin />}>
                <Route path="users" element={<UsersPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
