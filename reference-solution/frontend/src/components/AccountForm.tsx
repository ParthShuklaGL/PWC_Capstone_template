import { useState } from 'react';
import { accounts } from '../api/crm.ts';
import type { Account } from '../types.ts';
import { useFormState } from '../useFormState.ts';
import FormCard from './FormCard.tsx';
import { TextField } from './FormFields.tsx';

const KNOWN = ['name', 'industry', 'country', 'website'] as const;

/** Text the user left blank is sent as null, which is what the server stores for "none". */
const orNull = (text: string) => (text.trim() === '' ? null : text.trim());

interface Props {
  /** The account being edited, or null for a new one. */
  account: Account | null;
  onSaved: (saved: Account) => void;
  onCancel: () => void;
}

export default function AccountForm({ account, onSaved, onCancel }: Props) {
  const [name, setName] = useState(account?.name ?? '');
  const [industry, setIndustry] = useState(account?.industry ?? '');
  const [country, setCountry] = useState(account?.country ?? '');
  const [website, setWebsite] = useState(account?.website ?? '');
  const form = useFormState(KNOWN);

  function onSubmit() {
    // Only the rule the server also has and a person can see at a glance: a name is needed. Everything else
    // (length, a real web address) is the server's call, and its messages appear beside the input.
    if (!form.check(name.trim() === '' ? { name: 'Name is required.' } : {})) {
      return;
    }
    const input = { name: name.trim(), industry: orNull(industry), country: orNull(country), website: orNull(website) };
    void form.submit(() => (account ? accounts.update(account.id, input) : accounts.create(input)), onSaved);
  }

  return (
    <FormCard
      title={account ? 'Edit account' : 'New account'}
      submitLabel={account ? 'Save changes' : 'Create account'}
      busy={form.busy}
      general={form.general}
      onSubmit={onSubmit}
      onCancel={onCancel}
    >
      <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} error={form.fields.name} autoFocus />
      <TextField label="Industry" value={industry} onChange={(event) => setIndustry(event.target.value)} error={form.fields.industry} />
      <TextField label="Country" value={country} onChange={(event) => setCountry(event.target.value)} error={form.fields.country} />
      <TextField
        label="Website"
        placeholder="https://example.com"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        error={form.fields.website}
      />
    </FormCard>
  );
}
