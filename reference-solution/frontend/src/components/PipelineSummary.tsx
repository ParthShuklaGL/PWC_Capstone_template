import { useCallback } from 'react';
import { fetchDealsByStage } from '../api/reports.ts';
import { formatMoney, titleCase } from '../format.ts';
import { useLoad } from '../useLoad.ts';

interface Props {
  /** Change this number to fetch the figures again, for example after a deal moved stage. */
  version: number;
  /** The stage the list is filtered to, or an empty string. */
  active: string;
  onPick: (stage: string) => void;
}

/**
 * How many deals and how much money sit in each stage. Every figure is the deals-by-stage report as the
 * server computed it; nothing is added up here. Choosing a stage filters the list below to it.
 */
export default function PipelineSummary({ version, active, onPick }: Props) {
  // `version` is only here so the loader is a new function (and the figures reload) when it changes.
  const load = useCallback(() => {
    void version;
    return fetchDealsByStage();
  }, [version]);
  const { status, data, error } = useLoad(load);

  return (
    <section className="pipeline" aria-label="Pipeline summary">
      {status === 'error' && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {status !== 'error' && data === null && <p className="notice">Loading pipeline…</p>}
      {data && (
        <ul className="pipeline__stages">
          {data.map((row) => (
            <li key={row.stage}>
              <button
                type="button"
                className={`pipeline__stage pipeline__stage--${row.stage.toLowerCase()}`}
                aria-pressed={active === row.stage}
                onClick={() => onPick(active === row.stage ? '' : row.stage)}
              >
                <span className="pipeline__name">{titleCase(row.stage)}</span>
                <span className="pipeline__count">
                  {row.deals} {row.deals === 1 ? 'deal' : 'deals'}
                </span>
                <span className="pipeline__value">{formatMoney(row.totalValue)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
