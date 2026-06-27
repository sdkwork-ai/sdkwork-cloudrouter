#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const expectedPcPackageDirs = [
  'sdkwork-mcp-pc-admin',
  'sdkwork-mcp-pc-admin-core',
  'sdkwork-mcp-pc-commons',
  'sdkwork-mcp-pc-console',
  'sdkwork-mcp-pc-core',
  'sdkwork-mcp-pc-hub',
  'sdkwork-mcp-pc-shell',
];

const expectedH5PackageDirs = [
  'sdkwork-mcp-h5-commons',
  'sdkwork-mcp-h5-core',
  'sdkwork-mcp-h5-mcp',
  'sdkwork-mcp-h5-shell',
];

function listPackageDirs(appRoot) {
  const packagesRoot = path.join(repoRoot, appRoot, 'packages');
  return fs
    .readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

test('pc package directories follow sdkwork-mcp naming', () => {
  const dirs = listPackageDirs('apps/sdkwork-mcp-pc');
  assert.deepEqual(dirs, expectedPcPackageDirs);
  for (const dirName of dirs) {
    assert.match(dirName, /^sdkwork-mcp-pc-/);
    assert.doesNotMatch(dirName, /skills|agents/i);
  }
});

test('h5 package directories follow sdkwork-mcp naming', () => {
  const dirs = listPackageDirs('apps/sdkwork-mcp-h5');
  assert.deepEqual(dirs, expectedH5PackageDirs);
  for (const dirName of dirs) {
    assert.match(dirName, /^sdkwork-mcp-h5-/);
    assert.doesNotMatch(dirName, /skills|agents/i);
  }
});

test('tracked docs and app configs must not reference legacy skills/agents package paths', () => {
  const legacyPathPatterns = [
    /sdkwork-skills-pc/i,
    /sdkwork-agents-h5/i,
    /packages\/sdkwork-skills/i,
    /packages\/sdkwork-agents/i,
  ];
  const scanRoots = ['apps', 'docs', 'tests'];
  const allowedLegacyFiles = new Set([
    path.join(repoRoot, 'scripts/bootstrap-mcp-workspace.mjs'),
    path.join(repoRoot, 'tools/check_sdkwork_mcp_architecture_alignment.mjs'),
    path.join(repoRoot, 'tests/static/mcp-app-package-naming.test.mjs'),
  ]);
  const filePattern = /\.(md|json|ts|tsx|mjs|yaml|yml|env\.example)$/i;

  for (const scanRoot of scanRoots) {
    const absoluteRoot = path.join(repoRoot, scanRoot);
    const stack = [absoluteRoot];
    while (stack.length > 0) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'target') {
          continue;
        }
        const absolutePath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(absolutePath);
          continue;
        }
        if (!filePattern.test(entry.name) || allowedLegacyFiles.has(absolutePath)) {
          continue;
        }
        const content = fs.readFileSync(absolutePath, 'utf8');
        for (const pattern of legacyPathPatterns) {
          assert.doesNotMatch(
            content,
            pattern,
            `${path.relative(repoRoot, absolutePath)} must not reference legacy package paths`,
          );
        }
      }
    }
  }
});

test('package npm names align with sdkwork-mcp application code', () => {
  for (const [appRoot, dirs] of [
    ['apps/sdkwork-mcp-pc', expectedPcPackageDirs],
    ['apps/sdkwork-mcp-h5', expectedH5PackageDirs],
  ]) {
    for (const dirName of dirs) {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(repoRoot, appRoot, 'packages', dirName, 'package.json'), 'utf8'),
      );
      assert.match(packageJson.name, /mcp/);
      assert.doesNotMatch(packageJson.name, /@sdkwork\/(skills|agents)/);
    }
  }
});

test('package manifests declare sdkwork metadata and workspace dependencies', () => {
  for (const [appRoot, dirs] of [
    ['apps/sdkwork-mcp-pc', expectedPcPackageDirs],
    ['apps/sdkwork-mcp-h5', expectedH5PackageDirs],
  ]) {
    for (const dirName of dirs) {
      const packageJsonPath = path.join(repoRoot, appRoot, 'packages', dirName, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      assert.equal(packageJson.sdkwork?.workspace, 'sdkwork-mcp');
      assert.equal(packageJson.sdkwork?.domain, 'intelligence');
      for (const [depName, depValue] of Object.entries(packageJson.dependencies ?? {})) {
        if (depName.startsWith('@sdkwork/')) {
          assert.equal(depValue, 'workspace:*', `${dirName} must use workspace:* for ${depName}`);
        }
      }
    }
  }
});

test('client commons marketplace filters use @sdkwork/utils', () => {
  for (const relativePath of [
    'apps/sdkwork-mcp-pc/packages/sdkwork-mcp-pc-commons/src/marketplaceFilters.ts',
    'apps/sdkwork-mcp-h5/packages/sdkwork-mcp-h5-commons/src/marketplaceFilters.ts',
  ]) {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
    assert.match(source, /@sdkwork\/utils/);
    assert.match(source, /filterMarketplaceServers/);
    assert.doesNotMatch(source, /skillPackages|agentService/i);
  }
});

test('component specs reference canonical package directories', () => {
  for (const [appRoot, dirs] of [
    ['apps/sdkwork-mcp-pc', expectedPcPackageDirs],
    ['apps/sdkwork-mcp-h5', expectedH5PackageDirs],
  ]) {
    for (const dirName of dirs) {
      const specPath = path.join(repoRoot, appRoot, 'packages', dirName, 'specs/component.spec.json');
      assert.ok(fs.existsSync(specPath), `${specPath} must exist`);
      const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
      assert.equal(spec.component?.root, `${appRoot}/packages/${dirName}`);
    }
  }
});
