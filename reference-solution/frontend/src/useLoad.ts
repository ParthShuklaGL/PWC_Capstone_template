import { useEffect, useState } from 'react';
import { messageFor } from './errors.ts';
import type { LoadStatus } from './types.ts';

export interface Loaded<T> {
  status: LoadStatus;
  data: T | null;
  error: string;
}

/**
 * Runs a loader when the component mounts and reports loading, ready or error. The loader must be a
 * stable function (one of the functions exported by the api folder), or it would run on every render.
 * A result that arrives after the component has gone, or the loader has changed, is ignored.
 */
export function useLoad<T>(loader: () => Promise<T>, enabled = true): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ status: 'loading', data: null, error: '' });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    setState((previous) => ({ ...previous, status: 'loading' }));

    loader()
      .then((data) => {
        if (!cancelled) {
          setState({ status: 'ready', data, error: '' });
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', data: null, error: messageFor(caught) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loader, enabled]);

  return state;
}
