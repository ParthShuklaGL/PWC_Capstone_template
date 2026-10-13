interface Props {
  page: number;
  size: number;
  total: number;
  busy: boolean;
  onPage: (page: number) => void;
}

/** Previous and Next, and how many rows there are. `page` is 0 based; the server tells us the total. */
export default function Pager({ page, size, total, busy, onPage }: Props) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="pager" aria-label="Pages">
      <button type="button" onClick={() => onPage(page - 1)} disabled={page === 0 || busy}>
        Previous
      </button>
      <span>
        Page {page + 1} of {pages}
      </span>
      <button type="button" onClick={() => onPage(page + 1)} disabled={page + 1 >= pages || busy}>
        Next
      </button>
      <span className="pager__total">{total} in all</span>
    </div>
  );
}
