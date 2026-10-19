interface Props {
  page: number;
  totalPages: number;
  totalElements: number;
  onChange: (page: number) => void;
  /** What is being paged, plural: "contacts", "deals". */
  noun?: string;
}

export default function Pagination({
  page,
  totalPages,
  totalElements,
  onChange,
  noun = 'contacts',
}: Props) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className="pagination"
      aria-label={`${noun.charAt(0).toUpperCase()}${noun.slice(1, -1)} list pages`}
    >
      <button
        type="button"
        className="pagination__button"
        disabled={page <= 0}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </button>

      <span className="pagination__status" aria-live="polite">
        Page {page + 1} of {totalPages} — {totalElements} {noun}
      </span>

      <button
        type="button"
        className="pagination__button"
        disabled={page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
