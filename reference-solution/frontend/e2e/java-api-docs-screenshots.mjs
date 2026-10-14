// Screenshots of the Java backend's API documentation: its own OpenAPI document (/openapi/v1.json, dev profile)
// shown in the Scalar viewer, the same viewer the .NET API serves at /scalar. The Java backend has no docs page of its
// own (that would need another dependency), so this fetches the document and renders it in the browser from the CDN.
// Needs the Java CRM running on http://localhost:5091 (java-crm/run.ps1) and internet access for the viewer script.
//   SCREENSHOT_DIR=screenshots/java node e2e/java-api-docs-screenshots.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './browser.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(process.env.SCREENSHOT_DIR ?? path.join(here, '../../screenshots/java'));
fs.mkdirSync(OUT, { recursive: true });
const API = process.env.API_URL ?? 'http://localhost:5091';

const spec = await (await fetch(`${API}/openapi/v1.json`)).text();
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Java CRM API</title></head><body>
<script id="api-reference" type="application/json">${spec.replace(/</g, '\\u003c')}</script>
<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script></body></html>`;

const browser = await launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.route('http://docs.local/', (route) => route.fulfill({ contentType: 'text/html', body: html }));
  await page.goto('http://docs.local/', { waitUntil: 'networkidle' });
  await page.getByText('Introduction', { exact: true }).first().waitFor({ timeout: 30000 });

  for (const group of ['accounts', 'contacts', 'deals', 'reports']) {
    const item = page.locator('aside, nav, [class*=sidebar]').getByText(new RegExp(`^${group}$`, 'i')).first();
    if (await item.count()) {
      await item.click();
      await page.waitForTimeout(250);
    }
  }
  await page.getByText('Introduction', { exact: true }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, '23-api-docs-endpoints.png') });
  await context.close();
} finally {
  await browser.close();
}
console.log(`Saved 1 screenshot to ${OUT}`);
