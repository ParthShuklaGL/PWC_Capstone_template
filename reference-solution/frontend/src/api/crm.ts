import type {
  Account,
  AccountInput,
  Contact,
  ContactInput,
  ContactStatus,
  Deal,
  DealInput,
  DealStage,
  Paged,
} from '../types.ts';
import { json, queryString, request } from './http.ts';

/**
 * Accounts, contacts and deals share the same five routes, so one small generic client serves all three.
 * The typed exports below (accounts, contacts, deals) are what the screens use. Stages and statuses travel
 * as upper-case names. DELETE is ADMIN only: a USER gets 403, which the screens show as the server's message.
 */

/** Rows per page on the list screens. */
export const CRM_PAGE_SIZE = 10;

/** The most rows the server returns for one request. */
const MAX_PAGE_SIZE = 100;

/** Pickers stop after this many pages, so a huge table cannot trigger hundreds of requests. */
const PICKER_MAX_PAGES = 10;

interface ListParams {
  page?: number;
  size?: number;
  search?: string;
}

function resource<T, I, F extends object>(name: string) {
  return {
    list: (params: ListParams & F): Promise<Paged<T>> =>
      request<Paged<T>>(`/${name}${queryString({ size: CRM_PAGE_SIZE, ...(params as Record<string, string | number | undefined>) })}`),
    get: (id: number): Promise<T> => request<T>(`/${name}/${id}`),
    create: (input: I): Promise<T> => request<T>(`/${name}`, json('POST', input)),
    update: (id: number, input: I): Promise<T> => request<T>(`/${name}/${id}`, json('PUT', input)),
    /** ADMIN only. Resolves with nothing (204). */
    remove: (id: number): Promise<void> => request<void>(`/${name}/${id}`, { method: 'DELETE' }),
  };
}

export const accounts = resource<Account, AccountInput, object>('accounts');

export const contacts = resource<Contact, ContactInput, { accountId?: number | string; status?: ContactStatus | '' }>(
  'contacts',
);

export const deals = resource<
  Deal,
  DealInput,
  { stage?: DealStage | ''; accountId?: number | string; contactId?: number | string }
>('deals');

/** Every row of a list, for a picker: reads pages of 100 until the total is reached. */
async function fetchEvery<T>(read: (page: number) => Promise<Paged<T>>): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < PICKER_MAX_PAGES; page += 1) {
    const result = await read(page);
    rows.push(...result.items);
    if (rows.length >= result.total || result.items.length === 0) {
      break;
    }
  }
  return rows;
}

export const fetchAllAccounts = () =>
  fetchEvery((page) => request<Paged<Account>>(`/accounts${queryString({ page, size: MAX_PAGE_SIZE })}`));

export const fetchAllContacts = () =>
  fetchEvery((page) => request<Paged<Contact>>(`/contacts${queryString({ page, size: MAX_PAGE_SIZE })}`));
