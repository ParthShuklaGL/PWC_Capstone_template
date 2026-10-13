import type { User } from '../types.ts';
import { request } from './http.ts';

export const USERS_PAGE_SIZE = 20;

/** ADMIN only. A page with fewer rows than the page size is the last one. */
export function fetchUsers(page: number, size: number = USERS_PAGE_SIZE): Promise<User[]> {
  return request<User[]>(`/users?page=${page}&size=${size}`);
}
