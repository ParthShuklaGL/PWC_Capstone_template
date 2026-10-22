#!/usr/bin/env node
// Builds the two shippable codebases from this starter_code folder:
//
//   nimbus-crm-api   the Java backend + participant kit (docs, db-setup, screenshots, cross-check)
//   nimbus-crm-web   the reference React front end (mentors' demo)
//
//   node export/export-repos.mjs [outDir]      default outDir: ../repos
//
// Each target is replaced except for its .git folder, so re-running after a change and
// committing in the target repo gives a clean history.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const starter = resolve(here, '..');
const out = resolve(process.argv[2] ?? join(starter, '..', 'repos'));

const SKIP = new Set(['node_modules', 'target', 'dist', 'test-results', 'playwright-report', '.git']);
const filter = (src) => !SKIP.has(src.split(/[\\/]/).pop());

function fresh(dir) {
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir)) {
    if (entry !== '.git') rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

function copy(from, to) {
  cpSync(join(starter, from), to, { recursive: true, filter });
}

// --- nimbus-crm-api -------------------------------------------------------------------
const api = join(out, 'nimbus-crm-api');
fresh(api);
copy('backend-java', join(api, 'backend-java'));
copy('db-setup', join(api, 'db-setup'));
copy('scripts/crosscheck-backend.mjs', join(api, 'scripts', 'crosscheck-backend.mjs'));
for (const doc of ['stakeholder-brief.md', 'user-stories.md', 'bug-CRM-142.md', 'review-checklist.md', 'sample-leads.csv', 'specs', 'screenshots']) {
  copy(join('docs', doc), join(api, 'docs', doc));
}
copy('export/api-README.md', join(api, 'README.md'));
copy('export/compose.yaml', join(api, 'compose.yaml'));
copy('export/api.gitignore', join(api, '.gitignore'));

// --- nimbus-crm-web -------------------------------------------------------------------
const web = join(out, 'nimbus-crm-web');
fresh(web);
copy('frontend', web);
copy('docs/screenshots', join(web, 'screenshots'));
copy('export/web-README.md', join(web, 'README.md'));
copy('export/web.gitignore', join(web, '.gitignore'));

for (const dir of [api, web]) {
  console.log(`${dir}${existsSync(join(dir, '.git')) ? ' (existing git repo kept)' : ''}`);
}
