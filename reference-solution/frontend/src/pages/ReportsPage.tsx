import ReportSection from '../components/ReportSection.tsx';
import {
  fetchActivitiesPerUser,
  fetchContactsPerAccount,
  fetchDealsByStage,
  fetchUsersByRole,
} from '../api/reports.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { formatMoney, titleCase } from '../format.ts';
import { useLoad } from '../useLoad.ts';

/** A thin horizontal bar, as wide as `value` is of `max`. Decoration only: the number beside it is the data. */
function Bar({ value, max }: { value: number; max: number }) {
  const percent = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="bar" aria-hidden="true">
      <div className="bar__fill" style={{ width: `${value > 0 ? percent : 0}%` }} />
    </div>
  );
}

export default function ReportsPage() {
  const { me } = useAuth();
  const isAdmin = me?.role === 'ADMIN';

  const deals = useLoad(fetchDealsByStage);
  const accounts = useLoad(fetchContactsPerAccount);
  const activities = useLoad(fetchActivitiesPerUser);
  const roles = useLoad(fetchUsersByRole, isAdmin);

  const maxValue = Math.max(0, ...(deals.data ?? []).map((row) => row.totalValue));
  const maxContacts = Math.max(0, ...(accounts.data ?? []).map((row) => row.contacts));
  const maxActivities = Math.max(0, ...(activities.data ?? []).map((row) => row.activities));

  return (
    <section>
      <h1>Reports</h1>

      <div className="report-grid">
        <ReportSection
          title="Deals by stage"
          description="How many deals are in each stage, and what they are worth (GBP)."
          csv="deals-by-stage"
          status={deals.status}
          error={deals.error}
          isEmpty={(deals.data ?? []).length === 0}
          emptyText="No deals yet."
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Stage</th>
                <th scope="col" className="num">Deals</th>
                <th scope="col" className="num">Value</th>
                <th scope="col"><span className="visually-hidden">Share of the largest stage</span></th>
              </tr>
            </thead>
            <tbody>
              {(deals.data ?? []).map((row) => (
                <tr key={row.stage}>
                  <td>{titleCase(row.stage)}</td>
                  <td className="num">{row.deals}</td>
                  <td className="num">{formatMoney(row.totalValue)}</td>
                  <td className="barcell"><Bar value={row.totalValue} max={maxValue} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportSection>

        <ReportSection
          title="Contacts per account"
          description="The biggest accounts first. Accounts with no contacts are listed too."
          csv="contacts-per-account"
          status={accounts.status}
          error={accounts.error}
          isEmpty={(accounts.data ?? []).length === 0}
          emptyText="No accounts yet."
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Account</th>
                <th scope="col" className="num">Contacts</th>
                <th scope="col"><span className="visually-hidden">Share of the largest account</span></th>
              </tr>
            </thead>
            <tbody>
              {(accounts.data ?? []).map((row) => (
                <tr key={row.accountId}>
                  <td>{row.account}</td>
                  <td className="num">{row.contacts}</td>
                  <td className="barcell"><Bar value={row.contacts} max={maxContacts} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportSection>

        <ReportSection
          title="Activities per user"
          description="Calls, emails, meetings and notes each person has logged."
          csv="activities-per-user"
          status={activities.status}
          error={activities.error}
          isEmpty={(activities.data ?? []).length === 0}
          emptyText="Nobody has logged an activity yet."
        >
          <table>
            <thead>
              <tr>
                <th scope="col">User</th>
                <th scope="col" className="num">Activities</th>
                <th scope="col"><span className="visually-hidden">Share of the most active user</span></th>
              </tr>
            </thead>
            <tbody>
              {(activities.data ?? []).map((row) => (
                <tr key={row.userId}>
                  <td>{row.username}</td>
                  <td className="num">{row.activities}</td>
                  <td className="barcell"><Bar value={row.activities} max={maxActivities} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportSection>

        {isAdmin && (
          <ReportSection
            title="Users by role"
            description="How many people hold each role. Only administrators see this report."
            csv="users-by-role"
            status={roles.status}
            error={roles.error}
            isEmpty={(roles.data ?? []).length === 0}
            emptyText="No users."
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Role</th>
                  <th scope="col" className="num">Users</th>
                </tr>
              </thead>
              <tbody>
                {(roles.data ?? []).map((row) => (
                  <tr key={row.role}>
                    <td>{titleCase(row.role)}</td>
                    <td className="num">{row.users}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ReportSection>
        )}
      </div>
    </section>
  );
}
