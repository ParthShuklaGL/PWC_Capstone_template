import { useState } from 'react';
import { contacts, fetchAllAccounts } from '../api/crm.ts';
import { CONTACT_STATUSES, type Contact, type ContactStatus } from '../types.ts';
import { titleCase } from '../format.ts';
import { useFormState } from '../useFormState.ts';
import { useLoad } from '../useLoad.ts';
import FormCard from './FormCard.tsx';
import { SelectField, TextField } from './FormFields.tsx';

const KNOWN = ['accountid', 'firstname', 'lastname', 'email', 'phone', 'jobtitle', 'status'] as const;

const orNull = (text: string) => (text.trim() === '' ? null : text.trim());

interface Props {
  contact: Contact | null;
  /** The account to preselect on a new contact, such as the one the list is filtered to. */
  defaultAccountId?: number;
  onSaved: (saved: Contact) => void;
  onCancel: () => void;
}

export default function ContactForm({ contact, defaultAccountId, onSaved, onCancel }: Props) {
  const accountList = useLoad(fetchAllAccounts);
  const [accountId, setAccountId] = useState(String(contact?.accountId ?? defaultAccountId ?? ''));
  const [firstName, setFirstName] = useState(contact?.firstName ?? '');
  const [lastName, setLastName] = useState(contact?.lastName ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [jobTitle, setJobTitle] = useState(contact?.jobTitle ?? '');
  const [status, setStatus] = useState<ContactStatus>(contact?.status ?? 'PROSPECT');
  const form = useFormState(KNOWN);

  function onSubmit() {
    const problems: Record<string, string> = {};
    if (accountId === '') problems.accountid = 'Choose an account.';
    if (firstName.trim() === '') problems.firstname = 'First name is required.';
    if (lastName.trim() === '') problems.lastname = 'Last name is required.';
    if (email.trim() === '') problems.email = 'Email is required.';
    if (!form.check(problems)) {
      return;
    }
    const input = {
      accountId: Number(accountId),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: orNull(phone),
      jobTitle: orNull(jobTitle),
      status,
    };
    void form.submit(() => (contact ? contacts.update(contact.id, input) : contacts.create(input)), onSaved);
  }

  return (
    <FormCard
      title={contact ? 'Edit contact' : 'New contact'}
      submitLabel={contact ? 'Save changes' : 'Create contact'}
      busy={form.busy}
      general={form.general || (accountList.status === 'error' ? accountList.error : '')}
      blocked={accountList.status !== 'ready'}
      onSubmit={onSubmit}
      onCancel={onCancel}
    >
      <SelectField label="Account" value={accountId} onChange={(event) => setAccountId(event.target.value)} error={form.fields.accountid}>
        <option value="">{accountList.status === 'loading' ? 'Loading accounts…' : 'Choose an account'}</option>
        {(accountList.data ?? []).map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </SelectField>
      <SelectField label="Status" value={status} onChange={(event) => setStatus(event.target.value as ContactStatus)} error={form.fields.status}>
        {CONTACT_STATUSES.map((value) => (
          <option key={value} value={value}>
            {titleCase(value)}
          </option>
        ))}
      </SelectField>
      <TextField label="First name" value={firstName} onChange={(event) => setFirstName(event.target.value)} error={form.fields.firstname} />
      <TextField label="Last name" value={lastName} onChange={(event) => setLastName(event.target.value)} error={form.fields.lastname} />
      <TextField label="Email" value={email} onChange={(event) => setEmail(event.target.value)} error={form.fields.email} />
      <TextField label="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} error={form.fields.phone} />
      <TextField label="Job title" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} error={form.fields.jobtitle} />
    </FormCard>
  );
}
