import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import ContactsPage from './pages/ContactsPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import ContactDetailPage from './pages/ContactDetailPage.tsx';
import DealsPage from './pages/DealsPage.tsx';
import DealDetailPage from './pages/DealDetailPage.tsx';
import DealFormPage from './pages/DealFormPage.tsx';
import PipelinePage from './pages/PipelinePage.tsx';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link ${isActive ? 'active fw-semibold' : ''}`;

export default function App() {
  return (
    <BrowserRouter>
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
              <NavLink to="/deals" className={linkClass}>
                Deals
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/pipeline" className={linkClass}>
                Pipeline
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>

      <main className="container-xl app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/contacts/:contactRef" element={<ContactDetailPage />} />
          <Route path="/deals" element={<DealsPage />} />
          <Route path="/deals/new" element={<DealFormPage />} />
          <Route path="/deals/:dealRef" element={<DealDetailPage />} />
          <Route path="/deals/:dealRef/edit" element={<DealFormPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
