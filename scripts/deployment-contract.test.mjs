// deployment-contract.test.mjs — locks the standalone Docker deployment
// channel capabilities for sdkwork-cloudrouter (DEPLOYMENT_SPEC.md §6 /
// OPERATIONS_SPEC.md §3). Pure source assertions: any regression that drops a
// deployer capability (preflight, --set, --check-config, DEPS_MODE chain,
// lifecycle actions) or breaks the env-file key contract fails here before it
// can reach a live bundle.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const appRoot = path.resolve('.');
const deployScript = path.join(appRoot, 'deployments', 'docker', 'bundle', 'deploy.sh');
const releaseScript = path.join(appRoot, 'deployments', 'docker', 'bundle', 'release.sh');
const composeScript = path.join(appRoot, 'deployments', 'docker', 'bundle', 'compose', 'docker-compose.bundle.yml');
const environments = ['development', 'test', 'staging', 'demo', 'production'];

const deploy = () => readFileSync(deployScript, 'utf8');
const release = () => readFileSync(releaseScript, 'utf8');
const compose = () => readFileSync(composeScript, 'utf8');

test('deploy.sh accepts the five canonical lifecycle environments', () => {
  const source = deploy();
  assert.match(source, /development\|test\|staging\|demo\|production/u);
});

test('deploy.sh keeps the fail-closed env preflight contract', () => {
  const source = deploy();
  // Collect-all required-key check with dual fix guidance (--set first).
  assert.match(source, /require_env_key\(\)/u);
  assert.match(source, /fix 1 \(recommended\): \$0 --environment \$\{ENVIRONMENT\} --set/u);
  assert.match(source, /fix 2: edit \$\{ENV_FILE\}/u);
  // Placeholder detection and numeric/ssl-mode validation stay fail-closed.
  assert.match(source, /is_unconfigured\(\)/u);
  assert.match(source, /<CHANGE_ME>/u);
  assert.match(source, /must be numeric/u);
  // External-mode live probes: PostgreSQL auth + Redis ping.
  assert.match(source, /probe_external_postgres\(\)/u);
  assert.match(source, /probe_external_redis\(\)/u);
  assert.match(source, /PREFLIGHT_FAIL/u);
});

test('deploy.sh supports --check-config (check only, deploy nothing)', () => {
  const source = deploy();
  assert.match(source, /--check-config\) ACTION="check-config"/u);
  assert.match(source, /configuration check only: nothing was deployed/u);
});

test('deploy.sh supports --set / --force-set without rewriting configured values', () => {
  const source = deploy();
  assert.match(source, /--set\) /u);
  assert.match(source, /--force-set\) /u);
  assert.match(source, /set_env_key\(\)/u);
  assert.match(source, /deploy never rewrites configured values/u);
  assert.match(source, /--force-set \$\{key\} '<new-value>'/u);
});

test('deploy.sh supports --env-file with an existing-file guard', () => {
  const source = deploy();
  assert.match(source, /--env-file\)\s+OPT_ENV_FILE="\$2"/u);
  assert.match(source, /--env-file: file not found/u);
});

test('deploy.sh keeps the dependency-mode resolution chain (flag > env key > external)', () => {
  const source = deploy();
  assert.match(source, /DEPS_MODE_FLAG=""/u);
  assert.match(source, /env_key SDKWORK_CLOUDROUTER_DEPS_MODE/u);
  assert.match(source, /unsupported SDKWORK_CLOUDROUTER_DEPS_MODE/u);
  assert.match(source, /DEPS_MODE_FLAG\}" = "embedded" \] && EXTERNAL="0"/u);
});

test('deploy.sh keeps the stop/start/restart lifecycle and instance safety net', () => {
  const source = deploy();
  assert.match(source, /stop_fleet\(\)/u);
  assert.match(source, /start_fleet\(\)/u);
  assert.match(source, /restart_fleet\(\)/u);
  assert.match(source, /--stop\)\s+ACTION="stop"/u);
  assert.match(source, /--start\)\s+ACTION="start"/u);
  assert.match(source, /--restart\)\s+ACTION="restart"/u);
  // Extra instance projects beyond --replicas are torn down/stopped too.
  assert.match(source, /discover_instance_projects\(\)/u);
  assert.match(source, /discovered extra instance project beyond replicas/u);
});

test('release.sh keeps the six lifecycle subcommands and env-file passthrough', () => {
  const source = release();
  assert.match(
    source,
    /<deploy\|rollback\|status\|history\|verify\|versions>/u,
  );
  assert.match(source, /--env-file\)\s+OPT_ENV_FILE="\$2"/u);
  assert.match(source, /--env-file: file not found/u);
  // deploy.sh forwarding includes the env file when provided.
  assert.match(source, /args\+=\(--env-file "\$\{OPT_ENV_FILE\}"\)/u);
  assert.match(source, /DEPS_MODE_FLAG:-\$\(env_key SDKWORK_CLOUDROUTER_DEPS_MODE\)/u);
});

test('compose keeps the deterministic per-environment management port plan', () => {
  const composeText = compose();
  assert.match(composeText, /SDKWORK_CLOUDROUTER_MGMT_HOST_PORT/u);
  // Embedded deps stay opt-in behind the deps profile.
  assert.match(composeText, /profiles: \[deps\]/u);
});

test('env examples carry the DEPS_MODE default and per-environment port bases', () => {
  for (const environment of environments) {
    const file = path.join(appRoot, 'deployments', 'docker', 'bundle', 'env', `${environment}.env.example`);
    const text = readFileSync(file, 'utf8');
    assert.match(text, /^SDKWORK_CLOUDROUTER_DEPS_MODE=external$/mu, `${environment}.env.example`);
    assert.match(text, /^SDKWORK_CLOUDROUTER_[A-Z_]*HOST_PORT=[0-9]+$/mu, `${environment}.env.example`);
  }
});
