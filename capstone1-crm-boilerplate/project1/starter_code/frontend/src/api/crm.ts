import { getToken, notifyUnauthorized } from '../auth/session.ts';
import type {
  Account,
  AccountInput,
  Activity,
  ActivityCreateInput,
  ApiErrorBody,
  ContactCreateInput,
  ContactDetail,
  ContactSummary,
  ContactUpdateInput,
  LoginResponse,
  User,
  Deal,
  DealCreateInput,
  DealHistoryEntry,
  DealInput,
  DealSummary,
  PageResponse,
  StageMoveInput,
} from '../types.ts';

/**
 * Every call to the backend goes through this file.
 *
 * Components do not call fetch directly — if you need a new endpoint, add it here so
 * there is one place that knows what the API looks like.
 */

const BASE_URL = '/api';

export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // The bearer token goes on every call from here, so no component ever handles it.
  const token = getToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  // 401 means the session is over (expired, or never started). Sign-in itself answers
  // 401 for a wrong password, which the login form shows instead.
  if (response.status === 401 && path !== '/auth/login') {
    notifyUnauthorized();
  }

  if (!response.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = null;
    }
    throw new ApiError(
      response.status,
      body,
      body?.message ?? body?.error ?? `Request failed with ${response.status}`,
    );
  }

  // DELETE answers 204 No Content: there is no body to parse.
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function fetchMe(): Promise<User> {
  return request<User>('/auth/me');
}

/** ADMIN only: everyone who can own a deal. */
export function fetchUsers(): Promise<User[]> {
  return request<User[]>('/users');
}

export function fetchAccount(accountRef: string): Promise<Account> {
  return request<Account>(`/accounts/${encodeURIComponent(accountRef)}`);
}

export function createAccount(input: AccountInput): Promise<Account> {
  return request<Account>('/accounts', { method: 'POST', body: JSON.stringify(input) });
}

export function updateAccount(accountRef: string, input: AccountInput): Promise<Account> {
  return request<Account>(`/accounts/${encodeURIComponent(accountRef)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function createContact(input: ContactCreateInput): Promise<ContactSummary> {
  return request<ContactSummary>('/contacts', { method: 'POST', body: JSON.stringify(input) });
}

export function updateContact(contactRef: string, input: ContactUpdateInput): Promise<ContactSummary> {
  return request<ContactSummary>(`/contacts/${encodeURIComponent(contactRef)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function fetchContacts(
  page: number,
  size: number,
  status?: string,
): Promise<PageResponse<ContactSummary>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status && status !== 'ALL') {
    params.set('status', status);
  }
  return request<PageResponse<ContactSummary>>(`/contacts?${params.toString()}`);
}

export function searchContacts(q: string): Promise<ContactSummary[]> {
  return request<ContactSummary[]>(`/contacts/search?q=${encodeURIComponent(q)}`);
}

export function fetchAccounts(): Promise<Account[]> {
  return request<Account[]>('/accounts');
}

export function fetchContact(contactRef: string): Promise<ContactDetail> {
  return request<ContactDetail>(`/contacts/${encodeURIComponent(contactRef)}`);
}

export function fetchActivities(contactRef: string): Promise<Activity[]> {
  return request<Activity[]>(`/contacts/${encodeURIComponent(contactRef)}/activities`);
}

export function createActivity(
  contactRef: string,
  input: ActivityCreateInput,
): Promise<Activity> {
  return request<Activity>(`/contacts/${encodeURIComponent(contactRef)}/activities`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function fetchAccountContacts(accountRef: string): Promise<ContactSummary[]> {
  return request<ContactSummary[]>(`/accounts/${encodeURIComponent(accountRef)}/contacts`);
}

export function fetchDeals(
  page: number,
  size: number,
  stage?: string,
): Promise<PageResponse<Deal>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (stage && stage !== 'ALL') {
    params.set('stage', stage);
  }
  return request<PageResponse<Deal>>(`/deals?${params.toString()}`);
}

export function fetchDeal(dealRef: string): Promise<Deal> {
  return request<Deal>(`/deals/${encodeURIComponent(dealRef)}`);
}

export function fetchDealSummary(): Promise<DealSummary> {
  return request<DealSummary>('/deals/summary');
}

export function fetchDealHistory(dealRef: string): Promise<DealHistoryEntry[]> {
  return request<DealHistoryEntry[]>(`/deals/${encodeURIComponent(dealRef)}/history`);
}

export function fetchContactDeals(contactRef: string): Promise<Deal[]> {
  return request<Deal[]>(`/contacts/${encodeURIComponent(contactRef)}/deals`);
}

export function createDeal(input: DealCreateInput): Promise<Deal> {
  return request<Deal>('/deals', { method: 'POST', body: JSON.stringify(input) });
}

export function updateDeal(dealRef: string, input: DealInput): Promise<Deal> {
  return request<Deal>(`/deals/${encodeURIComponent(dealRef)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteDeal(dealRef: string): Promise<void> {
  return request<void>(`/deals/${encodeURIComponent(dealRef)}`, { method: 'DELETE' });
}

export function moveDealStage(dealRef: string, input: StageMoveInput): Promise<Deal> {
  return request<Deal>(`/deals/${encodeURIComponent(dealRef)}/stage`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
