import { useCallback, useEffect, useState } from 'react';
import { fetchDealSummary, fetchDeals } from '../api/crm.ts';
import type { Deal, DealSummary, LoadStatus } from '../types.ts';

/**
 * One hook owns the pipeline data so the board and its totals always agree.
 * Totals come from the server summary; they are never added up in the browser.
 */
export function useDealsPipeline() {
  const [summary, setSummary] = useState<DealSummary | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState('');

  const load = useCallback(async (isCancelled: () => boolean = () => false) => {
    try {
      const [loadedSummary, loadedDeals] = await Promise.all([
        fetchDealSummary(),
        fetchDeals(0, 100),
      ]);
      if (isCancelled()) return;
      // Both arrive together or neither is shown: no half-updated board.
      setSummary(loadedSummary);
      setDeals(loadedDeals.items);
      setError('');
      setStatus('ready');
    } catch (caught) {
      if (isCancelled()) return;
      setError(caught instanceof Error ? caught.message : 'Could not load the pipeline');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { summary, deals, status, error, refetch: () => load() };
}
