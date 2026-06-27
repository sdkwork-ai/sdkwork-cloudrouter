import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const iamRepoRoot = path.resolve(repoRoot, '..', 'sdkwork-iam');

function read(relativePath, root = repoRoot) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const bootstrapSource = read(
  'services/sdkwork-clawrouter-router-service/src/infrastructure/sql/iam_application_bootstrap.rs',
);
const routerServiceCargo = read('services/sdkwork-clawrouter-router-service/Cargo.toml');
const workspaceCargo = read('Cargo.toml');
const topologySource = read('scripts/lib/claw-router-topology.mjs');
const sharedBootstrapSource = read(
  'crates/sdkwork-iam-embedded-application-bootstrap/src/runtime.rs',
  iamRepoRoot,
);
const iamAdapterSource = read(
  'crates/sdkwork-iam-web-adapter/src/application_registry.rs',
  iamRepoRoot,
);

assert.match(
  bootstrapSource,
  /ensure_tenant_application_from_app_root_with_env_and_fallback/u,
  'Claw Router IAM bootstrap must delegate to the shared embedded bootstrap crate with repository-root fallback.',
);

assert.doesNotMatch(
  bootstrapSource,
  /ensure_tenant_application_runtime/u,
  'Claw Router adapter must not duplicate ensure_tenant_application_runtime.',
);

assert.match(
  routerServiceCargo,
  /sdkwork-iam-embedded-application-bootstrap/u,
  'Router service must depend on sdkwork-iam-embedded-application-bootstrap.',
);

assert.match(
  workspaceCargo,
  /sdkwork-iam-embedded-application-bootstrap/u,
  'Workspace must include sdkwork-iam-embedded-application-bootstrap.',
);

assert.match(
  topologySource,
  /SDKWORK_APP_ROOT:\s*REPO_ROOT/u,
  'Dev topology must inject SDKWORK_APP_ROOT for embedded IAM bootstrap.',
);

assert.match(
  topologySource,
  /SDKWORK_IAM_APP_ROOT:\s*IAM_REPO_ROOT/u,
  'Dev topology must export SDKWORK_IAM_APP_ROOT at the sdkwork-iam repository root for IMF catalog materialization.',
);

const startWorkspaceSource = read('scripts/dev/start-workspace.mjs');
const databaseManagementSource = read('scripts/manage-claw-router-database.mjs');

assert.match(
  startWorkspaceSource,
  /IAM_APPLICATION_BOOTSTRAP_ENV/u,
  'start-workspace must inject IAM application bootstrap env for installer and refresh-catalog.',
);

assert.match(
  databaseManagementSource,
  /IAM_APPLICATION_BOOTSTRAP_ENV/u,
  'manage-claw-router-database must inject IAM application bootstrap env for installer commands.',
);

assert.match(
  sharedBootstrapSource,
  /postgres_url_with_search_path/u,
  'Shared embedded bootstrap must align postgres search_path before provisioning.',
);

assert.match(
  iamAdapterSource,
  /tenant_application_instance_key/u,
  'IAM adapter must derive scoped instance_key values for tenant applications.',
);

assert.match(
  iamAdapterSource,
  /ON CONFLICT \(id\) DO UPDATE/u,
  'IAM adapter must upsert tenant application rows by stable id.',
);

console.log('sdkwork-clawrouter IAM application bootstrap standard passed.');
