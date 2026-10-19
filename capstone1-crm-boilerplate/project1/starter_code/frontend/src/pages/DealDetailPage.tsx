import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, deleteDeal, fetchDeal, fetchDealHistory } from '../api/crm.ts';
import StageBadge from '../components/StageBadge.tsx';
import StageMoveControl from '../components/StageMoveControl.tsx';
import { formatDate, formatMoney, formatStage, formatStatus, isOpenStage } from '../constants.ts';
import type { Deal, DealHistoryEntry, LoadStatus } from '../types.ts';

export default function DealDetailPage() {
  const { dealRef } = useParams<{ dealRef: string }>();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [history, setHistory] = useState<DealHistoryEntry[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!dealRef) return;
    let cancelled = false;
    setStatus('loading');
    setNotFound(false);
    Promise.all([fetchDeal(dealRef), fetchDealHistory(dealRef)])
      .then(([loadedDeal, loadedHistory]) => {
        if (cancelled) return;
        setDeal(loadedDeal);
        setHistory(loadedHistory);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        if (caught instanceof ApiError && caught.status === 404) setNotFound(true);
        setError(caught instanceof Error ? caught.message : 'Could not load this deal');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [dealRef]);

  async function onMoved(moved: Deal) {
    setDeal(moved);
    if (dealRef) setHistory(await fetchDealHistory(dealRef));
  }

  async function onDelete() {
    if (!deal || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteDeal(deal.dealRef);
      navigate('/deals');
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : 'Could not delete this deal');
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="d-flex align-items-center gap-2 text-secondary" role="status">
        <div className="spinner-border spinner-border-sm" aria-hidden="true" />
        Loading…
      </div>
    );
  }

  if (status === 'error' || !deal) {
    return (
      <div className="alert alert-danger" role="alert">
        {notFound ? `Deal ${dealRef} was not found.` : error}
        <div className="mt-2">
          <Link to="/deals">← All deals</Link>
        </div>
      </div>
    );
  }

  return (
    <section>
      <p className="crumb">
        <Link to="/deals">← All deals</Link>
      </p>

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h1 className="mb-1">{deal.title}</h1>
          <div className="text-secondary">
            {deal.dealRef} · <StageBadge stage={deal.stage} />
          </div>
        </div>
        {isOpenStage(deal.stage) && (
          <div className="d-flex gap-2">
            <Link to={`/deals/${deal.dealRef}/edit`} className="btn btn-outline-primary">
              <i className="bi bi-pencil me-1" aria-hidden="true" />
              Edit
            </Link>
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={() => setConfirming(true)}
            >
              <i className="bi bi-trash me-1" aria-hidden="true" />
              Delete
            </button>
          </div>
        )}
      </div>

      {confirming && (
        <div className="alert alert-warning d-flex flex-wrap align-items-center gap-2" role="alertdialog">
          <span className="me-auto">Delete this deal? This cannot be undone.</span>
          <button type="button" className="btn btn-sm btn-danger" onClick={onDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button type="button" className="btn btn-sm btn-light" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </div>
      )}

      {deleteError && (
        <div className="alert alert-danger" role="alert">
          {deleteError}
        </div>
      )}

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h2 className="h5 mt-0">Details</h2>
              <dl className="row mb-0">
                <dt className="col-sm-4 text-secondary fw-normal">Value</dt>
                <dd className="col-sm-8 fw-semibold">{formatMoney(deal.value)}</dd>

                <dt className="col-sm-4 text-secondary fw-normal">Expected close</dt>
                <dd className="col-sm-8">{formatDate(deal.expectedCloseDate)}</dd>

                {deal.closedDate && (
                  <>
                    <dt className="col-sm-4 text-secondary fw-normal">Closed</dt>
                    <dd className="col-sm-8">{formatDate(deal.closedDate)}</dd>
                  </>
                )}

                {deal.lostReason && (
                  <>
                    <dt className="col-sm-4 text-secondary fw-normal">Lost because</dt>
                    <dd className="col-sm-8">{deal.lostReason}</dd>
                  </>
                )}

                <dt className="col-sm-4 text-secondary fw-normal">Account</dt>
                <dd className="col-sm-8">{deal.accountName}</dd>

                <dt className="col-sm-4 text-secondary fw-normal">Contact</dt>
                <dd className="col-sm-8">
                  <Link to={`/contacts/${deal.contactRef}`}>{deal.contactName}</Link>{' '}
                  <span className="badge text-bg-light border">{formatStatus(deal.contactStatus)}</span>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h2 className="h5 mt-0">History</h2>
              {history.length === 0 ? (
                <p className="text-secondary mb-0">No moves recorded yet.</p>
              ) : (
                <ol className="list-group list-group-flush">
                  {history.map((entry, index) => (
                    <li key={index} className="list-group-item px-0 d-flex justify-content-between">
                      <span>
                        {entry.fromStage ? `${formatStage(entry.fromStage)} → ` : 'Created in '}
                        <strong>{formatStage(entry.toStage)}</strong>
                      </span>
                      <span className="text-secondary small">{formatDate(entry.changedAt)}</span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="small text-secondary mt-2 mb-0">
                The API does not record who made a move: there is no sign-in in this system.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm mt-3">
        <div className="card-body">
          <h2 className="h5 mt-0">Move stage</h2>
          <StageMoveControl deal={deal} onMoved={onMoved} />
        </div>
      </div>
    </section>
  );
}
