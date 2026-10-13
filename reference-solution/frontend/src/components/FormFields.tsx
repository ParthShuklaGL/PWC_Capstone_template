import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

/**
 * A labelled input with the server's message for it beside it. The message is linked with aria-describedby
 * rather than put inside the label, so the input's accessible name stays "Website", not "Website Must be...".
 */
function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string;
}

export function TextField({ label, error, ...input }: TextFieldProps) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error}>
      <input id={id} {...input} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
    </Field>
  );
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  error?: string;
}

export function SelectField({ label, error, children, ...select }: SelectFieldProps) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error}>
      <select id={id} {...select} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}>
        {children}
      </select>
    </Field>
  );
}
