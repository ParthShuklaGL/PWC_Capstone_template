import { Link } from 'react-router-dom';
import { STAGES, formatMoney, formatStage, isOpenStage } from '../constants.ts';
import type { Deal, DealStage, StageTotal } from '../types.ts';
import StageBadge from './StageBadge.tsx';

interface Props {
  total: StageTotal;
  deals: Deal[];
  onQuickMove: (deal: Deal, stage: DealStage) => void;
}

export default function StageColumn({ total, deals, onQuickMove }: Props) {
  const index = STAGES.indexOf(total.stage);
  const previous = index > 0 && isOpenStage(total.stage) ? STAGES[index - 1] : null;
  const next = index < 3 ? STAGES[index + 1] : null;

  return (
    <section className="board__column" aria-label={`${formatStage(total.stage)} column`}>
      <header className="board__header">
        <StageBadge stage={total.stage} />
        <div className="fw-semibold mt-2">{formatMoney(total.totalValue)}</div>
        <div className="small text-secondary">
          {total.count} {total.count === 1 ? 'deal' : 'deals'}
        </div>
      </header>

      {deals.length === 0 ? (
        <p className="small text-secondary text-center my-3">No deals here</p>
      ) : (
        deals.map((deal) => (
          <article key={deal.dealRef} className="card board__card shadow-sm">
            <div className="card-body p-2">
              <Link to={`/deals/${deal.dealRef}`} className="fw-semibold small d-block">
                {deal.title}
              </Link>
              <div className="small text-secondary">{deal.accountName}</div>
              <div className="small fw-semibold mt-1">{formatMoney(deal.value)}</div>
              {isOpenStage(deal.stage) && (
                <div className="d-flex gap-1 mt-2">
                  {previous && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm py-0"
                      aria-label={`Move ${deal.title} back to ${formatStage(previous)}`}
                      onClick={() => onQuickMove(deal, previous)}
                    >
                      <i className="bi bi-arrow-left" aria-hidden="true" />
                    </button>
                  )}
                  {next && (
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm py-0 ms-auto"
                      aria-label={`Move ${deal.title} forward to ${formatStage(next)}`}
                      onClick={() => onQuickMove(deal, next)}
                    >
                      <i className="bi bi-arrow-right" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </article>
        ))
      )}
    </section>
  );
}
