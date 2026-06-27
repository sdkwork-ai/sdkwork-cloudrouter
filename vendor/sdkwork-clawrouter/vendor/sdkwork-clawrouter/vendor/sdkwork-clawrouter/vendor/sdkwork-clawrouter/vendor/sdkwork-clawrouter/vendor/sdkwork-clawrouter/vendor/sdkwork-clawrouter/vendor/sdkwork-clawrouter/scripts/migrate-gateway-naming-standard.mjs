#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SKIP_DIRS = new Set(['node_modules', 'target', '.git', 'generated', 'dist', '.pnpm-store']);
const SKIP_SUFFIXES = ['Cargo.lock', '.png', '.jpg', '.zip', '.wasm'];

const REPLACEMENTS = [
  ['crates/sdkwork-clawrouter-cloud-gateway', 'crates/sdkwork-clawrouter-cloud-gateway'],
  ['sdkwork_clawrouter_cloud_gateway', 'sdkwork_clawrouter_cloud_gateway'],
  ['sdkwork-clawrouter-cloud-gateway', 'sdkwork-clawrouter-cloud-gateway'],
];

function shouldSkipDir(name) {
  return SKIP_DIRS.has(name);
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (shouldSkipDir(entry)) {
      continue;
    }
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (fullPath.includes(`${path.sep}docs${path.sep}archive${path.sep}`)) {
        continue;
      }
      if (fullPath.includes(`${path.sep}docs${path.sep}superpowers${path.sep}`)) {
        continue;
      }
      walk(fullPath, files);
      continue;
    }
    if (SKIP_SUFFIXES.some((suffix) => entry.endsWith(suffix))) {
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

let changed = 0;
for (const filePath of walk(root)) {
  const relative = path.relative(root, filePath);
  if (relative === 'scripts/migrate-gateway-naming-standard.mjs') {
    continue;
  }
  let text;
  try {
    text = readFileSync(filePath, 'utf8');
  } catch {
    continue;
  }
  if (!text.includes('sdkwork-clawrouter-cloud-gateway') && !text.includes('sdkwork_clawrouter_cloud_gateway')) {
    continue;
  }
  let next = text;
  for (const [from, to] of REPLACEMENTS) {
    next = next.split(from).join(to);
  }
  if (next !== text) {
    writeFileSync(filePath, next, 'utf8');
    changed += 1;
  }
}

console.log(`Updated ${changed} files for gateway naming migration.`);
