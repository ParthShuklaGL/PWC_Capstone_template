import { useState } from 'react';
import { deals } from '../api/crm.ts';
import type { Deal } from '../types.ts';
import { useFormState } from '../useFormState.ts';
import { LOST_REASON_REQUIRED } from './DealForm.tsx';
import { TextField } from './FormFields.tsx';

interface Props {
  deal: Deal;
  onSaved: (saved: Deal) => void;
  onCancel: () => void;
}

/** Moving a deal to Lost needs a reason, so the quick stage change asks for it before it saves. */
export default function LostReasonDialog({ deal, onSaved, onCancel }: Props) {
  const [reason, setReason] = useState('');
  const form = useFormState(['lostreason']);

  function onSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!form.check(reason.trim() === '' ? { lostreason: LOST_REASON_REQUIRED } : {})) {
      return;
    }
    void form.submit(
      () =>
        deals.update(deal.id, {
          contactId: deal.contactId,
          title: deal.title,
          value: deal.value,
          expectedCloseDate: deal.expectedCloseDate,
          stage: 'LOST',
          lostReason: reason.trim(),
        }),
      onSaved,
    );
  }

  return (
    <div className="overlay">
      <form className="dialog card form" role="dialog" aria-modal="true" aria-labelledby="lost-title" onSubmit={onSubmit} noValidate>
        <h2 id="lost-title">Mark {deal.title} as lost</h2>
        <TextField label="Lost reason (required)" value={reason} onChange={(event) => setReason(event.target.value)} error={form.fields.lostreason} autoFocus />
        {form.general && (
          <p className="error" role="alert">
            {form.general}
          </p>
        )}
        <div className="actions">
          <button type="submit" className="primary" disabled={form.busy}>
            {form.busy ? 'Saving…' : 'Mark as lost'}
          </button>
          <button type="button" onClick={onCancel} disabled={form.busy}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
