#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function readJson(relativePath) {
  const absolute = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolute)) {
    failures.push(`${relativePath} must exist`);
    return {};
  }
  return JSON.parse(fs.readFileSync(absolute, 'utf8').replace(/^\uFEFF/, ''));
}

function readText(relativePath) {
  const absolute = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolute)) {
    failures.push(`${relativePath} must exist`);
    return '';
  }
  return fs.readFileSync(absolute, 'utf8');
}

for (const dir of [
  'apis',
  'apps',
  'crates',
  'sdks',
  'database',
  'deployments',
  'configs',
  'scripts',
  'docs',
  'tests',
  '.sdkwork',
  'specs',
]) {
  assert(fs.existsSync(path.join(repoRoot, dir)), `${dir}/ must exist`);
}

assert(fs.existsSync(path.join(repoRoot, 'sdkwork.app.config.json')), 'sdkwork.app.config.json must exist');
assert(fs.existsSync(path.join(repoRoot, 'sdkwork.workflow.json')), 'sdkwork.workflow.json must exist');
assert(fs.existsSync(path.join(repoRoot, 'apps/sdkwork-mcp-pc')), 'apps/sdkwork-mcp-pc must exist');
assert(fs.existsSync(path.join(repoRoot, 'apps/sdkwork-mcp-h5')), 'apps/sdkwork-mcp-h5 must exist');
assert(
  fs.existsSync(path.join(repoRoot, 'apps/sdkwork-mcp-flutter-mobile')),
  'apps/sdkwork-mcp-flutter-mobile must exist',
);

const packageJson = readJson('package.json');
for (const script of ['dev', 'build', 'test', 'check', 'verify', 'clean']) {
  assert(packageJson.scripts?.[script], `package.json must expose pnpm ${script}`);
}
assert(packageJson.scripts?.['check:architecture-alignment'], 'check:architecture-alignment required');
assert(packageJson.scripts?.['db:validate'], 'db:validate required');
assert(packageJson.scripts?.['topology:validate'], 'topology:validate required');
assert(packageJson.dependencies?.['@sdkwork/app-topology'], 'package.json must declare @sdkwork/app-topology');
assert(packageJson.dependencies?.['@sdkwork/utils'], 'package.json must declare @sdkwork/utils');

const cargoToml = readText('Cargo.toml');
for (const dep of [
  'sdkwork-web-core',
  'sdkwork-web-axum',
  'sdkwork-database-config',
  'sdkwork-database-sqlx',
  'sdkwork-utils-rust',
  'sdkwork-iam-web-adapter',
  'sdkwork-drive-contract',
]) {
  assert(cargoToml.includes(dep), `Cargo.toml must declare ${dep}`);
}
assert(!cargoToml.includes('sdkwork-discovery'), 'sdkwork-discovery deferred until RPC exists');

const componentSpec = readJson('specs/component.spec.json');
assert(componentSpec.component?.domain === 'intelligence', 'domain must be intelligence');
assert(componentSpec.component?.capability === 'mcp', 'capability must be mcp');

const dbManifest = readJson('database/database.manifest.json');
assert(dbManifest.moduleId === 'mcp', 'database moduleId must be mcp');
assert(dbManifest.tablePrefix === 'ai_mcp_', 'database tablePrefix must be ai_mcp_');

const mcpSchema = readText('specs/mcp-database.schema.yaml');
for (const table of [
  'ai_mcp_server_category',
  'ai_mcp_server',
  'ai_mcp_connector',
  'ai_mcp_tool',
  'ai_mcp_resource',
  'ai_mcp_prompt',
  'ai_mcp_invocation_log',
]) {
  assert(mcpSchema.includes(table), `mcp-database.schema.yaml must declare ${table}`);
}

const driveIntegration = readText('crates/sdkwork-intelligence-mcp-service/src/integration/drive.rs');
assert(driveIntegration.includes('McpDrivePort'), 'MCP service must define Drive port for uploads');
assert(driveIntegration.includes('drive'), 'MCP drive integration must reference drive');

const contractSource = readText('crates/sdkwork-mcp-contract/src/records.rs');
assert(
  contractSource.includes('McpServerRecord') || contractSource.includes('server_key'),
  'mcp contract must define server records',
);

const appConfig = readJson('sdkwork.app.config.json');
assert(appConfig.app?.key === 'sdkwork-mcp', 'sdkwork.app.config.json key must be sdkwork-mcp');

const pcPackageJson = readJson('apps/sdkwork-mcp-pc/package.json');
assert(pcPackageJson.dependencies?.['@sdkwork/utils'], 'PC app must depend on @sdkwork/utils');

const h5PackageJson = readJson('apps/sdkwork-mcp-h5/package.json');
assert(h5PackageJson.name?.includes('mcp'), 'H5 app package name must reference mcp');
assert(h5PackageJson.dependencies?.['@sdkwork/utils'], 'H5 app must depend on @sdkwork/utils');
assert(h5PackageJson.dependencies?.['@sdkwork/drive-app-sdk'], 'H5 app must depend on @sdkwork/drive-app-sdk');

const h5SdkClients = readText('apps/sdkwork-mcp-h5/src/bootstrap/sdkClients.ts');
assert(h5SdkClients.includes('@sdkwork/drive-app-sdk'), 'H5 sdkClients must wire sdkwork-drive-app-sdk');
assert(
  fs.existsSync(path.join(repoRoot, 'apps/sdkwork-mcp-h5/packages/sdkwork-mcp-h5-core/src/sdk/mcpAppSdkClient.ts')),
  'H5 core must expose mcpAppSdkClient entrypoint',
);

assert(
  fs.existsSync(path.join(repoRoot, 'database/migrations/postgres')),
  'database/migrations/postgres must exist for baseline-plus-migrations strategy',
);

const flutterPubspec = readText('apps/sdkwork-mcp-flutter-mobile/pubspec.yaml');
assert(flutterPubspec.includes('sdkwork_mcp'), 'Flutter app must reference sdkwork_mcp');

assert(
  fs.existsSync(path.join(repoRoot, 'crates/sdkwork-routes-mcp-shared/src/lib.rs')),
  'sdkwork-routes-mcp-shared must exist for deduplicated route handlers',
);
assert(cargoToml.includes('sdkwork-routes-mcp-shared'), 'Cargo.toml must declare sdkwork-routes-mcp-shared');

const sharedHandlers = readText('crates/sdkwork-routes-mcp-shared/src/handlers.rs');
assert(sharedHandlers.includes('list_categories'), 'shared handlers must expose list_categories');
assert(sharedHandlers.includes('append_invocation'), 'shared handlers must expose append_invocation');

assert(
  fs.existsSync(path.join(repoRoot, 'crates/sdkwork-mcp-database-host/src/lib.rs')),
  'sdkwork-mcp-database-host must exist',
);
assert(
  fs.existsSync(path.join(repoRoot, 'crates/sdkwork-mcp-gateway-assembly/src/lib.rs')),
  'sdkwork-mcp-gateway-assembly must exist',
);
assert(fs.existsSync(path.join(repoRoot, 'sdks/sdkwork-mcp-app-sdk/bin/generate-sdk.mjs')), 'sdkwork-mcp-app-sdk generator must exist');
assert(fs.existsSync(path.join(repoRoot, 'sdks/sdkwork-mcp-backend-sdk/bin/generate-sdk.mjs')), 'sdkwork-mcp-backend-sdk generator must exist');
assert(
  fs.existsSync(path.join(repoRoot, 'deployments/docker/Dockerfile')),
  'deployments/docker/Dockerfile must exist',
);

const pcCoreService = readText('apps/sdkwork-mcp-pc/packages/sdkwork-mcp-pc-core/src/services/marketplaceService.ts');
assert(pcCoreService.includes('fetchMarketplaceCatalog'), 'PC marketplaceService must expose fetchMarketplaceCatalog');
assert(pcCoreService.includes('clients.app.mcp'), 'PC marketplaceService must use generated MCP app SDK');

const pcAdminService = readText('apps/sdkwork-mcp-pc/packages/sdkwork-mcp-pc-core/src/services/adminMcpService.ts');
assert(pcAdminService.includes('updateAdminServer'), 'PC adminMcpService must expose updateAdminServer');
assert(pcAdminService.includes('mcpAdmin'), 'PC adminMcpService must use generated MCP backend SDK');

const permissionsCatalog = readJson('specs/mcp-admin.permissions.json');
assert(permissionsCatalog.permissions?.length >= 4, 'mcp-admin.permissions.json must declare admin permissions');
assert(
  permissionsCatalog.permissions.some((entry) => entry.code === 'mcp.admin.server.manage'),
  'mcp-admin.permissions.json must include mcp.admin.server.manage',
);

const adminCapabilityPanel = readText(
  'apps/sdkwork-mcp-pc/packages/sdkwork-mcp-pc-admin/src/components/AdminCapabilityPanel.tsx',
);
assert(adminCapabilityPanel.includes('upsertAdminTool'), 'AdminCapabilityPanel must upsert tools via admin service');

const adminSettingsPanel = readText(
  'apps/sdkwork-mcp-pc/packages/sdkwork-mcp-pc-admin/src/components/AdminServerSettingsPanel.tsx',
);
assert(adminSettingsPanel.includes('updateAdminServer'), 'AdminServerSettingsPanel must update server lifecycle metadata');

const applicationCode = 'mcp';
const legacyPackagePatterns = [/sdkwork-skills/i, /sdkwork-agents/i];
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

function assertCanonicalPackageDirs(appRoot, expectedDirs) {
  const packagesRoot = path.join(repoRoot, appRoot, 'packages');
  if (!fs.existsSync(packagesRoot)) {
    failures.push(`${appRoot}/packages must exist`);
    return;
  }

  const actualDirs = fs
    .readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const expectedDir of expectedDirs) {
    assert(actualDirs.includes(expectedDir), `${appRoot}/packages/${expectedDir} must exist`);
  }

  for (const dirName of actualDirs) {
    assert(
      !legacyPackagePatterns.some((pattern) => pattern.test(dirName)),
      `${appRoot}/packages/${dirName} must not use legacy skills/agents package naming`,
    );
    assert(
      dirName.startsWith(`sdkwork-${applicationCode}-`),
      `${appRoot}/packages/${dirName} must follow sdkwork-${applicationCode}-<client-arch>-<capability> naming`,
    );
  }
}

assertCanonicalPackageDirs('apps/sdkwork-mcp-pc', expectedPcPackageDirs);
assertCanonicalPackageDirs('apps/sdkwork-mcp-h5', expectedH5PackageDirs);

for (const [appRoot, expectedDirs] of [
  ['apps/sdkwork-mcp-pc', expectedPcPackageDirs],
  ['apps/sdkwork-mcp-h5', expectedH5PackageDirs],
]) {
  for (const dirName of expectedDirs) {
    const packageJsonPath = path.join(repoRoot, appRoot, 'packages', dirName, 'package.json');
    assert(fs.existsSync(packageJsonPath), `${appRoot}/packages/${dirName}/package.json must exist`);
    const packageJson = readJson(path.join(appRoot, 'packages', dirName, 'package.json'));
    const npmName = packageJson.name;
    assert(typeof npmName === 'string' && npmName.includes('mcp'), `${dirName} package name must reference mcp`);
    assert(!/@sdkwork\/(skills|agents)/.test(npmName), `${dirName} must not use @sdkwork/skills or @sdkwork/agents`);
    assert(packageJson.sdkwork?.workspace === 'sdkwork-mcp', `${dirName} must declare sdkwork.workspace sdkwork-mcp`);
    assert(packageJson.sdkwork?.domain === 'intelligence', `${dirName} must declare sdkwork.domain intelligence`);
    for (const dependency of Object.entries(packageJson.dependencies ?? {})) {
      const [depName, depValue] = dependency;
      if (depName.startsWith('@sdkwork/')) {
        assert(
          depValue === 'workspace:*',
          `${dirName} must use workspace:* for ${depName}`,
        );
      }
    }
  }
}

assert(
  fs.existsSync(path.join(repoRoot, 'apps/sdkwork-mcp-pc/specs/component.spec.json')),
  'apps/sdkwork-mcp-pc/specs/component.spec.json must exist',
);
assert(
  fs.existsSync(path.join(repoRoot, 'apps/sdkwork-mcp-h5/specs/component.spec.json')),
  'apps/sdkwork-mcp-h5/specs/component.spec.json must exist',
);

for (const [appRoot, expectedDirs] of [
  ['apps/sdkwork-mcp-pc', expectedPcPackageDirs],
  ['apps/sdkwork-mcp-h5', expectedH5PackageDirs],
]) {
  for (const dirName of expectedDirs) {
    const componentSpecPath = path.join(repoRoot, appRoot, 'packages', dirName, 'specs/component.spec.json');
    assert(fs.existsSync(componentSpecPath), `${appRoot}/packages/${dirName}/specs/component.spec.json must exist`);
    const componentSpec = readJson(path.join(appRoot, 'packages', dirName, 'specs/component.spec.json'));
    assert(
      componentSpec.component?.root === `${appRoot}/packages/${dirName}`,
      `${dirName} component.spec root must match canonical package directory`,
    );
  }
}

const h5CoreSdkClient = readText('apps/sdkwork-mcp-h5/packages/sdkwork-mcp-h5-core/src/sdk/mcpAppSdkClient.ts');
assert(!h5CoreSdkClient.includes('agentsAppSdkClient'), 'H5 mcpAppSdkClient must not reference legacy agentsAppSdkClient module');

const h5MarketplaceService = readText('apps/sdkwork-mcp-h5/packages/sdkwork-mcp-h5-core/src/services/marketplaceService.ts');
assert(h5MarketplaceService.includes('fetchMarketplaceCatalog'), 'H5 marketplaceService must expose fetchMarketplaceCatalog');
assert(h5MarketplaceService.includes('client.mcp'), 'H5 marketplaceService must use generated MCP app SDK');

const h5MarketplacePage = readText('apps/sdkwork-mcp-h5/packages/sdkwork-mcp-h5-mcp/src/pages/MarketplacePage.tsx');
assert(h5MarketplacePage.includes('fetchMarketplaceCatalog'), 'H5 MarketplacePage must use fetchMarketplaceCatalog');
assert(!/AgentView|agentService/i.test(h5MarketplacePage), 'H5 MarketplacePage must not reference legacy agent UI');

if (failures.length > 0) {
  console.error('Architecture alignment failures:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('sdkwork-mcp architecture alignment ok');
