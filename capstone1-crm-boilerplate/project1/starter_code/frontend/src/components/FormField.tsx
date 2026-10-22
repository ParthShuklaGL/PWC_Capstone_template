import type { ReactNode } from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  /** The server's message for this field, from a 400 VALIDATION_FAILED. */
  error?: string;
  className?: string;
  children: (props: { id: string; className: string; 'aria-describedby'?: string }) => ReactNode;
}

/** A label, an input and the server's message beside it, wired up for screen readers. */
export default function FormField({ id, label, error, className = 'col-md-6', children }: FormFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      {children({
        id,
        className: error ? 'is-invalid' : '',
        'aria-describedby': error ? errorId : undefined,
      })}
      {error && (
        <div id={errorId} className="invalid-feedback">
          {error}
        </div>
      )}
    </div>
  );
}
