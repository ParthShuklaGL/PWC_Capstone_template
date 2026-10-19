import { FILTER_LABELS, STATUS_FILTERS, type StatusFilter as Filter } from '../constants.ts';

interface Props {
  selected: Filter;
  onSelect: (filter: Filter) => void;
}

export default function StatusFilter({ selected, onSelect }: Props) {
  return (
    <div className="filter" role="group" aria-label="Filter contacts by status">
      {STATUS_FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          className={filter === selected ? 'filter__button filter__button--on' : 'filter__button'}
          aria-pressed={filter === selected}
          onClick={() => onSelect(filter)}
        >
          {FILTER_LABELS[filter]}
        </button>
      ))}
    </div>
  );
}
