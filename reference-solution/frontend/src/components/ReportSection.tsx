import { useState, type ReactNode } from 'react';
import { downloadCsv, type ReportName } from '../api/reports.ts';
import { messageFor } from '../errors.ts';
import type { LoadStatus } from '../types.ts';

interface Props {
  title: string;
  description: string;
  csv: ReportName;
  status: LoadStatus;
  error: string;
  isEmpty: boolean;
  emptyText: string;
  children: ReactNode;
}

/**
 * One report: a heading, a CSV button, and its own loading, empty and error states, so a report that
 * fails does not blank the page.
 */
export default function ReportSection({ title, description, csv, status, error, isEmpty, emptyText, children }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  async function onDownload() {
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadCsv(csv);
    } catch (caught) {
      setDownloadError(messageFor(caught));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="card report">
      <div className="report__head">
        <div>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </div>
        <button type="button" onClick={onDownload} disabled={downloading || status !== 'ready'}>
          {downloading ? 'Preparing…' : 'Download CSV'}
        </button>
      </div>

      {downloadError && (
        <p className="error" role="alert">
          {downloadError}
        </p>
      )}
      {status === 'loading' && <p className="notice">Loading…</p>}
      {status === 'error' && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {status === 'ready' && isEmpty && <p className="notice">{emptyText}</p>}
      {status === 'ready' && !isEmpty && children}
    </section>
  );
}
