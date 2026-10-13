import { describe, expect, it } from 'vitest';
import { ApiError } from './api/http.ts';
import { fieldErrorsFor, formErrorsFor, messageFor } from './errors.ts';

const apiError = (status: number, problem: ConstructorParameters<typeof ApiError>[1] = null) =>
  new ApiError(status, problem, 'ignored');

describe('messageFor', () => {
  it('uses the detail the server wrote', () => {
    expect(messageFor(apiError(409, { detail: 'That username is already taken.' }))).toBe(
      'That username is already taken.',
    );
  });

  it('says to wait after a 429', () => {
    expect(messageFor(apiError(429, { detail: 'ignored in favour of the wait message' }))).toMatch(/wait a minute/i);
  });

  it('keeps 401 and 403 apart: not signed in versus not allowed', () => {
    expect(messageFor(apiError(401))).toBe('You are not signed in.');
    expect(messageFor(apiError(403))).toBe('You are not allowed to do that.');
  });

  it('falls back to the title and then to the status code', () => {
    expect(messageFor(apiError(500, { title: 'An unexpected error occurred.' }))).toBe('An unexpected error occurred.');
    expect(messageFor(apiError(502))).toBe('The server answered 502.');
  });

  it('describes a network failure without naming a status', () => {
    expect(messageFor(new TypeError('Failed to fetch'))).toMatch(/could not reach the server/i);
  });
});

describe('fieldErrorsFor', () => {
  it('keys the first message of each field by lower-cased name', () => {
    const error = apiError(400, {
      errors: { Username: ['Too short.', 'Also bad.'], Password: ['Password must be at least 10 characters.'] },
    });

    expect(fieldErrorsFor(error)).toEqual({
      username: 'Too short.',
      password: 'Password must be at least 10 characters.',
    });
  });

  it('is empty when the error has no field messages or is not an API error', () => {
    expect(fieldErrorsFor(apiError(409, { detail: 'taken' }))).toEqual({});
    expect(fieldErrorsFor(new Error('boom'))).toEqual({});
  });
});

describe('formErrorsFor', () => {
  it('splits server messages into known inputs (PascalCase keys matched) and one general message', () => {
    const error = apiError(400, { errors: { Name: ['Name is required.'], Website: ['Bad website.'], Mystery: ['Not an input.'] } });

    expect(formErrorsFor(error, ['name', 'website'])).toEqual({
      fields: { name: 'Name is required.', website: 'Bad website.' },
      general: 'Not an input.',
    });
  });

  it('uses the problem detail as the general message when there are no field messages', () => {
    const error = apiError(409, { detail: 'This account still has contacts.', code: 'ACCOUNT_HAS_CONTACTS' });

    expect(formErrorsFor(error, ['name'])).toEqual({ fields: {}, general: 'This account still has contacts.' });
  });

  it('has an empty general message when every message found a matching input', () => {
    expect(formErrorsFor(apiError(400, { errors: { Title: ['x'] } }), ['title']).general).toBe('');
  });
});
