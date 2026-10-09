import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ApiError,
  createUser,
  deleteUser,
  listUsers,
  updateUser,
  type Role,
  type User,
} from '../api.ts';

export default function UsersPage({ currentUser }: { currentUser: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('USER');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    listUsers()
      .then((result) => {
        setUsers(result);
        setError('');
      })
      .catch((caught: Error) => setError(caught.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function add(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setError('');
    try {
      await createUser({ username, email, password, role });
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('USER');
      load();
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.fields).length > 0) {
        setFieldErrors(caught.fields);
      } else {
        setError((caught as Error).message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function change(user: User, patch: { role?: Role; enabled?: boolean }) {
    try {
      await updateUser(user.id, patch);
      load();
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  async function remove(user: User) {
    if (!window.confirm(`Delete user "${user.username}"?`)) return;
    try {
      await deleteUser(user.id);
      load();
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  return (
    <section>
      <h1>Users</h1>

      <form className="card grid" onSubmit={add}>
        <h2>Add a user</h2>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          {fieldErrors.username && <span className="error">{fieldErrors.username}</span>}
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {fieldErrors.email && <span className="error">{fieldErrors.email}</span>}
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          {fieldErrors.password && <span className="error">{fieldErrors.password}</span>}
        </label>
        <label>
          Role
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
        <div className="row">
          <button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add user'}</button>
        </div>
      </form>

      {loading && <p className="notice">Loading…</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <table>
        <thead>
          <tr><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th /></tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const self = u.username === currentUser;
            return (
              <tr key={u.id}>
                <td>{u.username}{self && ' (you)'}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    disabled={self}
                    onChange={(e) => change(u, { role: e.target.value as Role })}
                    aria-label={`Role for ${u.username}`}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td>{u.enabled ? 'Active' : 'Disabled'}</td>
                <td className="actions">
                  <button disabled={self} onClick={() => change(u, { enabled: !u.enabled })}>
                    {u.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button disabled={self} onClick={() => remove(u)}>Delete</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
