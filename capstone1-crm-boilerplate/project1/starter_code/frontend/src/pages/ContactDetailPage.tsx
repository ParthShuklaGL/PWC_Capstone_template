import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchActivities, fetchContact, fetchContactDeals } from '../api/crm.ts';
import ActivityForm from '../components/ActivityForm.tsx';
import StageBadge from '../components/StageBadge.tsx';
import { formatDate, formatMoney, formatStatus } from '../constants.ts';
import type { Activity, ContactDetail, Deal, LoadStatus } from '../types.ts';

export default function ContactDetailPage() {
  const { contactRef } = useParams<{ contactRef: string }>();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!contactRef) {
      return;
    }

    let cancelled = false;
    setStatus('loading');

    Promise.all([
      fetchContact(contactRef),
      fetchActivities(contactRef),
      fetchContactDeals(contactRef),
    ])
      .then(([loadedContact, loadedActivities, loadedDeals]) => {
        if (cancelled) {
          return;
        }
        setContact(loadedContact);
        setActivities(loadedActivities);
        setDeals(loadedDeals);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return;
        }
        setError(caught instanceof Error ? caught.message : 'Could not load this contact');
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [contactRef]);

  if (status === 'loading') {
    return <p className="notice">Loading…</p>;
  }

  if (status === 'error' || !contact) {
    return (
      <p className="notice notice--error" role="alert">
        {error || 'Could not load this contact'}
      </p>
    );
  }

  return (
    <section>
      <p className="crumb">
        <Link to="/contacts">← All contacts</Link>
      </p>

      <h1>
        {contact.firstName} {contact.lastName}
      </h1>
      <p className="subtitle">
        {contact.jobTitle ?? 'No job title recorded'} at {contact.account.name}
      </p>

      <dl className="detail">
        <dt>Reference</dt>
        <dd>{contact.contactRef}</dd>

        <dt>Email</dt>
        <dd>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </dd>

        <dt>Phone</dt>
        <dd>{contact.phone ?? '—'}</dd>

        <dt>Status</dt>
        <dd>
          <span className={`badge badge--${contact.status.toLowerCase()}`}>
            {formatStatus(contact.status)}
          </span>
        </dd>

        <dt>Last contacted</dt>
        <dd>{formatDate(contact.lastContactedAt)}</dd>

        <dt>Account</dt>
        <dd>
          {contact.account.name}
          {contact.account.industry ? ` — ${contact.account.industry}` : ''}
        </dd>
      </dl>

      <h2>Deals</h2>
      {deals.length === 0 ? (
        <p className="notice">No deals for this contact yet.</p>
      ) : (
        <ul className="list-group mb-3">
          {deals.map((deal) => (
            <li
              key={deal.dealRef}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <Link to={`/deals/${deal.dealRef}`}>{deal.title}</Link>
              <span className="d-flex align-items-center gap-3">
                <span>{formatMoney(deal.value)}</span>
                <StageBadge stage={deal.stage} />
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2>Activity</h2>
      <ActivityForm
        contactRef={contact.contactRef}
        onLogged={(logged) => setActivities((current) => [logged, ...current])}
      />
      {activities.length === 0 ? (
        <p className="notice">Nothing logged against this contact yet.</p>
      ) : (
        <ul className="activity">
          {activities.map((activity) => (
            <li key={activity.id} className="activity__item">
              <span className="activity__type">{activity.type}</span>
              <span className="activity__date">{formatDate(activity.occurredAt)}</span>
              <p className="activity__subject">{activity.subject}</p>
              {activity.notes && <p className="activity__notes">{activity.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
