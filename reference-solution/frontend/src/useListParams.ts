import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * A list screen keeps its filters and page in the address, so a filtered list can be linked to (the accounts
 * screen links to "contacts of this account"), reloaded and shared. Changing a filter goes back to page 1.
 */
export function useListParams(names: readonly string[]) {
  const [params, setParams] = useSearchParams();

  const values: Record<string, string> = {};
  for (const name of names) {
    values[name] = params.get(name) ?? '';
  }
  const parsed = Number(params.get('page'));
  const page = Number.isInteger(parsed) && parsed > 0 ? parsed : 0;

  const setFilter = useCallback(
    (changes: Record<string, string>) => {
      setParams((previous) => {
        const next = new URLSearchParams(previous);
        for (const [name, value] of Object.entries(changes)) {
          if (value) {
            next.set(name, value);
          } else {
            next.delete(name);
          }
        }
        next.delete('page');
        return next;
      });
    },
    [setParams],
  );

  const setPage = useCallback(
    (target: number) => {
      setParams((previous) => {
        const next = new URLSearchParams(previous);
        if (target > 0) {
          next.set('page', String(target));
        } else {
          next.delete('page');
        }
        return next;
      });
    },
    [setParams],
  );

  return { values, page, setFilter, setPage };
}

/** If the last row of the last page was deleted, the page is now empty: step back to the new last page. */
export function useClampPage(result: { items: unknown[]; total: number } | null, page: number, size: number, setPage: (page: number) => void) {
  useEffect(() => {
    if (result && result.items.length === 0 && result.total > 0 && page > 0) {
      setPage(Math.max(0, Math.ceil(result.total / size) - 1));
    }
  }, [result, page, size, setPage]);
}
