interface Props {
  kind: 'error' | 'ok';
  message: string;
  onDismiss: () => void;
}

/** A message about something that just happened (a save, a refused delete). Errors are announced as alerts. */
export default function Banner({ kind, message, onDismiss }: Props) {
  if (!message) {
    return null;
  }
  return (
    <div className={`banner banner--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span>{message}</span>
      <button type="button" className="link" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
