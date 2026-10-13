import type { AccountContactsRow, DealStageRow, RoleUsersRow, UserActivitiesRow } from '../types.ts';
import { request, requestFile } from './http.ts';

export type ReportName = 'deals-by-stage' | 'contacts-per-account' | 'activities-per-user' | 'users-by-role';

export const fetchDealsByStage = () => request<DealStageRow[]>('/reports/deals-by-stage');

export const fetchContactsPerAccount = () => request<AccountContactsRow[]>('/reports/contacts-per-account');

export const fetchActivitiesPerUser = () => request<UserActivitiesRow[]>('/reports/activities-per-user');

/** ADMIN only. */
export const fetchUsersByRole = () => request<RoleUsersRow[]>('/reports/users-by-role');

/** Downloads a report as a CSV and saves it under the file name the server chose. */
export async function downloadCsv(name: ReportName): Promise<void> {
  const { blob, fileName } = await requestFile(`/reports/${name}.csv`, `${name}.csv`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
