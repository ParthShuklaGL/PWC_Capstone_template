import { expect, type Page } from '@playwright/test';

export const USERS = {
  admin: { email: 'admin@nimbus.test', password: 'Admin#2026' },
  aisha: { email: 'aisha@nimbus.test', password: 'Rep#2026' },
  ben: { email: 'ben@nimbus.test', password: 'Rep#2026' },
} as const;

/**
 * Signs in through the API (fast, and not what most tests are about) and puts the session
 * where the app looks for it. One test in auth.spec.ts signs in through the form instead.
 */
export async function signInAs(page: Page, who: keyof typeof USERS) {
  const response = await page.request.post('/api/auth/login', { data: USERS[who] });
  expect(response.ok(), `sign in as ${who}`).toBeTruthy();
  const { token, user } = await response.json();
  await page.addInitScript(
    ([t, u]) => {
      if (!sessionStorage.getItem('nimbus.token')) {
        sessionStorage.setItem('nimbus.token', t);
        sessionStorage.setItem('nimbus.user', u);
      }
    },
    [token, JSON.stringify(user)],
  );
}

/** Waits until no loading spinner is on the page. */
export async function settled(page: Page) {
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.spinner-border')).toHaveCount(0);
}
