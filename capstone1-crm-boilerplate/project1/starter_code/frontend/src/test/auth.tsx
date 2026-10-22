import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { AuthContext, type AuthState } from '../auth/AuthContext.tsx';
import type { User } from '../types.ts';

export const ADMIN: User = {
  userRef: 'U-0001',
  displayName: 'Priya Raghavan',
  email: 'admin@nimbus.test',
  role: 'ADMIN',
};

export const REP: User = {
  userRef: 'U-0002',
  displayName: 'Aisha Khan',
  email: 'aisha@nimbus.test',
  role: 'USER',
};

/** Renders children as if `user` were signed in. */
export function SignedInAs({ user, children }: { user: User; children: ReactNode }) {
  const value: AuthState = {
    user,
    isAdmin: user.role === 'ADMIN',
    restoring: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
