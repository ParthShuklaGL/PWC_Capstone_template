import { useState } from 'react';
import { formErrorsFor } from './errors.ts';

/**
 * The state every CRM form shares: is it saving, which inputs have a message, and the one general message.
 * `known` lists the lower-cased names of the form's inputs, so the server's PascalCase keys can be matched.
 */
export function useFormState(known: readonly string[]) {
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState('');

  /** Shows messages found in the browser (a blank required field) and reports whether the form may be sent. */
  function check(problems: Record<string, string>): boolean {
    setFields(problems);
    setGeneral('');
    return Object.keys(problems).length === 0;
  }

  /** Sends the request once at a time; on failure the server's messages land beside the right inputs. */
  async function submit<T>(send: () => Promise<T>, done: (result: T) => void): Promise<void> {
    setBusy(true);
    setGeneral('');
    setFields({});
    try {
      const result = await send();
      done(result);
      setBusy(false);
    } catch (caught) {
      const found = formErrorsFor(caught, known);
      setFields(found.fields);
      setGeneral(found.general);
      setBusy(false);
    }
  }

  return { busy, fields, general, check, submit };
}
