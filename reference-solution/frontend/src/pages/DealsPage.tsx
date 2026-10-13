import { useCallback, useState } from 'react';
import { contacts, CRM_PAGE_SIZE, deals, fetchAllAccounts } from '../api/crm.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import Banner from '../components/Banner.tsx';
import ConfirmDialog from '../components/ConfirmDialog.tsx';
import DealForm from '../components/DealForm.tsx';
import ListState from '../components/ListState.tsx';
import LostReasonDialog from '../components/LostReasonDialog.tsx';
import Pager from '../components/Pager.tsx';
import PipelineSummary from '../components/PipelineSummary.tsx';
import SearchBar from '../components/SearchBar.tsx';
import { messageFor } from '../errors.ts';
import { formatDate, formatMoney, titleCase } from '../format.ts';
import { DEAL_STAGES, type Deal, type DealStage } from '../types.ts';
import { useDeleteFlow } from '../useDeleteFlow.ts';
import { useClampPage, useListParams } from '../useListParams.ts';
import { useLoad } from '../useLoad.ts';

const FILTERS = ['search', 'stage', 'accountId', 'contactId'] as const;

/**
 * Deals: a pipeline summary on top, then the list with search and filters, create, edit, a quick stage
 * change on every row, and (ADMIN only) delete.
 */
export default function DealsPage() {
  const { me } = useAuth();
  const isAdmin = me?.role === 'ADMIN';
  const { values, page, setFilter, setPage } = useListParams(FILTERS);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<Deal | 'new' | null>(null);
  const [losing, setLosing] = useState<Deal | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [problem, setProblem] = useState('');

  const accountList = useLoad(fetchAllAccounts);
  const contactId = Number(values.contactId) || 0;
  const loadContact = useCallback(() => contacts.get(contactId), [contactId]);
  const filterContact = useLoad(loadContact, contactId > 0);

  const load = useCallback(
    () => deals.list({ page, search: values.search, stage: values.stage as DealStage | '', accountId: values.accountId, contactId: values.contactId }),
    [page, values.search, values.stage, values.accountId, values.contactId, version],
  );
  const { status, data, error } = useLoad(load);
  useClampPage(data, page, CRM_PAGE_SIZE, setPage);

  // Any change to a deal also changes the pipeline figures, so both are fetched again.
  const reload = () => setVersion((current) => current + 1);
  const removal = useDeleteFlow<Deal>(deals.remove, (row) => {
    setNotice(`Deleted deal ${row.title}.`);
    reload();
  });

  function onSaved(saved: Deal) {
    setNotice(editing === 'new' ? `Created deal ${saved.title}.` : `Saved deal ${saved.title}.`);
    setEditing(null);
    reload();
  }

  /** Quick stage change: the same PUT the edit form sends, with only the stage different. */
  async function changeStage(deal: Deal, stage: DealStage) {
    if (stage === deal.stage) {
      return;
    }
    if (stage === 'LOST') {
      setLosing(deal);
      return;
    }
    setSavingId(deal.id);
    setProblem('');
    try {
      const saved = await deals.update(deal.id, {
        contactId: deal.contactId,
        title: deal.title,
        value: deal.value,
        expectedCloseDate: deal.expectedCloseDate,
        stage,
        lostReason: null,
      });
      setNotice(`Moved ${saved.title} to ${titleCase(saved.stage)}.`);
      reload();
    } catch (caught) {
      setProblem(messageFor(caught));
    } finally {
      setSavingId(null);
    }
  }

  function onLost(saved: Deal) {
    setLosing(null);
    setNotice(`Moved ${saved.title} to Lost.`);
    reload();
  }

  const rows = data?.items ?? [];
  const filtered = Boolean(values.search || values.stage || values.accountId || values.contactId);

  return (
    <section>
      <div className="page-head">
        <h1>Deals</h1>
        <button type="button" className="primary" onClick={() => setEditing('new')} disabled={editing !== null}>
          New deal
        </button>
      </div>

      <PipelineSummary version={version} active={values.stage} onPick={(stage) => setFilter({ stage })} />

      <Banner kind="ok" message={notice} onDismiss={() => setNotice('')} />
      <Banner kind="error" message={problem || removal.error} onDismiss={() => (problem ? setProblem('') : removal.dismissError())} />

      {editing !== null && (
        <DealForm
          key={editing === 'new' ? 'new' : editing.id}
          deal={editing === 'new' ? null : editing}
          defaultContactId={contactId > 0 ? contactId : undefined}
          onSaved={onSaved}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="filters">
        <SearchBar key={values.search} label="Search deals" placeholder="Search by title" value={values.search} onSearch={(text) => setFilter({ search: text })} />
        <div className="field field--inline">
          <label htmlFor="filter-stage">Stage</label>
          <select id="filter-stage" value={values.stage} onChange={(event) => setFilter({ stage: event.target.value })}>
            <option value="">All stages</option>
            {DEAL_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {titleCase(stage)}
              </option>
            ))}
          </select>
        </div>
        <div className="field field--inline">
          <label htmlFor="filter-account">Account</label>
          <select id="filter-account" value={values.accountId} onChange={(event) => setFilter({ accountId: event.target.value })}>
            <option value="">All accounts</option>
            {(accountList.data ?? []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        {contactId > 0 && (
          <span className="chip">
            Contact: {filterContact.data ? `${filterContact.data.firstName} ${filterContact.data.lastName}` : `#${contactId}`}
            <button type="button" className="link" onClick={() => setFilter({ contactId: '' })} aria-label="Remove the contact filter">
              Remove
            </button>
          </span>
        )}
        {filtered && (
          <button type="button" className="link" onClick={() => setFilter({ search: '', stage: '', accountId: '', contactId: '' })}>
            Clear filters
          </button>
        )}
      </div>

      <div className="card">
        <ListState
          status={status}
          error={error}
          hasData={data !== null}
          isEmpty={rows.length === 0}
          emptyText={filtered ? 'No deals match these filters.' : 'No deals yet. Create the first one.'}
        >
          <table className="stacked">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Contact</th>
                <th scope="col">Account</th>
                <th scope="col" className="num">Value</th>
                <th scope="col">Expected close</th>
                <th scope="col">Stage</th>
                <th scope="col">Closed</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((deal) => (
                <tr key={deal.id}>
                  <td data-label="">
                    {deal.title}
                    {deal.lostReason && <div className="muted">Lost: {deal.lostReason}</div>}
                  </td>
                  <td data-label="Contact">{deal.contactName}</td>
                  <td data-label="Account">{deal.accountName}</td>
                  <td className="num" data-label="Value">{formatMoney(deal.value)}</td>
                  <td data-label="Expected close">{formatDate(deal.expectedCloseDate)}</td>
                  <td data-label="Stage">
                    <select
                      className="stage-select"
                      value={deal.stage}
                      aria-label={`Stage of ${deal.title}`}
                      disabled={savingId === deal.id}
                      onChange={(event) => void changeStage(deal, event.target.value as DealStage)}
                    >
                      {DEAL_STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {titleCase(stage)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td data-label="Closed">{deal.closedDate ? formatDate(deal.closedDate) : '—'}</td>
                  <td className="row-actions" data-label="">
                    <button type="button" onClick={() => setEditing(deal)} aria-label={`Edit ${deal.title}`}>
                      Edit
                    </button>
                    {isAdmin && (
                      <button type="button" className="danger" onClick={() => removal.ask(deal)} aria-label={`Delete ${deal.title}`}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ListState>
      </div>

      {data && data.total > 0 && <Pager page={page} size={CRM_PAGE_SIZE} total={data.total} busy={status === 'loading'} onPage={setPage} />}

      {losing && <LostReasonDialog deal={losing} onSaved={onLost} onCancel={() => setLosing(null)} />}

      {removal.target && (
        <ConfirmDialog title="Delete this deal?" confirmLabel="Delete deal" busy={removal.busy} onConfirm={() => void removal.confirm()} onCancel={removal.cancel}>
          <p>
            <strong>{removal.target.title}</strong> will be removed for good.
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
