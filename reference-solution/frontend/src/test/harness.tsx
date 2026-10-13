import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../auth/AuthContext.tsx';
import type { Account, Contact, Deal, Me, Paged } from '../types.ts';

export interface Call {
  method: string;
  /** Path and query, such as /api/deals?size=10&stage=WON */
  url: string;
  body: unknown;
  headers: Headers;
}

type Reply = Response | { status: number; body?: unknown };

export const reply = (status: number, body?: unknown): Reply => ({ status, body });
export const problem = (status: number, body: object): Reply => reply(status, { status, ...body });

/**
 * Replaces fetch with a function that records every call and answers from `answer`. An answer of
 * undefined means "this test did not expect that call" and fails loudly with a 500.
 */
export function mockApi(answer: (call: Call) => Reply | undefined) {
  const calls: Call[] = [];
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const call: Call = {
      method: (init.method ?? 'GET').toUpperCase(),
      url,
      body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
      headers: new Headers(init.headers),
    };
    calls.push(call);
    const result = answer(call) ?? reply(500, { title: `unexpected call ${call.method} ${call.url}` });
    if (result instanceof Response) {
      return result;
    }
    return result.status === 204 || result.body === undefined
      ? new Response(null, { status: result.status })
      : new Response(JSON.stringify(result.body), { status: result.status, headers: { 'Content-Type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}

export const pageOf = <T,>(items: T[], total = items.length, pageNumber = 0): Paged<T> => ({ items, page: pageNumber, size: 10, total });

export const ADMIN_ME: Me = { id: 1, username: 'admin', role: 'ADMIN', authenticatedVia: 'Bearer' };
export const USER_ME: Me = { id: 2, username: 'demo', role: 'USER', authenticatedVia: 'Bearer' };

export function renderAs(me: Me, ui: ReactElement, path = '/') {
  const value: AuthContextValue = {
    status: 'signedIn',
    me,
    notice: '',
    signIn: vi.fn(),
    register: vi.fn(),
    signOut: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </AuthContext.Provider>,
  );
}

export const account = (over: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Halcyon Freight',
  industry: 'Logistics',
  country: 'United Kingdom',
  website: 'https://halcyon.example',
  createdAt: '2026-07-14T09:44:16Z',
  contactCount: 4,
  ...over,
});

export const contact = (over: Partial<Contact> = {}): Contact => ({
  id: 1,
  accountId: 1,
  accountName: 'Halcyon Freight',
  firstName: 'Maya',
  lastName: 'Okafor',
  email: 'maya@halcyon.example',
  phone: null,
  jobTitle: 'COO',
  status: 'CUSTOMER',
  lastContactedAt: null,
  createdAt: '2026-07-14T09:44:16Z',
  ...over,
});

export const deal = (over: Partial<Deal> = {}): Deal => ({
  id: 7,
  contactId: 1,
  contactName: 'Maya Okafor',
  accountId: 1,
  accountName: 'Halcyon Freight',
  title: 'Fleet rollout',
  value: 48000,
  expectedCloseDate: '2026-10-02',
  stage: 'NEGOTIATION',
  closedDate: null,
  lostReason: null,
  createdAt: '2026-08-13T09:44:16Z',
  updatedAt: '2026-08-13T09:44:16Z',
  ...over,
});
