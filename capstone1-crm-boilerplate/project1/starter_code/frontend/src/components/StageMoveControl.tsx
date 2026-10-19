import { useState, type FormEvent } from 'react';
import { ApiError, moveDealStage } from '../api/crm.ts';
import { STAGES, formatStage, isOpenStage, stageErrorMessages } from '../constants.ts';
import type { Deal, DealStage } from '../types.ts';

interface Props {
  deal: Deal;
  onMoved: (deal: Deal) => void;
}

/**
 * The server owns the stage rules. This control only hides moves that can never work,
 * and shows whatever the server says when it refuses one.
 */
function reasonableTargets(from: DealStage): DealStage[] {
  const index = STAGES.indexOf(from);
  const targets: DealStage[] = [];
  if (index > 0) targets.push(STAGES[index - 1]);
  if (index < 3) targets.push(STAGES[index + 1]);
  if (from === 'NEGOTIATION') targets.push('WON');
  targets.push('LOST');
  return targets;
}

export default function StageMoveControl({ deal, onMoved }: Props) {
  const [target, setTarget] = useState<DealStage | ''>('');
  const [closeDate, setCloseDate] = useState(new Date().toISOString().slice(0, 10));
  const [lostReason, setLostReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});

  if (!isOpenStage(deal.stage)) {
    return (
      <div className="alert alert-secondary mb-0" role="status">
        This deal is <strong>{formatStage(deal.stage)}</strong>. Closed deals are final, so no
        further stage moves are possible.
      </div>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!target || busy) return;
    setBusy(true);
    setMessage('');
    setFields({});
    try {
      const moved = await moveDealStage(deal.dealRef, {
        stage: target,
        closeDate: target === 'WON' ? closeDate : undefined,
        lostReason: target === 'LOST' ? lostReason : undefined,
      });
      setTarget('');
      setLostReason('');
      onMoved(moved);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFields(caught.body?.fields ?? {});
        const code = caught.body?.error ?? '';
        setMessage(
          stageErrorMessages[code] && !caught.body?.message
            ? stageErrorMessages[code]
            : (caught.body?.message ?? stageErrorMessages[code] ?? caught.message),
        );
      } else {
        setMessage('Could not reach the server. Nothing was changed.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="row g-2 align-items-end">
        <div className="col-sm-4">
          <label htmlFor="stage-target" className="form-label">
            Move to
          </label>
          <select
            id="stage-target"
            className="form-select"
            value={target}
            onChange={(event) => setTarget(event.target.value as DealStage | '')}
          >
            <option value="">Choose a stage…</option>
            {reasonableTargets(deal.stage).map((stage) => (
              <option key={stage} value={stage}>
                {formatStage(stage)}
              </option>
            ))}
          </select>
        </div>

        {target === 'WON' && (
          <div className="col-sm-4">
            <label htmlFor="close-date" className="form-label">
              Close date
            </label>
            <input
              id="close-date"
              type="date"
              className={`form-control ${fields.closeDate ? 'is-invalid' : ''}`}
              value={closeDate}
              onChange={(event) => setCloseDate(event.target.value)}
            />
            {fields.closeDate && <div className="invalid-feedback">{fields.closeDate}</div>}
          </div>
        )}

        {target === 'LOST' && (
          <div className="col-sm-4">
            <label htmlFor="lost-reason" className="form-label">
              Reason for losing
            </label>
            <input
              id="lost-reason"
              className={`form-control ${fields.lostReason ? 'is-invalid' : ''}`}
              value={lostReason}
              maxLength={500}
              onChange={(event) => setLostReason(event.target.value)}
            />
            {fields.lostReason && <div className="invalid-feedback">{fields.lostReason}</div>}
          </div>
        )}

        <div className="col-sm-auto">
          <button type="submit" className="btn btn-primary" disabled={!target || busy}>
            {busy ? 'Moving…' : 'Move deal'}
          </button>
        </div>
      </div>

      {message && (
        <div className="alert alert-danger mt-3 mb-0" role="alert">
          {message}
        </div>
      )}
    </form>
  );
}
