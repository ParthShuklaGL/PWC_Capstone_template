import type { ReactNode } from 'react';
import type { LoadStatus } from '../types.ts';

interface Props {
  status: LoadStatus;
  error: string;
  /** True once there is a page of rows to show (it may be the previous page while the next one loads). */
  hasData: boolean;
  isEmpty: boolean;
  emptyText: string;
  children: ReactNode;
}

/**
 * The loading, error and empty states every list has, so a list that fails or has no rows says so
 * instead of showing a blank card. While a new page loads the old rows stay, dimmed, to avoid a flash.
 */
export default function ListState({ status, error, hasData, isEmpty, emptyText, children }: Props) {
  if (status === 'error') {
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  }
  if (!hasData) {
    return <p className="notice">Loading…</p>;
  }
  if (isEmpty) {
    return <p className="notice">{emptyText}</p>;
  }
  return (
    <div className={status === 'loading' ? 'table-scroll is-busy' : 'table-scroll'} aria-busy={status === 'loading'}>
      {children}
    </div>
  );
}
