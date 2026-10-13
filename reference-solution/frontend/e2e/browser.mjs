// Shared set-up for the browser scripts: which app to test, which accounts to use, which browser to drive.
import fs from 'node:fs';
import { chromium } from 'playwright-core';

/** The running app. Start it first (see ../../README.md); override with UI_URL if you run it elsewhere. */
export const BASE = process.env.UI_URL ?? 'http://localhost:5180/';

/** The development accounts the API seeds in Development (published on purpose; never use them elsewhere). */
export const ADMIN = { username: process.env.ADMIN_USER ?? 'admin', password: process.env.ADMIN_PASSWORD ?? 'Admin#Dev-2026!' };
export const DEMO = { username: process.env.DEMO_USER ?? 'demo', password: process.env.DEMO_PASSWORD ?? 'User#Dev-2026!' };

const CANDIDATES = [
  process.env.BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

/** Drives the Edge or Chrome that is already installed, so no browser has to be downloaded. */
export function launch() {
  const executablePath = CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!executablePath) {
    throw new Error('No Edge or Chrome found. Set BROWSER_PATH to the browser executable.');
  }
  return chromium.launch({ executablePath, headless: true });
}

export async function signIn(page, mode, { username, password }) {
  await page.getByLabel('Sign-in method').selectOption(mode);
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

export async function freshPage(browser, { width = 1100, height = 800, colorScheme = 'light', acceptDownloads = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme, acceptDownloads, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(BASE);
  return { context, page };
}
