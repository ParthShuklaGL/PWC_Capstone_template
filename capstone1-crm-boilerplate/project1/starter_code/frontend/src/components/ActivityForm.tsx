import { useState, type FormEvent } from 'react';
import { ApiError, createActivity } from '../api/crm.ts';
import type { Activity, ActivityType } from '../types.ts';

const TYPES: ActivityType[] = ['CALL', 'EMAIL', 'MEETING', 'NOTE'];

interface Props {
  contactRef: string;
  onLogged: (activity: Activity) => void;
}

export default function ActivityForm({ contactRef, onLogged }: Props) {
  const [type, setType] = useState<ActivityType>('CALL');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    setFields({});
    try {
      const logged = await createActivity(contactRef, {
        type,
        subject,
        notes: notes || undefined,
      });
      setSubject('');
      setNotes('');
      onLogged(logged);
    } catch (caught) {
      if (caught instanceof ApiError && caught.body?.fields) {
        setFields(caught.body.fields);
      } else {
        setMessage(caught instanceof Error ? caught.message : 'Could not log the activity');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="card shadow-sm mb-3" aria-label="Log an activity">
      <div className="card-body row g-2">
        <div className="col-sm-3">
          <label htmlFor="activity-type" className="form-label">
            Type
          </label>
          <select
            id="activity-type"
            className="form-select"
            value={type}
            onChange={(event) => setType(event.target.value as ActivityType)}
          >
            {TYPES.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0) + option.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="col-sm-9">
          <label htmlFor="activity-subject" className="form-label">
            Subject
          </label>
          <input
            id="activity-subject"
            className={`form-control ${fields.subject ? 'is-invalid' : ''}`}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
          {fields.subject && <div className="invalid-feedback">{fields.subject}</div>}
        </div>
        <div className="col-12">
          <label htmlFor="activity-notes" className="form-label">
            Notes
          </label>
          <textarea
            id="activity-notes"
            className="form-control"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        {message && (
          <div className="col-12">
            <div className="alert alert-danger mb-0" role="alert">
              {message}
            </div>
          </div>
        )}
        <div className="col-12">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Logging…' : 'Log activity'}
          </button>
        </div>
      </div>
    </form>
  );
}
