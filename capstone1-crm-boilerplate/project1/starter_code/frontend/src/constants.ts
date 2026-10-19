import type { ContactStatus, DealStage } from './types.ts';

export const STAGES: DealStage[] = [
  'PROSPECTING',
  'QUALIFIED',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
];

export const STAGE_LABELS: Record<DealStage, string> = {
  PROSPECTING: 'Prospecting',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
  LOST: 'Lost',
};

/** Bootstrap colour per stage. */
export const STAGE_COLOURS: Record<DealStage, string> = {
  PROSPECTING: 'secondary',
  QUALIFIED: 'info',
  PROPOSAL: 'primary',
  NEGOTIATION: 'warning',
  WON: 'success',
  LOST: 'danger',
};

export function formatStage(stage: DealStage): string {
  return STAGE_LABELS[stage] ?? stage;
}

export function isOpenStage(stage: DealStage): boolean {
  return stage !== 'WON' && stage !== 'LOST';
}

const GBP = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export function formatMoney(value: number): string {
  return GBP.format(value);
}

/** One place that turns a server error code into a sentence a salesperson can act on. */
export const stageErrorMessages: Record<string, string> = {
  DEAL_STAGE_TRANSITION_INVALID: 'That move is not allowed from the deal\u2019s current stage.',
  DEAL_CLOSED: 'This deal is closed. Won and Lost deals cannot be changed.',
  DEAL_DELETE_NOT_ALLOWED: 'Only a deal still in Prospecting can be deleted.',
  DEAL_NOT_FOUND: 'That deal no longer exists.',
};

export const PAGE_SIZE = 20;

export const STATUS_FILTERS = ['ALL', 'PROSPECT', 'CUSTOMER', 'CHURNED'] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const STATUS_LABELS: Record<ContactStatus, string> = {
  PROSPECT: 'Prospect',
  CUSTOMER: 'Customer',
  CHURNED: 'Churned',
};

export const FILTER_LABELS: Record<StatusFilter, string> = {
  ALL: 'Everyone',
  PROSPECT: 'Prospects',
  CUSTOMER: 'Customers',
  CHURNED: 'Churned',
};

export function formatStatus(status: ContactStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function formatDate(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
