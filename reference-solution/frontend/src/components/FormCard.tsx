import type { FormEvent, ReactNode } from 'react';

interface Props {
  title: string;
  submitLabel: string;
  busy: boolean;
  /** A message that belongs to no single input: a 404, 409, 403 or an unreadable request. */
  general: string;
  /** Disables the submit button for a reason other than saving, such as a picker that failed to load. */
  blocked?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  children: ReactNode;
}

/** The frame every create and edit form shares: heading, fields, one general error, submit and cancel. */
export default function FormCard({ title, submitLabel, busy, general, blocked = false, onSubmit, onCancel, children }: Props) {
  function handle(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="card form" onSubmit={handle} noValidate aria-label={title}>
      <h2>{title}</h2>
      <div className="form-grid">{children}</div>
      {general && (
        <p className="error" role="alert">
          {general}
        </p>
      )}
      <div className="actions">
        <button type="submit" className="primary" disabled={busy || blocked}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
