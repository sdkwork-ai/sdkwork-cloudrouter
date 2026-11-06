#!/usr/bin/env node

/**
 * Fresh-cluster initialization regression.
 *
 * Static mode (always):
 *   - materializes and validates the application registry (identity, unique
 *     app id / template name / primary domain, tokens);
 *   - proves the install package/container ship `etc/iam`;
 *   - proves the deploy entrypoint initializes the database before serving and
 *     that first-boot secrets are generated.
 *
 * Database mode (`--db`, needs `SDKWORK_CLUSTER_REGRESSION_PG_URL` pointing at an
 * EMPTY canonical workspace database): runs the IAM fresh-cluster regression
 * example, which migrates, seeds, registers/enables every registry application,
 * seeds the bootstrap admin, and resolves a public token.
 *
 * Usage:
 *   node scripts/regression/fresh-cluster-init.mjs
 *   SDKWORK_CLUSTER_REGRESSION_PG_URL='postgres://.../sdkwork_ai_test_<id>' \
 *     node scripts/regression/fresh-cluster-init.mjs --db
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const iamRoot = path.resolve(repoRoot, '..', 'sdkwork-iam');
const registryRoot = path.join(repoRoot, 'dist', 'application-registry');
const registryPath = path.join(registryRoot, 'application-registry.json');
const dbMode = process.argv.includes('--db');
const results = [];

function record(name, run) {
  try {
    const detail = run();
    results.push({ name, ok: true, detail });
    return true;
  } catch (error) {
    results.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

record('materialize application registry', () => {
  run(process.execPath, [
    'scripts/materialize-application-registry.mjs',
    '--workspace', path.resolve(repoRoot, '..'),
    '--environment', 'production',
    '--out', registryRoot,
  ]);
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  assert(registry.applications.length >= 100, `unexpected application count ${registry.applications.length}`);
  const appIds = new Set();
  const names = new Set();
  const domains = new Map();
  for (const application of registry.applications) {
    assert(application.appId, 'application without appId');
    assert(!appIds.has(application.appId), `duplicate appId ${application.appId}`);
    appIds.add(application.appId);
    assert(application.name, `${application.appId} without name`);
    assert(!names.has(application.name), `duplicate template name ${application.name}`);
    names.add(application.name);
    assert(application.primaryDomain, `${application.appId} without primaryDomain`);
    const tenantDomains = domains.get(application.tenantId) ?? new Set();
    assert(!tenantDomains.has(application.primaryDomain), `duplicate domain ${application.primaryDomain}`);
    tenantDomains.add(application.primaryDomain);
    domains.set(application.tenantId, tenantDomains);
    assert(registry.tokens?.[application.appId]?.tokens?.standalone, `${application.appId} missing standalone token`);
  }
  return { applications: registry.applications.length };
});

record('registry drift check', () => {
  run(process.execPath, [
    'scripts/materialize-application-registry.mjs',
    '--workspace', path.resolve(repoRoot, '..'),
    '--environment', 'production',
    '--out', registryRoot,
    '--check',
  ]);
  return 'ok';
});

record('install package ships etc/iam', () => {
  const output = run(process.execPath, ['scripts/build-cloud-router-install-package.mjs', '--check', '--dry-run', '--all']);
  assert(output.includes('etc/iam'), 'install package plan does not include etc/iam');
  return 'ok';
});

record('container stages etc/iam and sets SDKWORK_APP_ROOT', () => {
  const containerBuilder = readFileSync(path.join(repoRoot, 'scripts/build-cloud-router-container.mjs'), 'utf8');
  assert(containerBuilder.includes("archivePath: 'etc/iam'"), 'container staging lacks etc/iam');
  const dockerfile = readFileSync(path.join(repoRoot, 'Dockerfile'), 'utf8');
  assert(/ENV SDKWORK_APP_ROOT=.*etc\/iam/u.test(dockerfile), 'Dockerfile does not set SDKWORK_APP_ROOT');
  return 'ok';
});

record('deploy initializes database before serving', () => {
  const builder = readFileSync(path.join(repoRoot, 'scripts/build-cloud-router-install-package.mjs'), 'utf8');
  const ensureIndex = builder.indexOf('installerBinaryName} ensure');
  const execIndex = builder.indexOf('packageItem.binaryName} "$@"');
  assert(ensureIndex > 0 && execIndex > ensureIndex, 'entrypoint does not run ensure before the gateway');
  return 'ok';
});

record('first-boot secrets are generated', () => {
  const deployScript = readFileSync(path.join(repoRoot, 'bin/docker-bundle-deploy.sh'), 'utf8');
  assert(deployScript.includes('ensure_first_boot_secrets'), 'deploy script lacks first-boot secret generation');
  assert(deployScript.includes('CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING'), 'missing key ring generation');
  assert(deployScript.includes('SDKWORK_IAM_SIGNING_MASTER_SECRET'), 'missing IAM signing secret generation');
  assert(deployScript.includes('SDKWORK_IAM_SUPER_ADMIN_PASSWORD'), 'missing admin password generation');
  const compose = readFileSync(path.join(repoRoot, 'deployments/docker/bundle/compose/docker-compose.bundle.yml'), 'utf8');
  for (const key of [
    'CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING',
    'SDKWORK_IAM_SIGNING_MASTER_SECRET',
    'SDKWORK_IAM_SUPER_ADMIN_PASSWORD',
  ]) {
    assert(compose.includes(key), `bundle compose does not pass ${key}`);
  }
  return 'ok';
});

if (dbMode) {
  record('empty database initializes and serves tokens', () => {
    const databaseUrl = process.env.SDKWORK_CLUSTER_REGRESSION_PG_URL;
    assert(databaseUrl, 'SDKWORK_CLUSTER_REGRESSION_PG_URL is required with --db');
    assert(existsSync(path.join(iamRoot, 'crates/sdkwork-iam-database-host/examples/fresh_cluster_regression.rs')),
      `IAM regression example not found under ${iamRoot}`);
    const stdout = run('cargo', [
      'run', '--quiet',
      '-p', 'sdkwork-iam-database-host',
      '--example', 'fresh_cluster_regression',
    ], {
      cwd: iamRoot,
      env: {
        ...process.env,
        SDKWORK_CLUSTER_REGRESSION_PG_URL: databaseUrl,
        SDKWORK_FRESH_CLUSTER_APP_ROOT: registryRoot,
      },
    });
    const resultLine = stdout.split(/\r?\n/u).reverse().find((line) => line.trim().startsWith('{'));
    assert(resultLine, `regression produced no JSON result: ${stdout.slice(-500)}`);
    const result = JSON.parse(resultLine);
    assert(result.status === 'ok', `regression status ${result.status}`);
    assert(result.tenants === 1, `expected one tenant, got ${result.tenants}`);
    assert(result.applicationsEnabled >= 100, `expected registered applications, got ${result.applicationsEnabled}`);
    assert(result.administrators >= 1, 'expected a bootstrap administrator');
    return result;
  });
}

const failed = results.filter((entry) => !entry.ok);
console.log(JSON.stringify({
  mode: dbMode ? 'static+db' : 'static',
  checks: results.length,
  failed: failed.length,
  results,
}, null, 2));
process.exitCode = failed.length === 0 ? 0 : 1;
