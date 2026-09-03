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
  'crates/sdkwork-api-cloudrouter-assembly/src/bootstrap/iam.rs',
);
const bootstrapCargo = read('crates/sdkwork-api-cloudrouter-assembly/Cargo.toml');
const workspaceCargo = read('Cargo.toml');
const topologySource = read('scripts/lib/cloud-router-topology.mjs');
const sharedBootstrapSource = read(
  'crates/sdkwork-iam-web-adapter/src/embedded_bootstrap.rs',
  iamRepoRoot,
);
const iamAdapterSource = read(
  'crates/sdkwork-iam-web-adapter/src/application_registry.rs',
  iamRepoRoot,
);

assert.match(
  bootstrapSource,
  /ensure_tenant_application_from_app_root/u,
  'Cloud Router assembly IAM bootstrap must delegate to the shared embedded bootstrap crate.',
);

assert.doesNotMatch(
  bootstrapSource,
  /ensure_tenant_application_runtime/u,
  'Cloud Router assembly adapter must not duplicate ensure_tenant_application_runtime.',
);

assert.match(
  bootstrapCargo,
  /sdkwork-iam-embedded-application-bootstrap/u,
  'Assembly crate must depend on sdkwork-iam-embedded-application-bootstrap.',
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
const databaseManagementSource = read('scripts/manage-cloud-router-database.mjs');

assert.match(
  startWorkspaceSource,
  /IAM_APPLICATION_BOOTSTRAP_ENV/u,
  'start-workspace must inject IAM application bootstrap env for installer and refresh-catalog.',
);

assert.match(
  databaseManagementSource,
  /IAM_APPLICATION_BOOTSTRAP_ENV/u,
  'manage-cloud-router-database must inject IAM application bootstrap env for installer commands.',
);

assert.match(
  sharedBootstrapSource,
  /normalize_workspace_postgres_url/u,
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

console.log('sdkwork-cloudrouter IAM application bootstrap standard passed.');
