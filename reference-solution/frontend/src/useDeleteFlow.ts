import { useState } from 'react';
import { messageFor } from './errors.ts';

/**
 * Delete with a question first. `ask` opens the confirm dialog for a row, `confirm` sends the DELETE and
 * `onDeleted` runs after the server says 204. When the server refuses (409 because the row still has
 * contacts or history, 403 for a plain USER, 404 if it is already gone) its message is kept in `error`
 * for the screen to show; nothing is removed from the list until the server agrees.
 */
export function useDeleteFlow<T extends { id: number }>(remove: (id: number) => Promise<void>, onDeleted: (row: T) => void) {
  const [target, setTarget] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    if (!target) {
      return;
    }
    setBusy(true);
    try {
      await remove(target.id);
      onDeleted(target);
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(false);
      setTarget(null);
    }
  }

  return {
    target,
    busy,
    error,
    ask: (row: T) => {
      setError('');
      setTarget(row);
    },
    cancel: () => setTarget(null),
    confirm,
    dismissError: () => setError(''),
  };
}
