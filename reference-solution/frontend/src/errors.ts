import { ApiError } from './api/http.ts';

/**
 * The one place that turns a failed request into words for the user. Components never read an error
 * body themselves. Note that 401 and 403 mean different things: 401 is "not signed in", 403 is
 * "signed in but not allowed" (or a missing anti-forgery token).
 */
export function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return 'Too many attempts. Wait a minute and try again.';
    }
    if (error.problem?.detail) {
      return error.problem.detail;
    }
    if (error.status === 403) {
      return 'You are not allowed to do that.';
    }
    if (error.status === 401) {
      return 'You are not signed in.';
    }
    if (error.problem?.title) {
      return error.problem.title;
    }
    return `The server answered ${error.status}.`;
  }
  return 'Could not reach the server. Check your connection and try again.';
}

/**
 * The messages the server attached to individual fields of a 400, keyed by lower-cased field name so a
 * form can look up "username" whatever the server's casing. Empty when the error has no field messages.
 */
export function fieldErrorsFor(error: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (error instanceof ApiError && error.problem?.errors) {
    for (const [field, messages] of Object.entries(error.problem.errors)) {
      if (messages.length > 0) {
        result[field.toLowerCase()] = messages[0];
      }
    }
  }
  return result;
}

export interface FormErrors {
  /** Messages for inputs, keyed by lower-cased field name (the server sends PascalCase: Name, FirstName ...). */
  fields: Record<string, string>;
  /** Everything else: a 404 or 409 detail, a 403, a BAD_REQUEST, or a field the form has no input for. */
  general: string;
}

/**
 * Splits a failed save into messages for known inputs and one general message. A form passes the lower-cased
 * names of its inputs; a server message for any other field is not lost, it joins the general message.
 */
export function formErrorsFor(error: unknown, knownFields: readonly string[]): FormErrors {
  const found = fieldErrorsFor(error);
  const fields: Record<string, string> = {};
  const stray: string[] = [];
  for (const [name, message] of Object.entries(found)) {
    if (knownFields.includes(name)) {
      fields[name] = message;
    } else {
      stray.push(message);
    }
  }
  if (Object.keys(found).length === 0) {
    return { fields, general: messageFor(error) };
  }
  return { fields, general: stray.join(' ') };
}
