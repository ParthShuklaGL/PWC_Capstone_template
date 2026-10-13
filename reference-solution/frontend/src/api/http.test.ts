import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, fileNameFrom, request, setUnauthorizedHandler } from './http.ts';
import { setToken } from './tokenStore.ts';

const problem = (status: number, body: object) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/problem+json' } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  setToken(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
  setToken(null);
});

describe('request', () => {
  it('returns undefined for a 204 without reading a body', async () => {
    const response = new Response(null, { status: 204 });
    const json = vi.spyOn(response, 'json');
    fetchMock.mockResolvedValue(response);

    await expect(request<void>('/auth/logout', { method: 'POST' }, { csrf: false })).resolves.toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it('parses a JSON success body', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 7 }), { status: 200 }));

    await expect(request<{ id: number }>('/auth/me')).resolves.toEqual({ id: 7 });
  });

  it('sends the stored JWT as a Bearer header, and nothing when there is none', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response('{}', { status: 200 })));

    await request('/auth/me');
    expect(new Headers(fetchMock.mock.calls[0][1].headers).has('Authorization')).toBe(false);

    setToken('abc.def.ghi');
    await request('/auth/me');
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get('Authorization')).toBe('Bearer abc.def.ghi');
  });

  it('always uses a relative /api URL, never an absolute one', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));

    await request('/users?page=0&size=20');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/users?page=0&size=20');
  });

  it('throws an ApiError that carries the status, the problem document and the server message', async () => {
    fetchMock.mockResolvedValue(
      problem(409, { status: 409, detail: 'That username is already taken.', code: 'USERNAME_TAKEN' }),
    );

    const failure = await request('/auth/register', { method: 'POST' }).catch((caught: unknown) => caught);

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(409);
    expect((failure as ApiError).problem?.code).toBe('USERNAME_TAKEN');
    expect((failure as ApiError).message).toBe('That username is already taken.');
  });

  it('survives an error body that is not JSON, such as a proxy error page', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));

    const failure = (await request('/users').catch((caught: unknown) => caught)) as ApiError;

    expect(failure.status).toBe(502);
    expect(failure.problem).toBeNull();
    expect(failure.message).toBe('Request failed with 502');
  });

  it('tells the app the session ended on a 401 from a signed-in call', async () => {
    const ended = vi.fn();
    setUnauthorizedHandler(ended);
    fetchMock.mockResolvedValue(problem(401, { status: 401 }));

    await request('/users').catch(() => undefined);

    expect(ended).toHaveBeenCalledTimes(1);
  });

  it('does not treat a 401 from sign-in itself as a lost session', async () => {
    const ended = vi.fn();
    setUnauthorizedHandler(ended);
    fetchMock.mockResolvedValue(problem(401, { status: 401, detail: 'Invalid username or password.' }));

    await request('/auth/login', { method: 'POST' }, { expectSignedIn: false, csrf: false }).catch(() => undefined);

    expect(ended).not.toHaveBeenCalled();
  });
});

describe('fileNameFrom', () => {
  it('reads the name the server chose', () => {
    expect(
      fileNameFrom(
        "attachment; filename=deals-by-stage-2026-10-08.csv; filename*=UTF-8''deals-by-stage-2026-10-08.csv",
        'fallback.csv',
      ),
    ).toBe('deals-by-stage-2026-10-08.csv');
    expect(fileNameFrom('attachment; filename="quoted name.csv"', 'fallback.csv')).toBe('quoted name.csv');
  });

  it('uses the fallback when there is no header', () => {
    expect(fileNameFrom(null, 'fallback.csv')).toBe('fallback.csv');
  });
});
