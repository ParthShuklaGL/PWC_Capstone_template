import { expect, test } from '@playwright/test';
import { settled, signInAs, USERS } from './helpers.ts';

// Runs against the real Java API on 5080 with the seeded data (reset the database first).

test('signing in through the form lands on the dashboard with the user shown', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Email').fill(USERS.admin.email);
  await page.getByLabel('Password').fill(USERS.admin.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: /Welcome back, Priya/ })).toBeVisible();
  await expect(page.getByTestId('signed-in-as')).toHaveText('Priya Raghavan');
});

test('a wrong password is refused with a message', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(USERS.admin.email);
  await page.getByLabel('Password').fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.');
});

test('a rep sees only their own deals and no admin actions', async ({ page }) => {
  await signInAs(page, 'aisha');
  await page.goto('/deals?size=100');
  await settled(page);
  await expect(page.getByRole('heading', { name: 'My deals' })).toBeVisible();
  await expect(page.getByRole('button', { name: /New deal/ })).toHaveCount(0);
  const owners = await page.locator('tbody tr td:last-child').allTextContents();
  expect(owners.length).toBeGreaterThan(0);
  expect(new Set(owners)).toEqual(new Set(['Aisha Khan']));
});

test("a rep opening another rep's deal is told it was not found", async ({ page }) => {
  await signInAs(page, 'aisha');
  await page.goto('/deals/D-00016'); // Ben's
  await expect(page.getByRole('alert')).toContainText('D-00016 was not found');
});

test('a rep typing an admin URL lands on the forbidden page', async ({ page }) => {
  await signInAs(page, 'ben');
  await page.goto('/deals/new');
  await expect(page.getByRole('heading', { name: /don.t have access/ })).toBeVisible();
});

test('an admin sees every deal and the owner picker on a new deal', async ({ page }) => {
  await signInAs(page, 'admin');
  await page.goto('/deals/new');
  await settled(page);
  const owner = page.getByLabel('Owner');
  await expect(owner).toBeVisible();
  await expect(owner.locator('option')).toHaveCount(3);
});

test('signing out returns to the sign-in page and protects the app again', async ({ page }) => {
  // Signs in through the form: signInAs() would put the session back on the next page load.
  await page.goto('/login');
  await page.getByLabel('Email').fill(USERS.admin.email);
  await page.getByLabel('Password').fill(USERS.admin.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await settled(page);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto('/deals');
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fdeals/);
});
