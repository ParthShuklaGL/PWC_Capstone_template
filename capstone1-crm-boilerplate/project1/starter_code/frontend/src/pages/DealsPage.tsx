import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchDeals } from '../api/crm.ts';
import Pagination from '../components/Pagination.tsx';
import StageBadge from '../components/StageBadge.tsx';
import { PAGE_SIZE, STAGES, formatDate, formatMoney, formatStage } from '../constants.ts';
import type { Deal, LoadStatus } from '../types.ts';

export default function DealsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const stage = params.get('stage') ?? 'ALL';
  const page = Number(params.get('page') ?? '0') || 0;

  const [deals, setDeals] = useState<Deal[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetchDeals(page, PAGE_SIZE, stage)
      .then((response) => {
        if (cancelled) return;
        setDeals(response.items);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : 'Could not load deals');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [page, stage]);

  function selectStage(next: string) {
    const nextParams = new URLSearchParams();
    if (next !== 'ALL') nextParams.set('stage', next);
    setParams(nextParams);
  }

  function selectPage(next: number) {
    const nextParams = new URLSearchParams(params);
    nextParams.set('page', String(next));
    setParams(nextParams);
  }

  return (
    <section>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="mb-0">Deals</h1>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/deals/new')}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true" />
          New deal
        </button>
      </div>

      <div className="btn-group flex-wrap mb-3" role="group" aria-label="Filter deals by stage">
        {['ALL', ...STAGES].map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={stage === option}
            className={`btn btn-sm ${stage === option ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => selectStage(option)}
          >
            {option === 'ALL' ? 'All stages' : formatStage(option as (typeof STAGES)[number])}
          </button>
        ))}
      </div>

      {status === 'loading' && (
        <div className="d-flex align-items-center gap-2 text-secondary" role="status">
          <div className="spinner-border spinner-border-sm" aria-hidden="true" />
          Loading deals…
        </div>
      )}

      {status === 'error' && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {status === 'ready' && deals.length === 0 && (
        <div className="alert alert-light border">No deals in this stage.</div>
      )}

      {status === 'ready' && deals.length > 0 && (
        <>
          <div className="card shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Deal</th>
                    <th scope="col">Account</th>
                    <th scope="col">Contact</th>
                    <th scope="col" className="text-end">
                      Value
                    </th>
                    <th scope="col">Expected close</th>
                    <th scope="col">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal) => (
                    <tr key={deal.dealRef}>
                      <td>
                        <Link to={`/deals/${deal.dealRef}`} className="fw-semibold">
                          {deal.title}
                        </Link>
                        <div className="small text-secondary">{deal.dealRef}</div>
                      </td>
                      <td>{deal.accountName}</td>
                      <td>{deal.contactName}</td>
                      <td className="text-end">{formatMoney(deal.value)}</td>
                      <td>{formatDate(deal.expectedCloseDate)}</td>
                      <td>
                        <StageBadge stage={deal.stage} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            onChange={selectPage}
            noun="deals"
          />
        </>
      )}
    </section>
  );
}
