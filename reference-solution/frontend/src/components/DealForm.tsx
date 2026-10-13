import { useState } from 'react';
import { deals, fetchAllContacts } from '../api/crm.ts';
import { titleCase } from '../format.ts';
import { DEAL_STAGES, type Deal, type DealStage } from '../types.ts';
import { useFormState } from '../useFormState.ts';
import { useLoad } from '../useLoad.ts';
import FormCard from './FormCard.tsx';
import { SelectField, TextField } from './FormFields.tsx';

const KNOWN = ['contactid', 'title', 'value', 'expectedclosedate', 'stage'] as const;
/** The reason has an input only while the stage is Lost; otherwise a message about it must not be lost. */
const KNOWN_WHEN_LOST = [...KNOWN, 'lostreason'] as const;

/** The server's own wording, so the browser and the server say the same thing. */
export const LOST_REASON_REQUIRED = 'Say why the deal was lost.';

interface Props {
  deal: Deal | null;
  /** The contact to preselect on a new deal, such as the one the list is filtered to. */
  defaultContactId?: number;
  onSaved: (saved: Deal) => void;
  onCancel: () => void;
}

export default function DealForm({ deal, defaultContactId, onSaved, onCancel }: Props) {
  const contactList = useLoad(fetchAllContacts);
  const [contactId, setContactId] = useState(String(deal?.contactId ?? defaultContactId ?? ''));
  const [title, setTitle] = useState(deal?.title ?? '');
  const [value, setValue] = useState(deal ? String(deal.value) : '');
  const [expectedCloseDate, setExpectedCloseDate] = useState(deal?.expectedCloseDate ?? '');
  const [stage, setStage] = useState<DealStage>(deal?.stage ?? 'PROSPECTING');
  const [lostReason, setLostReason] = useState(deal?.lostReason ?? '');
  const isLost = stage === 'LOST';
  const form = useFormState(isLost ? KNOWN_WHEN_LOST : KNOWN);

  function onSubmit() {
    const problems: Record<string, string> = {};
    if (contactId === '') problems.contactid = 'Choose a contact.';
    if (title.trim() === '') problems.title = 'Title is required.';
    if (value.trim() === '' || Number.isNaN(Number(value))) problems.value = 'Enter the value as a number.';
    if (expectedCloseDate === '') problems.expectedclosedate = 'Choose the expected close date.';
    if (isLost && lostReason.trim() === '') problems.lostreason = LOST_REASON_REQUIRED;
    if (!form.check(problems)) {
      return;
    }
    // closedDate is never sent: the server stamps it when the deal reaches Won or Lost and clears it on reopening.
    const input = {
      contactId: Number(contactId),
      title: title.trim(),
      value: Number(value),
      expectedCloseDate,
      stage,
      lostReason: isLost ? lostReason.trim() : null,
    };
    void form.submit(() => (deal ? deals.update(deal.id, input) : deals.create(input)), onSaved);
  }

  return (
    <FormCard
      title={deal ? 'Edit deal' : 'New deal'}
      submitLabel={deal ? 'Save changes' : 'Create deal'}
      busy={form.busy}
      general={form.general || (contactList.status === 'error' ? contactList.error : '')}
      blocked={contactList.status !== 'ready'}
      onSubmit={onSubmit}
      onCancel={onCancel}
    >
      <TextField label="Title" value={title} onChange={(event) => setTitle(event.target.value)} error={form.fields.title} autoFocus />
      <SelectField label="Contact" value={contactId} onChange={(event) => setContactId(event.target.value)} error={form.fields.contactid}>
        <option value="">{contactList.status === 'loading' ? 'Loading contacts…' : 'Choose a contact'}</option>
        {(contactList.data ?? []).map((contact) => (
          <option key={contact.id} value={contact.id}>
            {contact.firstName} {contact.lastName} ({contact.accountName})
          </option>
        ))}
      </SelectField>
      <TextField
        label="Value (GBP)"
        type="number"
        inputMode="decimal"
        step="0.01"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        error={form.fields.value}
      />
      <TextField
        label="Expected close date"
        type="date"
        value={expectedCloseDate}
        onChange={(event) => setExpectedCloseDate(event.target.value)}
        error={form.fields.expectedclosedate}
      />
      <SelectField label="Stage" value={stage} onChange={(event) => setStage(event.target.value as DealStage)} error={form.fields.stage}>
        {DEAL_STAGES.map((option) => (
          <option key={option} value={option}>
            {titleCase(option)}
          </option>
        ))}
      </SelectField>
      {isLost && (
        <TextField
          label="Lost reason (required)"
          value={lostReason}
          onChange={(event) => setLostReason(event.target.value)}
          error={form.fields.lostreason}
          autoFocus
        />
      )}
    </FormCard>
  );
}
