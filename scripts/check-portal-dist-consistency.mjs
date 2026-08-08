#!/usr/bin/env node

// Portal dist consistency checker (PACKAGING_SPEC §5.4 / release gate).
//
// Verifies that apps/sdkwork-cloudrouter-pc/dist is self-consistent before a
// container image or install package is built: every /assets/* and
// /runtime-env.js reference in dist/index.html must resolve to an existing
// file inside the dist tree. A stale/mixed dist (index.html referencing a
// hashed chunk that was removed by a later build) ships JS requests that the
// gateway answers with the SPA fallback HTML, which browsers reject with
// "Failed to load module script ... MIME type text/html".
//
// Usage:
//   node scripts/check-portal-dist-consistency.mjs [--check] [--json]
// Exit code 0 = pass, 1 = violations, 2 = invocation error.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

const PORTAL_DIST = path.join(
  workspaceRoot,
  'apps',
  'sdkwork-cloudrouter-pc',
  'dist',
);
const INDEX_HTML = path.join(PORTAL_DIST, 'index.html');

// Resources served at runtime by the gateway/edge server instead of being
// static files in the dist tree (vite.config.ts RUNTIME_ENV_SCRIPT_PATH):
// the browser env injector must NOT be expected inside dist.
const RUNTIME_SERVED_REFERENCES = new Set(['/runtime-env.js']);

function parseArgs(argv = process.argv.slice(2)) {
  const settings = { check: false, json: false, help: false };
  for (const arg of argv) {
    switch (arg) {
      case '--check':
        settings.check = true;
        break;
      case '--json':
        settings.json = true;
        break;
      case '-h':
      case '--help':
        settings.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }
  return settings;
}

function collectAssetReferences(html) {
  const references = new Set();
  const pattern = /(?:src|href)="(\/(?:assets\/[^"?#]+|[^"?#]+\.(?:js|css)))"/gu;
  for (const match of html.matchAll(pattern)) {
    references.add(match[1]);
  }
  return [...references].sort();
}

function checkDistAt(distRoot) {
  const issues = [];
  const indexHtml = path.join(distRoot, 'index.html');
  if (!existsSync(distRoot)) {
    return { ok: false, issues: [`portal dist is missing: ${distRoot}`], references: [] };
  }
  if (!existsSync(indexHtml)) {
    return { ok: false, issues: [`portal index.html is missing: ${indexHtml}`], references: [] };
  }
  const html = readFileSync(indexHtml, 'utf8');
  const references = collectAssetReferences(html).filter(
    (reference) => !RUNTIME_SERVED_REFERENCES.has(reference),
  );
  if (references.length === 0) {
    return {
      ok: false,
      issues: ['portal index.html declares no static asset references (empty or malformed build)'],
      references,
    };
  }
  for (const reference of references) {
    const target = path.join(distRoot, reference);
    if (!existsSync(target)) {
      issues.push(
        `portal dist is inconsistent: index.html references ${reference} but ${path.relative(workspaceRoot, target)} does not exist (rebuild the portal before packaging)`,
      );
    }
  }
  return { ok: issues.length === 0, issues, references };
}

function checkDistConsistency() {
  return checkDistAt(PORTAL_DIST);
}

function main() {
  let settings;
  try {
    settings = parseArgs();
  } catch (error) {
    console.error(`check-portal-dist-consistency: ${error.message}`);
    process.exit(2);
  }
  if (settings.help) {
    console.log(
      'Usage: node scripts/check-portal-dist-consistency.mjs [--check] [--json]\n'
      + 'Verifies every /assets reference in the portal dist index.html resolves to a file.',
    );
    process.exit(0);
  }

  const result = checkDistConsistency();
  if (settings.json) {
    console.log(JSON.stringify({ ok: result.ok, issues: result.issues }, null, 2));
  } else {
    if (result.ok) {
      console.log(
        `check-portal-dist-consistency: PASS (${result.references.length} asset references resolve)`,
      );
    } else {
      for (const issue of result.issues) {
        console.error(`check-portal-dist-consistency: ${issue}`);
      }
    }
  }
  process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

export { checkDistAt, checkDistConsistency, collectAssetReferences, PORTAL_DIST, INDEX_HTML };
