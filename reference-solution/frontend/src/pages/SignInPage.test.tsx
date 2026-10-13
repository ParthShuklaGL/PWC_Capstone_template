import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/http.ts';
import { AuthContext, type AuthContextValue } from '../auth/AuthContext.tsx';
import SignInPage from './SignInPage.tsx';

function renderPage(overrides: Partial<AuthContextValue> = {}) {
  const value: AuthContextValue = {
    status: 'signedOut',
    me: null,
    notice: '',
    signIn: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return value;
}

const fill = async (label: RegExp | string, text: string) => userEvent.type(screen.getByLabelText(label), text);

describe('SignInPage', () => {
  it('signs in with the chosen method', async () => {
    const auth = renderPage();

    await userEvent.selectOptions(screen.getByLabelText('Sign-in method'), 'Cookie');
    await fill('Username', 'demo');
    await fill('Password', 'secret-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(auth.signIn).toHaveBeenCalledWith('Cookie', 'demo', 'secret-password');
  });

  it('shows the server message for a wrong password, and flags no field', async () => {
    renderPage({
      signIn: vi.fn().mockRejectedValue(new ApiError(401, { detail: 'Invalid username or password.' }, 'x')),
    });

    await fill('Username', 'demo');
    await fill('Password', 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password.');
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'false');
  });

  it('puts each server field message beside the right input when registering', async () => {
    renderPage({
      register: vi.fn().mockRejectedValue(
        new ApiError(
          400,
          { errors: { Username: ['Username must be 3 to 50 characters.'], Password: ['Password must be at least 10 characters.'] } },
          'x',
        ),
      ),
    });

    await userEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    await fill('Username', 'x');
    await fill('Email', 'x@example.com');
    await fill('Password', 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Create account and sign in' }));

    // Once a field has an error, the message sits inside its label, so match the label by its start.
    const usernameField = (await screen.findByLabelText(/^Username/)).closest('label')!;
    const passwordField = screen.getByLabelText(/^Password/).closest('label')!;
    expect(within(usernameField).getByText('Username must be 3 to 50 characters.')).toBeInTheDocument();
    expect(within(passwordField).getByText('Password must be at least 10 characters.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Username/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a 409 as a message, not against a field', async () => {
    renderPage({
      register: vi.fn().mockRejectedValue(new ApiError(409, { detail: 'That username is already taken.' }, 'x')),
    });

    await userEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    await fill('Username', 'demo');
    await fill('Email', 'demo@example.com');
    await fill('Password', 'long-enough-password');
    await userEvent.click(screen.getByRole('button', { name: 'Create account and sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That username is already taken.');
  });

  it('disables the button while the request runs, so a double click cannot send it twice', async () => {
    const signIn = vi.fn().mockReturnValue(new Promise(() => undefined));
    renderPage({ signIn });

    await fill('Username', 'demo');
    await fill('Password', 'secret-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    const waiting = screen.getByRole('button', { name: 'Please wait…' });
    expect(waiting).toBeDisabled();
    await userEvent.click(waiting);
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it('clears an old error when switching between sign-in and create-account', async () => {
    renderPage({ signIn: vi.fn().mockRejectedValue(new ApiError(401, { detail: 'Invalid username or password.' }, 'x')) });
    await fill('Username', 'demo');
    await fill('Password', 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByRole('alert');

    await userEvent.click(screen.getByRole('button', { name: 'Create an account' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains why the user is back here after a session ended', () => {
    renderPage({ notice: 'Your session ended. Please sign in again.' });

    expect(screen.getByRole('status')).toHaveTextContent('Your session ended.');
  });
});
