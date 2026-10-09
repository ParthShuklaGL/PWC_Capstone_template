import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ApiError,
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
  type Page,
  type Product,
} from '../api.ts';

const PAGE_SIZE = 10;

interface Draft {
  name: string;
  category: string;
  price: string;
  quantity: string;
}

const EMPTY: Draft = { name: '', category: '', price: '', quantity: '' };

export default function ProductsPage({ isAdmin }: { isAdmin: boolean }) {
  const [data, setData] = useState<Page<Product> | null>(null);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState('');
  const [submittedQ, setSubmittedQ] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<Product | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    listProducts(page, PAGE_SIZE, submittedQ)
      .then((result) => {
        setData(result);
        setError('');
      })
      .catch((caught: Error) => setError(caught.message))
      .finally(() => setLoading(false));
  }, [page, submittedQ]);

  useEffect(load, [load]);

  function startEdit(product: Product | null) {
    setEditing(product);
    setFieldErrors({});
    setFormError('');
    setDraft(
      product
        ? {
            name: product.name,
            category: product.category,
            price: String(product.price),
            quantity: String(product.quantity),
          }
        : EMPTY,
    );
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setFormError('');
    const input = {
      name: draft.name,
      category: draft.category,
      price: Number(draft.price),
      quantity: Number(draft.quantity),
    };
    try {
      if (editing) await updateProduct(editing.id, input);
      else await createProduct(input);
      startEdit(null);
      load();
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.fields).length > 0) {
        setFieldErrors(caught.fields);
      } else {
        setFormError((caught as Error).message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(product: Product) {
    if (!window.confirm(`Delete "${product.name}"?`)) return;
    try {
      await deleteProduct(product.id);
      load();
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  const set = (key: keyof Draft) => (e: { target: { value: string } }) =>
    setDraft({ ...draft, [key]: e.target.value });

  return (
    <section>
      <h1>Products</h1>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          setSubmittedQ(q.trim());
        }}
        role="search"
      >
        <input placeholder="Search name or category" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit">Search</button>
        {submittedQ && (
          <button type="button" onClick={() => { setQ(''); setSubmittedQ(''); setPage(0); }}>
            Clear
          </button>
        )}
      </form>

      <form className="card grid" onSubmit={save}>
        <h2>{editing ? `Edit "${editing.name}"` : 'Add a product'}</h2>
        <label>
          Name
          <input value={draft.name} onChange={set('name')} required />
          {fieldErrors.name && <span className="error">{fieldErrors.name}</span>}
        </label>
        <label>
          Category
          <input value={draft.category} onChange={set('category')} required />
          {fieldErrors.category && <span className="error">{fieldErrors.category}</span>}
        </label>
        <label>
          Price
          <input type="number" step="0.01" min="0" value={draft.price} onChange={set('price')} required />
          {fieldErrors.price && <span className="error">{fieldErrors.price}</span>}
        </label>
        <label>
          Quantity
          <input type="number" step="1" min="0" value={draft.quantity} onChange={set('quantity')} required />
          {fieldErrors.quantity && <span className="error">{fieldErrors.quantity}</span>}
        </label>
        {formError && <p className="error" role="alert">{formError}</p>}
        <div className="row">
          <button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add product'}</button>
          {editing && <button type="button" onClick={() => startEdit(null)}>Cancel</button>}
        </div>
      </form>

      {loading && <p className="notice">Loading…</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!loading && data && data.items.length === 0 && <p className="notice">No products found.</p>}

      {data && data.items.length > 0 && (
        <>
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Category</th><th className="num">Price</th><th className="num">Qty</th><th>Added by</th><th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td className="num">{p.price.toFixed(2)}</td>
                  <td className="num">{p.quantity}</td>
                  <td>{p.createdBy}</td>
                  <td className="actions">
                    <button onClick={() => startEdit(p)}>Edit</button>
                    {isAdmin && <button onClick={() => remove(p)}>Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row">
            <button disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <span>
              Page {data.page + 1} of {Math.max(1, data.totalPages)} · {data.totalElements} products
            </span>
            <button disabled={page + 1 >= data.totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}
    </section>
  );
}
