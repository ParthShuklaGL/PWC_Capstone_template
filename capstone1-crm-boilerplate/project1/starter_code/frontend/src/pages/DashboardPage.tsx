import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchContacts, fetchDealSummary, fetchDeals } from '../api/crm.ts';
import StageBadge from '../components/StageBadge.tsx';
import { PAGE_SIZE, STAGE_COLOURS, formatDate, formatMoney, formatStage } from '../constants.ts';
import { downloadCsv, toCsv, today } from '../csv.ts';
import type { ContactSummary, Deal, DealSummary, LoadStatus } from '../types.ts';

const BAR_COLOURS: Record<string, string> = {
  secondary: '#6c757d',
  info: '#0dcaf0',
  primary: '#0d6efd',
  warning: '#ffc107',
  success: '#198754',
  danger: '#dc3545',
};

function HeroArt() {
  return (
    <svg viewBox="0 0 320 200" className="hero__art" role="img" aria-label="Pipeline illustration">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="300" height="180" rx="16" fill="url(#sky)" />
      <path
        d="M70 120a28 28 0 0 1 8-54 38 38 0 0 1 72-8 32 32 0 0 1 14 62z"
        fill="#fff"
        opacity="0.9"
      />
      <rect x="190" y="110" width="22" height="50" rx="4" fill="#ffc107" />
      <rect x="220" y="85" width="22" height="75" rx="4" fill="#20c997" />
      <rect x="250" y="55" width="22" height="105" rx="4" fill="#fff" />
      <path d="M190 100 L225 75 L255 50" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="255" cy="50" r="5" fill="#fff" />
    </svg>
  );
}

async function allContacts(): Promise<ContactSummary[]> {
  const first = await fetchContacts(0, PAGE_SIZE);
  const rest = await Promise.all(
    Array.from({ length: Math.max(first.totalPages - 1, 0) }, (_, i) =>
      fetchContacts(i + 1, PAGE_SIZE),
    ),
  );
  return [first, ...rest].flatMap((page) => page.items);
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DealSummary | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contactTotal, setContactTotal] = useState(0);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchDealSummary(), fetchDeals(0, 100), fetchContacts(0, 1)])
      .then(([loadedSummary, loadedDeals, loadedContacts]) => {
        if (cancelled) return;
        setSummary(loadedSummary);
        setDeals(loadedDeals.items);
        setContactTotal(loadedContacts.totalElements);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : 'Could not load the dashboard');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function exportDeals() {
    downloadCsv(
      `deals-${today()}.csv`,
      toCsv([
        ['Deal', 'Title', 'Account', 'Contact', 'Stage', 'Value (GBP)', 'Expected close', 'Closed'],
        ...deals.map((d) => [
          d.dealRef,
          d.title,
          d.accountName,
          d.contactName,
          d.stage,
          d.value.toFixed(2),
          d.expectedCloseDate,
          d.closedDate,
        ]),
      ]),
    );
  }

  function exportPipeline() {
    if (!summary) return;
    downloadCsv(
      `pipeline-${today()}.csv`,
      toCsv([
        ['Stage', 'Deals', 'Total value (GBP)'],
        ...summary.stages.map((s) => [s.stage, s.count, s.totalValue.toFixed(2)]),
      ]),
    );
  }

  async function exportContacts() {
    setExporting('contacts');
    try {
      const contacts = await allContacts();
      downloadCsv(
        `contacts-${today()}.csv`,
        toCsv([
          ['Reference', 'First name', 'Last name', 'Email', 'Job title', 'Account', 'Status'],
          ...contacts.map((c) => [
            c.contactRef,
            c.firstName,
            c.lastName,
            c.email,
            c.jobTitle,
            c.accountName,
            c.status,
          ]),
        ]),
      );
    } finally {
      setExporting('');
    }
  }

  if (status === 'loading') {
    return (
      <div className="d-flex align-items-center gap-2 text-secondary" role="status">
        <div className="spinner-border spinner-border-sm" aria-hidden="true" />
        Loading your dashboard…
      </div>
    );
  }

  if (status === 'error' || !summary) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  const maxValue = Math.max(...summary.stages.map((s) => s.totalValue), 1);
  const won = summary.stages.find((s) => s.stage === 'WON');
  const closingSoon = deals
    .filter((d) => d.stage !== 'WON' && d.stage !== 'LOST')
    .sort((a, b) => a.expectedCloseDate.localeCompare(b.expectedCloseDate))
    .slice(0, 5);

  return (
    <section>
      <div className="hero card border-0 text-white mb-4">
        <div className="row align-items-center g-3 p-4">
          <div className="col-md-7">
            <h1 className="display-6 fw-semibold mb-2">Welcome back to Nimbus CRM</h1>
            <p className="lead mb-3">
              {summary.openCount} open deals worth {formatMoney(summary.openValue)} are in your
              pipeline today.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <Link to="/deals/new" className="btn btn-light">
                <i className="bi bi-plus-lg me-1" aria-hidden="true" />
                New deal
              </Link>
              <Link to="/pipeline" className="btn btn-outline-light">
                View pipeline
              </Link>
            </div>
          </div>
          <div className="col-md-5 d-none d-md-block">
            <HeroArt />
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {[
          { icon: 'bi-cash-stack', label: 'Open pipeline', value: formatMoney(summary.openValue) },
          { icon: 'bi-briefcase', label: 'Open deals', value: String(summary.openCount) },
          { icon: 'bi-trophy', label: 'Won to date', value: formatMoney(won?.totalValue ?? 0) },
          { icon: 'bi-people', label: 'Contacts', value: String(contactTotal) },
        ].map((card) => (
          <div className="col-6 col-lg-3" key={card.label}>
            <div className="card shadow-sm h-100">
              <div className="card-body d-flex align-items-center gap-3">
                <i className={`bi ${card.icon} fs-2 text-primary`} aria-hidden="true" />
                <div>
                  <div className="text-secondary small">{card.label}</div>
                  <div className="fs-5 fw-semibold">{card.value}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h2 className="h5 mt-0">Pipeline by stage</h2>
              <ul className="list-unstyled mb-0" aria-label="Value by stage">
                {summary.stages.map((s) => (
                  <li key={s.stage} className="mb-3">
                    <div className="d-flex justify-content-between small">
                      <span>
                        {formatStage(s.stage)} · {s.count}
                      </span>
                      <span className="fw-semibold">{formatMoney(s.totalValue)}</span>
                    </div>
                    <div className="progress" style={{ height: '10px' }}>
                      <div
                        className="progress-bar"
                        role="presentation"
                        style={{
                          width: `${(s.totalValue / maxValue) * 100}%`,
                          backgroundColor: BAR_COLOURS[STAGE_COLOURS[s.stage]],
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h2 className="h5 mt-0">Closing soon</h2>
              <ul className="list-group list-group-flush">
                {closingSoon.map((d) => (
                  <li key={d.dealRef} className="list-group-item px-0">
                    <div className="d-flex justify-content-between">
                      <Link to={`/deals/${d.dealRef}`} className="fw-semibold">
                        {d.title}
                      </Link>
                      <StageBadge stage={d.stage} />
                    </div>
                    <div className="small text-secondary">
                      {d.accountName} · {formatMoney(d.value)} · {formatDate(d.expectedCloseDate)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm mt-4">
        <div className="card-body">
          <h2 className="h5 mt-0">Reports</h2>
          <p className="text-secondary">Download the data behind this dashboard as CSV.</p>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline-primary" onClick={exportPipeline}>
              <i className="bi bi-download me-1" aria-hidden="true" />
              Pipeline summary
            </button>
            <button type="button" className="btn btn-outline-primary" onClick={exportDeals}>
              <i className="bi bi-download me-1" aria-hidden="true" />
              All deals
            </button>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={exportContacts}
              disabled={exporting === 'contacts'}
            >
              <i className="bi bi-download me-1" aria-hidden="true" />
              {exporting === 'contacts' ? 'Preparing…' : 'All contacts'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
