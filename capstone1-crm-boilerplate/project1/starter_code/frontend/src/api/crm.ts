import type {
  Account,
  Activity,
  ActivityCreateInput,
  ApiErrorBody,
  ContactDetail,
  ContactSummary,
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
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

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
