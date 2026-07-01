#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pcRoot = path.join(repoRoot, 'apps', 'sdkwork-clawrouter-pc');
const workspaceYamlPath = [
  path.join(repoRoot, 'pnpm-workspace.yaml'),
  path.join(pcRoot, 'pnpm-workspace.yaml'),
].find((candidate) => existsSync(candidate));

if (!workspaceYamlPath) {
  console.error('Missing pnpm-workspace.yaml at repository root or apps/sdkwork-clawrouter-pc/');
  process.exit(1);
}

const workspaceYaml = readFileSync(workspaceYamlPath, 'utf8');
const pkgGlobs = [...workspaceYaml.matchAll(/^  - ['"]?(.+?)['"]?\s*$/gm)]
  .map((m) => m[1])
  .filter((p) => !p.startsWith('#') && !p.startsWith('catalog'));

const workspaceRoot = workspaceYamlPath.startsWith(pcRoot) ? pcRoot : repoRoot;

function expandGlob(globPath) {
  if (!globPath.includes('*')) {
    const abs = path.resolve(workspaceRoot, globPath);
    const pj = path.join(abs, 'package.json');
    if (!existsSync(pj)) return [];
    const pkg = JSON.parse(readFileSync(pj, 'utf8').replace(/^\uFEFF/, ''));
    return [{ name: pkg.name, path: globPath }];
  }
  const abs = path.resolve(workspaceRoot, globPath);
  const dir = path.dirname(abs);
  const pattern = path.basename(abs);
  if (!existsSync(dir)) return [];
  const starIdx = pattern.indexOf('*');
  const prefix = pattern.slice(0, starIdx);
  const suffix = pattern.slice(starIdx + 1);
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith(prefix)) continue;
    const candidate = path.join(dir, entry.name + suffix, 'package.json');
    if (!existsSync(candidate)) continue;
    const raw = readFileSync(candidate, 'utf8').replace(/^\uFEFF/, '');
    const pkg = JSON.parse(raw);
    out.push({
      name: pkg.name,
      path: path.relative(pcRoot, path.dirname(candidate)).replace(/\\/g, '/'),
    });
  }
  return out;
}

const workspacePkgs = new Map();
for (const glob of pkgGlobs) {
  for (const pkg of expandGlob(glob)) {
    workspacePkgs.set(pkg.name, pkg.path);
  }
}
for (const entry of readdirSync(path.join(pcRoot, 'packages'), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const pj = path.join(pcRoot, 'packages', entry.name, 'package.json');
  if (!existsSync(pj)) continue;
  const pkg = JSON.parse(readFileSync(pj, 'utf8'));
  workspacePkgs.set(pkg.name, `packages/${entry.name}`);
}
workspacePkgs.set('sdkwork-clawrouter-pc', '.');

const missing = new Map();
function scan(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      scan(full);
      continue;
    }
    if (entry.name !== 'package.json') continue;
    const pkg = JSON.parse(readFileSync(full, 'utf8'));
    const rel = path.relative(pcRoot, path.dirname(full)).replace(/\\/g, '/');
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const [dep, spec] of Object.entries(pkg[section] ?? {})) {
        if (spec === 'workspace:*' && !workspacePkgs.has(dep)) {
          if (!missing.has(dep)) missing.set(dep, new Set());
          missing.get(dep).add(rel || '.');
        }
      }
    }
  }
}
scan(pcRoot);

console.log(`Missing workspace packages: ${missing.size}`);
for (const name of [...missing.keys()].sort()) {
  const importers = [...missing.get(name)].sort();
  console.log(`\n${name}`);
  for (const importer of importers.slice(0, 5)) {
    console.log(`  - ${importer}`);
  }
  if (importers.length > 5) console.log(`  ... +${importers.length - 5} more`);
}
