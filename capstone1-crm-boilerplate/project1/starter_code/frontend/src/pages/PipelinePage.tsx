import { useState } from 'react';
import { Link } from 'react-router-dom';
import { moveDealStage } from '../api/crm.ts';
import StageColumn from '../components/StageColumn.tsx';
import { formatMoney } from '../constants.ts';
import { useDealsPipeline } from '../hooks/useDealsPipeline.ts';
import type { Deal, DealStage } from '../types.ts';

export default function PipelinePage() {
  const { summary, deals, status, error, refetch } = useDealsPipeline();
  const [moveError, setMoveError] = useState('');

  async function onQuickMove(deal: Deal, stage: DealStage) {
    setMoveError('');
    try {
      await moveDealStage(deal.dealRef, { stage });
      await refetch();
    } catch (caught) {
      setMoveError(caught instanceof Error ? caught.message : 'That move failed');
    }
  }

  if (status === 'loading') {
    return (
      <div className="d-flex align-items-center gap-2 text-secondary" role="status">
        <div className="spinner-border spinner-border-sm" aria-hidden="true" />
        Loading pipeline…
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

  return (
    <section>
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
        <div>
          <h1 className="mb-1">Pipeline</h1>
          <p className="text-secondary mb-0">
            Open deals: Prospecting to Negotiation
          </p>
        </div>
        <div className="card shadow-sm border-0 bg-primary text-white px-4 py-2">
          <div className="small text-white-50">Open pipeline</div>
          <div className="fs-4 fw-semibold" data-testid="open-total">
            {formatMoney(summary.openValue)}
          </div>
          <div className="small">across {summary.openCount} open deals</div>
        </div>
      </div>

      {moveError && (
        <div className="alert alert-danger" role="alert">
          {moveError}
        </div>
      )}

      <div className="board">
        {summary.stages.map((total) => (
          <StageColumn
            key={total.stage}
            total={total}
            deals={deals.filter((deal) => deal.stage === total.stage)}
            onQuickMove={onQuickMove}
          />
        ))}
      </div>

      <p className="small text-secondary mt-3">
        Won and Lost need a close date or a reason, so use the{' '}
        <Link to="/deals">deal page</Link> for those moves.
      </p>
    </section>
  );
}
