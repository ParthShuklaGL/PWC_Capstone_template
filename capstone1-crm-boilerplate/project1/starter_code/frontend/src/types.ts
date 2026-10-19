/**
 * The shapes the API returns.
 *
 * These are claims, not guarantees — nothing checks at runtime that the server
 * actually sent this. If the backend changes a field, TypeScript will keep
 * believing this file until someone updates it.
 */

export type ContactStatus = 'PROSPECT' | 'CUSTOMER' | 'CHURNED';

export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';

export interface ContactSummary {
  contactRef: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  status: ContactStatus;
  accountRef: string | null;
  accountName: string | null;
}

export interface Account {
  accountRef: string;
  name: string;
  industry: string | null;
  country: string | null;
  website: string | null;
}

export interface ContactDetail {
  contactRef: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  status: ContactStatus;
  lastContactedAt: string | null;
  account: Account;
}

export interface Activity {
  id: number;
  type: ActivityType;
  subject: string;
  notes: string | null;
  occurredAt: string;
}

export interface ActivityCreateInput {
  type: ActivityType;
  subject: string;
  notes?: string;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ApiErrorBody {
  error: string;
  message?: string;
  fields?: Record<string, string>;
}

export type DealStage =
  | 'PROSPECTING'
  | 'QUALIFIED'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';

/** Money is a number in GBP; dates are yyyy-MM-dd strings. */
export interface Deal {
  dealRef: string;
  title: string;
  value: number;
  currency: string;
  expectedCloseDate: string;
  stage: DealStage;
  closedDate: string | null;
  lostReason: string | null;
  accountRef: string;
  accountName: string;
  contactRef: string;
  contactName: string;
  contactStatus: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DealInput {
  title: string;
  /** Left out when the field is blank, so the server can say it is required. */
  value?: number;
  expectedCloseDate?: string;
}

export interface DealCreateInput extends DealInput {
  accountRef: string;
  contactRef: string;
}

export interface StageMoveInput {
  stage: DealStage;
  closeDate?: string;
  lostReason?: string;
}

export interface StageTotal {
  stage: DealStage;
  count: number;
  totalValue: number;
}

export interface DealSummary {
  stages: StageTotal[];
  openCount: number;
  openValue: number;
  currency: string;
}

export interface DealHistoryEntry {
  fromStage: DealStage | null;
  toStage: DealStage;
  changedAt: string;
}

/** Every screen in this app is in exactly one of these states. */
export type LoadStatus = 'loading' | 'ready' | 'error';
