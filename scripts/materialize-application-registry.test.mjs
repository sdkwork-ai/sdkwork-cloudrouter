import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '..');
const script = path.join(repoRoot, 'scripts', 'materialize-application-registry.mjs');

function writeManifest(root, repo, app, overrides = {}) {
  const appRoot = path.join(root, repo, 'apps', app);
  mkdirSync(appRoot, { recursive: true });
  const manifest = {
    app: {
      key: overrides.appKey ?? app,
      name: overrides.name ?? `App ${app}`,
      appType: 'APP_REACT',
    },
    backend: {
      appId: overrides.appId ?? 'app-one',
      tenantId: overrides.tenantId ?? '100001',
      organizationId: '0',
      accessTokenPermissionScope: ['iam:self'],
      primaryDomain: overrides.primaryDomain ?? 'app-one.example.com',
    },
    runtime: { framework: 'react', family: 'web' },
  };
  writeFileSync(path.join(appRoot, 'agent.app.config.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

function run(args) {
  return JSON.parse(execFileSync(process.execPath, [script, ...args], { encoding: 'utf8' }));
}

test('materializes one identity from multiple surfaces and is idempotent', () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), 'registry-workspace-'));
  const out = mkdtempSync(path.join(os.tmpdir(), 'registry-out-'));
  writeManifest(workspace, 'sdkwork-demo', 'demo-pc', { name: 'Demo PC' });
  writeManifest(workspace, 'sdkwork-demo', 'demo-h5', { name: 'Demo H5' });

  const generated = run(['--workspace', workspace, '--environment', 'production', '--out', out]);
  assert.equal(generated.applications, 1);
  assert.equal(generated.manifests, 1);

  const registry = JSON.parse(readFileSync(path.join(out, 'application-registry.json'), 'utf8'));
  assert.equal(registry.applications.length, 1);
  assert.deepEqual(registry.applications[0].surfaces, ['sdkwork-demo/demo-pc', 'sdkwork-demo/demo-h5']);
  assert.equal(registry.applications[0].primaryDomain, 'app-one.example.com');
  const generatedManifest = JSON.parse(readFileSync(
    path.join(out, 'apps', 'app-one', 'agent.app.config.json'),
    'utf8',
  ));
  assert.equal(generatedManifest.backend.primaryDomain, 'app-one.example.com');
  assert.equal(registry.tokens['app-one'].environment, 'production');
  assert.ok(registry.tokens['app-one'].tokens.standalone);
  assert.ok(registry.tokens['app-one'].tokens.cloud);

  const check = run(['--workspace', workspace, '--environment', 'production', '--out', out, '--check']);
  assert.equal(check.check, 'ok');
});

test('OEM overlay re-brands names/domains without changing the token identity', () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), 'registry-workspace-'));
  const out = mkdtempSync(path.join(os.tmpdir(), 'registry-out-'));
  const oemOut = mkdtempSync(path.join(os.tmpdir(), 'registry-oem-'));
  writeManifest(workspace, 'sdkwork-demo', 'demo-pc');
  const overlayPath = path.join(workspace, 'oem.json');
  writeFileSync(overlayPath, JSON.stringify({
    applications: {
      'app-one': { name: 'Acme', displayName: 'Acme Console', primaryDomain: 'router.acme.example.com' },
    },
  }, null, 2));

  const base = run(['--workspace', workspace, '--environment', 'production', '--out', out]);
  assert.equal(base.applications, 1);
  const baseRegistry = JSON.parse(readFileSync(path.join(out, 'application-registry.json'), 'utf8'));

  const oem = run(['--workspace', workspace, '--environment', 'production', '--oem', overlayPath, '--out', oemOut]);
  assert.equal(oem.applications, 1);
  const oemRegistry = JSON.parse(readFileSync(path.join(oemOut, 'application-registry.json'), 'utf8'));
  assert.equal(oemRegistry.applications[0].name, 'Acme');
  assert.equal(oemRegistry.applications[0].primaryDomain, 'router.acme.example.com');
  assert.equal(oemRegistry.applications[0].appId, 'app-one');
  assert.equal(
    oemRegistry.tokens['app-one'].tokens.standalone,
    baseRegistry.tokens['app-one'].tokens.standalone,
  );

  const generatedManifest = JSON.parse(readFileSync(
    path.join(oemOut, 'apps', 'app-one', 'agent.app.config.json'),
    'utf8',
  ));
  assert.equal(generatedManifest.app.name, 'Acme');
  assert.equal(generatedManifest.backend.primaryDomain, 'router.acme.example.com');
});
