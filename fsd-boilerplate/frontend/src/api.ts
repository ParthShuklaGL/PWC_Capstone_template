/**
 * Every call to the backend goes through this file.
 *
 * The three login modes differ only in how the browser proves who it is:
 *   jwt     the token is kept here and sent as "Authorization: Bearer"
 *   cookie  the server sets an HttpOnly cookie; the browser sends it, JavaScript never sees it
 *   session the server keeps the login; the browser sends the JSESSIONID cookie
 */

export type AuthMode = 'jwt' | 'cookie' | 'session';
export type Role = 'USER' | 'ADMIN';

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  enabled: boolean;
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  quantity: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  category: string;
  price: number;
  quantity: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CategoryReport {
  category: string;
  products: number;
  units: number;
  stockValue: number;
}

export interface ProductSummary {
  totalProducts: number;
  totalUnits: number;
  totalStockValue: number;
  byCategory: CategoryReport[];
  lowStock: Product[];
}

export interface UserReport {
  totalUsers: number;
  byRole: Record<string, number>;
}

interface ErrorBody {
  error: string;
  message?: string;
  fields?: Record<string, string>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string>;

  constructor(status: number, body: ErrorBody | null, fallback: string) {
    super(body?.message ?? fallback);
    this.name = 'ApiError';
    this.status = status;
    this.fields = body?.fields ?? {};
  }
}

const TOKEN_KEY = 'fsd.token';
const MODE_KEY = 'fsd.mode';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // storage unavailable: the app still works for this tab
  }
}

let token: string | null = read(TOKEN_KEY);

export function savedMode(): AuthMode {
  const mode = read(MODE_KEY);
  return mode === 'cookie' || mode === 'session' ? mode : 'jwt';
}

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`/api${path}`, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    let body: ErrorBody | null = null;
    try {
      body = (await response.json()) as ErrorBody;
    } catch {
      body = null;
    }
    throw new ApiError(response.status, body, `Request failed with ${response.status}`);
  }
  return response;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await send(path, init);
  // 204 No Content (DELETE, logout) has no body to parse.
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

// ---- auth ----

export async function login(mode: AuthMode, username: string, password: string): Promise<User> {
  token = null;
  write(TOKEN_KEY, null);
  write(MODE_KEY, mode);
  if (mode === 'jwt') {
    const result = await request<{ token: string; user: User }>(
      '/auth/jwt/login',
      json('POST', { username, password }),
    );
    token = result.token;
    write(TOKEN_KEY, token);
    return result.user;
  }
  return request<User>(`/auth/${mode}/login`, json('POST', { username, password }));
}

export function register(username: string, email: string, password: string): Promise<User> {
  return request<User>('/auth/register', json('POST', { username, email, password }));
}

export async function logout(): Promise<void> {
  try {
    await request<void>('/auth/logout', { method: 'POST' });
  } finally {
    token = null;
    write(TOKEN_KEY, null);
  }
}

export const me = () => request<User>('/auth/me');

// ---- products ----

export function listProducts(page: number, size: number, q: string): Promise<Page<Product>> {
  const params = new URLSearchParams({ page: String(page), size: String(size), q });
  return request<Page<Product>>(`/products?${params.toString()}`);
}

export const createProduct = (input: ProductInput) =>
  request<Product>('/products', json('POST', input));

export const updateProduct = (id: number, input: ProductInput) =>
  request<Product>(`/products/${id}`, json('PUT', input));

export const deleteProduct = (id: number) =>
  request<void>(`/products/${id}`, { method: 'DELETE' });

// ---- users (admin) ----

export const listUsers = () => request<User[]>('/users');

export const createUser = (input: {
  username: string;
  email: string;
  password: string;
  role: Role;
}) => request<User>('/users', json('POST', input));

export const updateUser = (
  id: number,
  input: { email?: string; role?: Role; enabled?: boolean; password?: string },
) => request<User>(`/users/${id}`, json('PUT', input));

export const deleteUser = (id: number) => request<void>(`/users/${id}`, { method: 'DELETE' });

// ---- reports ----

export const productSummary = () => request<ProductSummary>('/reports/products');

export const userReport = () => request<UserReport>('/reports/users');

/** Fetched through send() so the Bearer header is attached, then saved as a file. */
export async function downloadProductsCsv(): Promise<void> {
  const response = await send('/reports/products.csv');
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = 'products.csv';
  link.click();
  URL.revokeObjectURL(url);
}
