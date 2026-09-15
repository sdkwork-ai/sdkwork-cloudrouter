#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const GUARD = path.join(REPO_ROOT, 'scripts', 'check-dev-bootstrap-coverage.mjs');

const BOOTSTRAP_MODULE = 'scripts/lib/ensure-cloud-router-node-deps.mjs';
const BOOTSTRAP_PREFIX = `node ${BOOTSTRAP_MODULE} && `;
const VALID_BOOTSTRAP_SOURCE = [
  "import { spawnSync } from 'node:child_process';",
  "import { symlinkSync } from 'node:fs';",
  'export function directoryLinksSupported() { try { symlinkSync(\'a\', \'b\', \'junction\'); return true; } catch { return false; } }',
  "const install = spawnSync('pnpm', ['install', '--no-frozen-lockfile']);",
  "throw new Error('Missing sibling repository sdkwork-app-topology');",
  'export function ensureCloudRouterNodeDeps() { return install; }',
  "const __filename = 'fixture-bootstrap.mjs';",
  'if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {',
  '  ensureCloudRouterNodeDeps();',
  '}',
].join('\n');

function makeFixtureRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudrouter-dev-bootstrap-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'scripts', 'lib'), { recursive: true });
  fs.writeFileSync(path.join(root, BOOTSTRAP_MODULE), VALID_BOOTSTRAP_SOURCE);
  return root;
}

function writeManifest(root, scripts) {
  fs.writeFileSync(
    path.join(root, 'package.json'),
    `${JSON.stringify({ name: 'fixture', private: true, scripts }, null, 2)}\n`,
  );
}

function runGuard(root) {
  const result = spawnSync(process.execPath, [GUARD, '--root', root], { encoding: 'utf8' });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

function fullyBootstrappedScripts() {
  return {
    dev: 'pnpm dev:standalone',
    'dev:standalone': `${BOOTSTRAP_PREFIX}pnpm exec sdkwork-app dev --deployment-profile standalone`,
    build: `${BOOTSTRAP_PREFIX}pnpm exec sdkwork-app build`,
    test: `${BOOTSTRAP_PREFIX}pnpm exec sdkwork-app test`,
    'test:tooling': 'node scripts/run-cloud-router-application.test.mjs',
  };
}

test('accepts a manifest whose facade invocations are all bootstrapped', (t) => {
  const root = makeFixtureRoot(t);
  writeManifest(root, fullyBootstrappedScripts());
  const { status, output } = runGuard(root);
  assert.equal(status, 0, output);
  assert.match(output, /check-dev-bootstrap-coverage: OK/u);
});

test('rejects a facade invocation without the bootstrap prefix', (t) => {
  const root = makeFixtureRoot(t);
  writeManifest(root, {
    ...fullyBootstrappedScripts(),
    build: 'pnpm exec sdkwork-app build',
  });
  const { status, output } = runGuard(root);
  assert.equal(status, 1);
  assert.match(output, /build: invokes the sdkwork-app facade without bootstrapping/u);
});

test('rejects a delegating entrypoint whose target lost the bootstrap prefix', (t) => {
  const root = makeFixtureRoot(t);
  const scripts = fullyBootstrappedScripts();
  scripts['dev:standalone'] = 'pnpm exec sdkwork-app dev --deployment-profile standalone';
  writeManifest(root, scripts);
  const { status, output } = runGuard(root);
  assert.equal(status, 1);
  assert.match(output, /dev:standalone: invokes the sdkwork-app facade without bootstrapping/u);
});

test('rejects a bootstrap module with no CLI main guard', (t) => {
  const root = makeFixtureRoot(t);
  fs.writeFileSync(
    path.join(root, BOOTSTRAP_MODULE),
    [
      "import { spawnSync } from 'node:child_process';",
      "import { symlinkSync } from 'node:fs';",
      'export function directoryLinksSupported() { try { symlinkSync(\'a\', \'b\', \'junction\'); return true; } catch { return false; } }',
      "const install = spawnSync('pnpm', ['install']);",
      "throw new Error('Missing sibling repository sdkwork-app-topology');",
      'export function ensureCloudRouterNodeDeps() { return install; }',
      '',
    ].join('\n'),
  );
  writeManifest(root, fullyBootstrappedScripts());
  const { status, output } = runGuard(root);
  assert.equal(status, 1);
  assert.match(output, /missing the CLI main guard/u);
});

test('rejects a dev script that no longer delegates to dev:standalone', (t) => {
  const root = makeFixtureRoot(t);
  writeManifest(root, {
    ...fullyBootstrappedScripts(),
    dev: `${BOOTSTRAP_PREFIX}pnpm exec sdkwork-app dev --deployment-profile standalone`,
  });
  const { status, output } = runGuard(root);
  assert.equal(status, 1);
  assert.match(output, /dev: must stay exactly "pnpm dev:standalone"/u);
});

test('the real repository manifest passes the guard', () => {
  const { status, output } = runGuard(REPO_ROOT);
  assert.equal(status, 0, output);
});
