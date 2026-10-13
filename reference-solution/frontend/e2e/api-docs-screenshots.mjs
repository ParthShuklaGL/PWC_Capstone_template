// Screenshots of the API's own documentation page (Scalar), which lists every endpoint the API serves.
// Needs the API running in Development on http://localhost:5090.
//   node e2e/api-docs-screenshots.mjs        writes into ../../nimbus_crm/docs/screenshots
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './browser.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(process.env.SCREENSHOT_DIR ?? path.join(here, '../../../nimbus_crm/docs/screenshots'));
fs.mkdirSync(OUT, { recursive: true });
const API = process.env.API_URL ?? 'http://localhost:5090';

const browser = await launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(`${API}/scalar`, { waitUntil: 'networkidle' });
  await page.getByText('Introduction', { exact: true }).first().waitFor();

  // Open every group in the sidebar so all the endpoints are listed at once.
  for (const group of ['Accounts', 'Contacts', 'Deals', 'Reports']) {
    await page.locator('aside, nav, [class*=sidebar]').getByText(group, { exact: true }).first().click();
    await page.waitForTimeout(250);
  }
  await page.getByText('Introduction', { exact: true }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, '10-api-docs-endpoints.png') });

  // One operation in detail: creating a deal.
  await page.goto(`${API}/scalar#tag/deals/POST/api/deals`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, '11-api-docs-create-deal.png') });
  await context.close();
} finally {
  await browser.close();
}
console.log(`Saved 2 screenshots to ${OUT}`);
