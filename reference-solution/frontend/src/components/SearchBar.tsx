import { useState, type FormEvent } from 'react';

interface Props {
  label: string;
  placeholder: string;
  /** The search text currently applied to the list. */
  value: string;
  onSearch: (text: string) => void;
}

/** A search box that applies on Enter or the Search button, so one search is one request, not one per key. */
export default function SearchBar({ label, placeholder, value, onSearch }: Props) {
  const [text, setText] = useState(value);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    onSearch(text.trim());
  }

  return (
    <form className="search" role="search" onSubmit={onSubmit}>
      <label className="visually-hidden" htmlFor={`search-${label}`}>
        {label}
      </label>
      <input id={`search-${label}`} type="search" value={text} placeholder={placeholder} maxLength={100} onChange={(event) => setText(event.target.value)} />
      <button type="submit">Search</button>
    </form>
  );
}
