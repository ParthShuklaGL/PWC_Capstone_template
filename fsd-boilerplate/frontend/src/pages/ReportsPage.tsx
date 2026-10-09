import { useEffect, useState } from 'react';
import {
  downloadProductsCsv,
  productSummary,
  userReport,
  type ProductSummary,
  type UserReport,
} from '../api.ts';

const money = (value: number) =>
  value.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });

export default function ReportsPage({ isAdmin }: { isAdmin: boolean }) {
  const [summary, setSummary] = useState<ProductSummary | null>(null);
  const [users, setUsers] = useState<UserReport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    productSummary().then(setSummary).catch((caught: Error) => setError(caught.message));
    if (isAdmin) {
      userReport().then(setUsers).catch((caught: Error) => setError(caught.message));
    }
  }, [isAdmin]);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!summary) return <p className="notice">Loading…</p>;

  const max = Math.max(1, ...summary.byCategory.map((c) => c.stockValue));

  return (
    <section>
      <h1>Reports</h1>

      <div className="stats">
        <div className="card"><span>Products</span><strong>{summary.totalProducts}</strong></div>
        <div className="card"><span>Units in stock</span><strong>{summary.totalUnits}</strong></div>
        <div className="card"><span>Stock value</span><strong>{money(summary.totalStockValue)}</strong></div>
        {users && <div className="card"><span>Users</span><strong>{users.totalUsers}</strong></div>}
      </div>

      <h2>Stock value by category</h2>
      <table>
        <thead>
          <tr><th>Category</th><th className="num">Products</th><th className="num">Units</th><th className="num">Value</th><th /></tr>
        </thead>
        <tbody>
          {summary.byCategory.map((c) => (
            <tr key={c.category}>
              <td>{c.category}</td>
              <td className="num">{c.products}</td>
              <td className="num">{c.units}</td>
              <td className="num">{money(c.stockValue)}</td>
              <td className="barcell">
                <div className="bar-fill" style={{ width: `${(c.stockValue / max) * 100}%` }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Low stock (fewer than 5)</h2>
      {summary.lowStock.length === 0 ? (
        <p className="notice">Nothing is running low.</p>
      ) : (
        <ul>
          {summary.lowStock.map((p) => (
            <li key={p.id}>{p.name} — {p.quantity} left</li>
          ))}
        </ul>
      )}

      {users && (
        <>
          <h2>Users by role</h2>
          <ul>
            {Object.entries(users.byRole).map(([role, count]) => (
              <li key={role}>{role}: {count}</li>
            ))}
          </ul>
        </>
      )}

      <button onClick={() => downloadProductsCsv().catch((caught: Error) => setError(caught.message))}>
        Download products CSV
      </button>
    </section>
  );
}
