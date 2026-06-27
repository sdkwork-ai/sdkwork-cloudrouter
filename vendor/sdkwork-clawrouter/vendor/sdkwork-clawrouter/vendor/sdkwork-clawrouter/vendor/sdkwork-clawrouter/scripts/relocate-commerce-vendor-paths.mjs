#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const clawRouterRoot = path.resolve(scriptDir, '..');
const workspaceRoot = path.resolve(clawRouterRoot, '..');
const vendorCommerceRoot = path.join(clawRouterRoot, 'vendor', 'sdkwork-commerce');

const REPO_ROOTS = [
  clawRouterRoot,
  path.join(workspaceRoot, 'sdkwork-mall'),
  path.join(workspaceRoot, 'sdkwork-im'),
  path.join(workspaceRoot, 'sdkwork-notary'),
  workspaceRoot,
].filter((root) => existsSync(root));

const SKIP_DIR_NAMES = new Set(['node_modules', '.git', 'target', 'dist', 'build', '.turbo']);
const FILE_PATTERN = /\.(yaml|yml|json|toml|mjs|js|ts|tsx|py|md|rs)$/i;

const REPLACEMENTS = [
  {
    repos: [clawRouterRoot],
    pairs: [
      ['../../vendor/sdkwork-commerce', '../../vendor/sdkwork-commerce'],
      ['vendor/sdkwork-commerce', 'vendor/sdkwork-commerce'],
      ['ROOT / "vendor" / "sdkwork-commerce"', 'ROOT / "vendor" / "sdkwork-commerce"'],
      ['CLAWROUTER_ROOT / "vendor" / "sdkwork-commerce"', 'CLAWROUTER_ROOT / "vendor" / "sdkwork-commerce"'],
      ['COMMERCE_ROOT = ROOT / "vendor" / "sdkwork-commerce"', 'COMMERCE_ROOT = ROOT / "vendor" / "sdkwork-commerce"'],
      ['COMMERCE_ROOT = CLAWROUTER_ROOT / "vendor" / "sdkwork-commerce"', 'COMMERCE_ROOT = path.join(CLAWROUTER_ROOT, "vendor", "sdkwork-commerce")'],
      ['locator: vendor/sdkwork-commerce', 'locator: vendor/sdkwork-commerce'],
      ['appsRoot, \'sdkwork-commerce\'', 'clawRouterRoot, \'vendor\', \'sdkwork-commerce\''],
      ['path.join(appsRoot, \'sdkwork-commerce\')', 'path.join(clawRouterRoot, \'vendor\', \'sdkwork-commerce\')'],
    ],
  },
  {
    repos: [path.join(workspaceRoot, 'sdkwork-mall'), path.join(workspaceRoot, 'sdkwork-im'), path.join(workspaceRoot, 'sdkwork-notary')],
    pairs: [
      ['../../vendor/sdkwork-commerce', '../../../sdkwork-clawrouter/vendor/sdkwork-commerce'],
      ['vendor/sdkwork-commerce', '../sdkwork-clawrouter/vendor/sdkwork-commerce'],
    ],
  },
];

function walkFiles(root, visitor) {
  if (!existsSync(root)) {
    return;
  }
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    if (current.startsWith(vendorCommerceRoot)) {
      continue;
    }
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name)) {
          continue;
        }
        stack.push(fullPath);
        continue;
      }
      if (!FILE_PATTERN.test(entry.name)) {
        continue;
      }
      visitor(fullPath);
    }
  }
}

function applyReplacements(source, pairs) {
  let next = source;
  let changed = false;
  for (const [from, to] of pairs) {
    if (next.includes(from)) {
      next = next.split(from).join(to);
      changed = true;
    }
  }
  return { changed, next };
}

let touched = 0;
for (const rule of REPLACEMENTS) {
  for (const repoRoot of rule.repos) {
    walkFiles(repoRoot, (filePath) => {
      const original = readFileSync(filePath, 'utf8');
      const { changed, next } = applyReplacements(original, rule.pairs);
      if (!changed || next === original) {
        return;
      }
      writeFileSync(filePath, next, 'utf8');
      touched += 1;
      console.log(path.relative(workspaceRoot, filePath).replaceAll('\\', '/'));
    });
  }
}

console.log(`Updated ${touched} files for vendor/sdkwork-commerce relocation.`);
