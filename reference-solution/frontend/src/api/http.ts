import type { CsrfToken, ProblemDocument } from '../types.ts';
import { getToken } from './tokenStore.ts';

/**
 * Every call to the backend goes through this file. Components never call fetch directly.
 *
 * Only relative '/api/...' URLs are used: the API sends no CORS headers, so the page and the API must
 * share an origin (the Vite dev server proxies /api to the .NET API).
 */

const BASE_URL = '/api';

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDocument | null;

  constructor(status: number, problem: ProblemDocument | null, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Called whenever a request that needed a signed-in user comes back 401. Set once, by the auth provider. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export interface RequestOptions {
  /**
   * True (the default) for calls made while signed in: a 401 means the credential ended, so the app
   * returns to the sign-in screen. Sign-in and the start-up "who am I" check pass false, because a 401
   * there is an expected answer, not a lost session.
   */
  expectSignedIn?: boolean;
  /**
   * Whether a change (POST, PUT, DELETE) may need the anti-forgery token. True by default. Sign-in, register and
   * sign-out say false: they are made before a credential exists, or fetch the token themselves.
   */
  csrf?: boolean;
}

function buildHeaders(init: RequestInit): Headers {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

async function readProblem(response: Response): Promise<ProblemDocument | null> {
  try {
    return (await response.json()) as ProblemDocument;
  } catch {
    return null;
  }
}

/**
 * Cookie and session sign-ins are sent by the browser on its own, so the server also wants an anti-forgery
 * token on every change; a Bearer token is not sent automatically and needs none. A browser holding a JWT
 * (it is in sessionStorage) is a Bearer caller; anyone else gets a fresh token from GET /api/auth/csrf.
 */
async function csrfHeaders(init: RequestInit, options: RequestOptions): Promise<Record<string, string>> {
  const method = (init.method ?? 'GET').toUpperCase();
  const isChange = method !== 'GET' && method !== 'HEAD';
  if (!isChange || options.csrf === false || getToken()) {
    return {};
  }
  const csrf = await request<CsrfToken>('/auth/csrf');
  return { [csrf.headerName]: csrf.token };
}

async function send(path: string, init: RequestInit, options: RequestOptions): Promise<Response> {
  const extra = await csrfHeaders(init, options);
  const headers = buildHeaders(init);
  for (const [name, value] of Object.entries(extra)) {
    headers.set(name, value);
  }
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    const problem = await readProblem(response);
    if (response.status === 401 && options.expectSignedIn !== false) {
      unauthorizedHandler?.();
    }
    throw new ApiError(
      response.status,
      problem,
      problem?.detail ?? problem?.title ?? `Request failed with ${response.status}`,
    );
  }

  return response;
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<T> {
  const response = await send(path, init, options);

  // 204 No Content (sign-out) has no body to parse.
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/** Builds ?a=1&b=2 from the given values, leaving out the empty ones. */
export function queryString(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      search.set(name, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

/** The file name from a Content-Disposition header, or the fallback when there is none. */
export function fileNameFrom(disposition: string | null, fallback: string): string {
  const match = disposition?.match(/filename=("?)([^";]+)\1/i);
  return match?.[2] ?? fallback;
}

/** Fetches a file with the same credentials as any other call, so it also works with a Bearer token. */
export async function requestFile(
  path: string,
  fallbackName: string,
): Promise<{ blob: Blob; fileName: string }> {
  const response = await send(path, {}, {});
  return {
    blob: await response.blob(),
    fileName: fileNameFrom(response.headers.get('Content-Disposition'), fallbackName),
  };
}
