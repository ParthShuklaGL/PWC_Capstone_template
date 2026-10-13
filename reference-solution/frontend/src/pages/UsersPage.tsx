import { useCallback, useState } from 'react';
import { fetchUsers, USERS_PAGE_SIZE } from '../api/users.ts';
import { formatDate } from '../format.ts';
import { useLoad } from '../useLoad.ts';

/** The user list, ADMIN only, twenty to a page. */
export default function UsersPage() {
  const [page, setPage] = useState(0);
  const loadPage = useCallback(() => fetchUsers(page), [page]);
  const { status, data, error } = useLoad(loadPage);

  const users = data ?? [];
  // The API returns a bare array, so a page shorter than the page size is the last one.
  const isLastPage = users.length < USERS_PAGE_SIZE;

  return (
    <section>
      <h1>Users</h1>

      <div className="card">
        {status === 'loading' && <p className="notice">Loading…</p>}
        {status === 'error' && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {status === 'ready' && users.length === 0 && <p className="notice">No users.</p>}

        {status === 'ready' && users.length > 0 && (
          <table>
            <thead>
              <tr>
                <th scope="col">Username</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td><span className={`badge badge--${user.role.toLowerCase()}`}>{user.role}</span></td>
                  <td>{user.isActive ? 'Active' : 'Disabled'}</td>
                  <td>{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="pager">
        <button type="button" onClick={() => setPage(page - 1)} disabled={page === 0 || status === 'loading'}>
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button type="button" onClick={() => setPage(page + 1)} disabled={isLastPage || status !== 'ready'}>
          Next
        </button>
      </div>
    </section>
  );
}
