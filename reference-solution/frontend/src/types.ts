/**
 * The shapes the API returns. These are claims, not guarantees: nothing checks at runtime that the
 * server really sent this, so keep them in step with the backend (see nimbus_crm/README.md).
 */

export type Role = 'USER' | 'ADMIN';

/** The three ways to sign in. The server also accepts none and uses its configured default. */
export type AuthMode = 'Jwt' | 'Cookie' | 'Session';

/** Which credential the server used for a request. */
export type AuthenticatedVia = 'Bearer' | 'Cookies' | 'Session';

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface LoginResponse {
  user: User;
  mode: AuthMode;
  accessToken: string | null;
  expiresAt: string | null;
}

export interface Me {
  id: number;
  username: string;
  role: Role;
  authenticatedVia: AuthenticatedVia;
}

export interface CsrfToken {
  headerName: string;
  token: string;
}

export interface DealStageRow {
  stage: string;
  deals: number;
  totalValue: number;
}

export interface AccountContactsRow {
  accountId: number;
  account: string;
  contacts: number;
}

export interface UserActivitiesRow {
  userId: number;
  username: string;
  activities: number;
}

export interface RoleUsersRow {
  role: string;
  users: number;
}

/** An RFC 9457 problem document, the one error format every endpoint uses. */
export interface ProblemDocument {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  /** Machine-readable reason, such as USERNAME_TAKEN or CSRF_TOKEN_INVALID. */
  code?: string;
  /** Present on a 400: messages per property, keyed by property name. */
  errors?: Record<string, string[]>;
  traceId?: string;
}

/** Every screen is in exactly one of these states. */
export type LoadStatus = 'loading' | 'ready' | 'error';

/** One page of a list from the accounts, contacts and deals endpoints. `page` is 0 based. */
export interface Paged<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

export interface Account {
  id: number;
  name: string;
  industry: string | null;
  country: string | null;
  website: string | null;
  createdAt: string;
  contactCount: number;
}

/** The fields a caller may set on an account. Empty optional text is sent as null. */
export interface AccountInput {
  name: string;
  industry: string | null;
  country: string | null;
  website: string | null;
}

export const CONTACT_STATUSES = ['PROSPECT', 'CUSTOMER', 'CHURNED'] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export interface Contact {
  id: number;
  accountId: number;
  accountName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  status: ContactStatus;
  lastContactedAt: string | null;
  createdAt: string;
}

export interface ContactInput {
  accountId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  status: ContactStatus;
}

/** In pipeline order, the same order the deals-by-stage report uses. */
export const DEAL_STAGES = ['PROSPECTING', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

export interface Deal {
  id: number;
  contactId: number;
  contactName: string;
  accountId: number;
  accountName: string;
  title: string;
  value: number;
  /** yyyy-MM-dd */
  expectedCloseDate: string;
  stage: DealStage;
  /** Set by the server when the deal becomes WON or LOST; never sent. yyyy-MM-dd */
  closedDate: string | null;
  lostReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The fields a caller may set on a deal. The server owns closedDate. */
export interface DealInput {
  contactId: number;
  title: string;
  value: number;
  expectedCloseDate: string;
  stage: DealStage;
  lostReason: string | null;
}
