import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { gunzipSync } from 'node:zlib';
import {
  resolveClawRouterBusinessAppsRoot,
  resolveClawRouterBusinessSpecsRoot,
} from './claw-router-layout.mjs';

const workspaceRoot = path.resolve(import.meta.dirname, '..');
const portalRoot = path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc');
const documentsApiReferenceRoot = path.join(
  workspaceRoot,
  '..',
  'sdkwork-documents',
  'apps',
  'sdkwork-documents-pc',
  'packages',
  'sdkwork-documents-pc-api-reference',
);
const documentsSdkReferenceRoot = path.join(
  workspaceRoot,
  '..',
  'sdkwork-documents',
  'apps',
  'sdkwork-documents-pc',
  'packages',
  'sdkwork-documents-pc-sdk-reference',
);
const execFileAsync = promisify(execFile);

const validReleaseEnv = Object.freeze({
  SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL: 'postgres://release:secret@db.example.com:5432/claw',
  PORTAL_PUBLIC_API_BASE_URL: 'https://tenant.example.com/v1',
  PORTAL_PUBLIC_OPEN_API_BASE_URL: 'https://open.tenant.example.com/v1',
  PORTAL_PUBLIC_APP_API_BASE_URL: '/app/v3/api',
  PORTAL_PUBLIC_BACKEND_API_BASE_URL: '/backend/v3/api',
  PORTAL_PUBLIC_TOOL_API_ENABLED: 'false',
});
const defaultDevPostgresDatabaseUrl =
  'postgresql://sdkwork_ai_dev:sdkworkdev123@[::1]:5432/sdkwork_ai_dev?sslmode=disable';
const defaultProdPostgresDatabase = 'sdkwork_ai_prod';
const defaultProdPostgresUsername = 'sdkwork_ai_prod';
const defaultProdPostgresUrl =
  'postgresql://sdkwork_ai_prod:change-me@db.example.com:5432/sdkwork_ai_prod?sslmode=require';
const defaultProdPostgresUrlWithoutPassword =
  'postgresql://sdkwork_ai_prod@db.example.com:5432/sdkwork_ai_prod?sslmode=require';
const productionPostgresDsnExample =
  'postgresql://sdkwork_ai_prod:<password>@db.example.com:5432/sdkwork_ai_prod';
const defaultDevSqliteDatabaseUrl = 'sqlite://target/dev/clawrouter.sqlite';
const devDatabaseEnvNames = Object.freeze([
  'SDKWORK_CLAW_DATABASE_URL',
  'SDKWORK_CLAW_DATABASE_ENGINE',
  'SDKWORK_CLAW_DATABASE_HOST',
  'SDKWORK_CLAW_DATABASE_PORT',
  'SDKWORK_CLAW_DATABASE_NAME',
  'SDKWORK_CLAW_DATABASE_SCHEMA',
  'SDKWORK_CLAW_DATABASE_USERNAME',
  'SDKWORK_CLAW_DATABASE_PASSWORD',
  'SDKWORK_CLAW_DATABASE_SSL_MODE',
  'SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS',
  'SDKWORK_CLAW_DATABASE_ADMIN_URL',
  'SDKWORK_CLAW_DATABASE_ADMIN_HOST',
  'SDKWORK_CLAW_DATABASE_ADMIN_PORT',
  'SDKWORK_CLAW_DATABASE_ADMIN_USERNAME',
  'SDKWORK_CLAW_DATABASE_ADMIN_PASSWORD',
  'SDKWORK_CLAW_DATABASE_ADMIN_DATABASE',
  'SDKWORK_CLAW_DATABASE_ADMIN_SSL_MODE',
]);

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function parseTestNamePattern(argv) {
  let rawPattern = null;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--test-name-pattern') {
      if (rawPattern !== null || index + 1 >= argv.length) {
        throw new Error('--test-name-pattern requires exactly one pattern value');
      }
      rawPattern = argv[index + 1];
      index += 1;
      continue;
    }
    if (argument.startsWith('--test-name-pattern=')) {
      if (rawPattern !== null) {
        throw new Error('--test-name-pattern may be specified only once');
      }
      rawPattern = argument.slice('--test-name-pattern='.length);
      continue;
    }
    throw new Error(`unsupported test runner argument: ${argument}`);
  }

  if (rawPattern === null) {
    return null;
  }
  try {
    return new RegExp(rawPattern, 'u');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`invalid --test-name-pattern: ${detail}`);
  }
}

function createFixtureDir(name) {
  const directory = path.join(
    workspaceRoot,
    'target-test-fixtures',
    `${name}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  mkdirSync(directory, { recursive: true });
  return directory;
}

function writeFixtureFile(rootDir, relativePath, contents = '// fixture\n') {
  const filePath = path.join(rootDir, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}

function seedMinimalClawRouterWorkspaceFixture(fixtureRoot) {
  writeFixtureFile(
    fixtureRoot,
    'sdkwork.app.config.json',
    readFileSync(path.join(workspaceRoot, 'sdkwork.app.config.json'), 'utf8'),
  );
  writeFixtureFile(
    fixtureRoot,
    'apps/sdkwork-clawrouter-pc/package.json',
    JSON.stringify({ name: 'sdkwork-clawrouter-pc-fixture', private: true }, null, 2),
  );
}

function findPlanStep(plan, label) {
  const step = plan.find((candidate) => candidate.label === label);
  assert.ok(step, `missing launch plan step: ${label}`);
  return step;
}

async function withIsolatedDevDatabaseEnv(fn) {
  const previous = Object.fromEntries(
    devDatabaseEnvNames.map((name) => [name, process.env[name]]),
  );
  try {
    for (const name of devDatabaseEnvNames) {
      delete process.env[name];
    }
    return await fn();
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
}

function parseWorkspaceArgsIsolated(module, argv = []) {
  return module.parseWorkspaceArgs(argv, { skipDevEnvFile: true });
}

function listFilesRecursive(rootDir, suffix) {
  const files = [];
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(entryPath, suffix));
      continue;
    }
    if (!suffix || entry.name.endsWith(suffix)) {
      files.push(entryPath);
    }
  }
  return files;
}

function readWorkspaceJson(relativePath) {
  return JSON.parse(readFileSync(path.join(workspaceRoot, relativePath), 'utf8'));
}

async function runGit(cwd, args) {
  await execFileAsync('git', args, { cwd });
}

async function createRustAutoFixtureRepo() {
  const repoDir = createFixtureDir('rust-auto-git');
  await runGit(repoDir, ['init']);
  await runGit(repoDir, ['checkout', '-b', 'main']);
  await runGit(repoDir, ['config', 'user.email', 'codex@example.com']);
  await runGit(repoDir, ['config', 'user.name', 'Codex']);

  writeFixtureFile(repoDir, 'services/sdkwork-clawrouter-router-service/src/api/app_runtime.rs');
  writeFixtureFile(repoDir, 'services/sdkwork-clawrouter-router-service/tests/app_runtime_api.rs');
  writeFixtureFile(repoDir, 'services/sdkwork-clawrouter-router-service/tests/postgres_app_runtime_sql_contract.rs');
  writeFixtureFile(repoDir, 'services/sdkwork-clawrouter-router-service/tests/sqlite_app_runtime_store.rs');
  writeFixtureFile(repoDir, 'services/sdkwork-clawrouter-router-service/tests/openai_compatible_http_relay.rs');
  writeFixtureFile(repoDir, 'crates/sdkwork-clawrouter-cloud-gateway/src/edge_server.rs');
  writeFixtureFile(repoDir, 'crates/sdkwork-clawrouter-cloud-gateway/src/runtime.rs');
  writeFixtureFile(repoDir, 'crates/sdkwork-clawrouter-cloud-gateway/tests/edge_server.rs');

  await runGit(repoDir, ['add', '.']);
  await runGit(repoDir, ['commit', '-m', 'fixture']);
  return repoDir;
}

test('root package exposes pnpm application entrypoints', () => {
  const rootPackage = JSON.parse(
    readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'),
  );

  const canonicalBrowser = 'node scripts/claw-router-dev.mjs --target browser --deployment-profile standalone --database postgres --dev-env-file .env.postgres';
  const canonicalBrowserSqlite = 'node scripts/claw-router-dev.mjs --target browser --deployment-profile standalone --database sqlite';
  const canonicalDesktop = 'node scripts/claw-router-dev.mjs --target desktop --deployment-profile standalone --database postgres --dev-env-file .env.postgres';
  const canonicalDesktopSqlite = 'node scripts/claw-router-dev.mjs --target desktop --deployment-profile standalone --database sqlite';
  const canonicalPlanSqlite = 'node scripts/claw-router-dev.mjs --target plan --deployment-profile standalone --database sqlite';
  const canonicalPlanPostgres = 'node scripts/claw-router-dev.mjs --target plan --deployment-profile standalone --database postgres --dev-env-file .env.postgres';

  assert.equal(rootPackage.private, true);
  assert.equal(rootPackage.packageManager, 'pnpm@10.33.0');
  assert.equal(rootPackage.scripts.dev, 'pnpm install:deps:ensure && pnpm dev:browser');
  assert.equal(rootPackage.scripts['dev:browser'], 'pnpm dev:browser:postgres:standalone');
  assert.equal(rootPackage.scripts['dev:browser:postgres'], 'pnpm dev:browser:postgres:standalone');
  assert.equal(rootPackage.scripts['dev:browser:sqlite'], canonicalBrowserSqlite);
  assert.equal(rootPackage.scripts['dev:browser:postgres:standalone'], canonicalBrowser);
  assert.equal(
    rootPackage.scripts.test,
    'pnpm topology:validate && pnpm test:topology && node scripts/run-claw-router-application.test.mjs',
  );
  assert.match(rootPackage.scripts['topology:validate'], /sdkwork-topology\.mjs validate/u);
  assert.match(rootPackage.scripts['test:topology'], /verify-claw-router-topology\.test\.mjs/u);
  assert.match(rootPackage.scripts['dev:browser:postgres:standalone'], /claw-router-dev\.mjs/u);
  assert.match(rootPackage.scripts['dev:browser:postgres:cloud'], /--deployment-profile cloud/u);
  assert.match(rootPackage.scripts['gateway:matrix'], /sdkwork-topology\.mjs print-matrix/u);
  assert.equal(
    rootPackage.scripts.build,
    'node scripts/build-claw-router-production.mjs',
  );
  assert.equal(
    rootPackage.scripts.check,
    'pnpm check:application-env && pnpm check:gateway-request-identity && pnpm check:app-composition && node scripts/run-claw-router-application.mjs check',
  );
  assert.equal(
    rootPackage.scripts['check:application-env'],
    'node --test scripts/lib/claw-router-browser-env-contract.test.mjs scripts/lib/claw-router-edge-env-contract.test.mjs scripts/dev/claw-router-application-env.test.mjs scripts/dev/ensure-claw-router-env.test.mjs scripts/write-release-env.test.mjs scripts/release-environment-validation.test.mjs && node scripts/check-claw-router-application-env.mjs',
  );
  assert.equal(
    rootPackage.scripts.start,
    'node scripts/start-claw-router-production.mjs',
  );
  assert.equal(
    rootPackage.scripts.release,
    'pnpm downloads:check && pnpm release:env:write -- --check && pnpm release:env:write -- --force && pnpm release:preflight -- --strict --env-file .env.release --strict-root-clean && pnpm verify',
  );
  assert.equal(
    rootPackage.scripts['downloads:update'],
    'node scripts/update-claw-router-downloads.mjs',
  );
  assert.equal(
    rootPackage.scripts['downloads:check'],
    'node scripts/update-claw-router-downloads.mjs --check',
  );
  assert.equal(
    rootPackage.scripts['admin:reset:dev'],
    'node scripts/reset-admin-account.mjs --mode dev',
  );
  assert.equal(
    rootPackage.scripts['admin:reset:dev:sqlite'],
    'node scripts/reset-admin-account.mjs --mode dev',
  );
  assert.equal(
    rootPackage.scripts['admin:reset:dev:postgres'],
    'node scripts/reset-admin-account.mjs --mode dev --dev-env-file .env.postgres',
  );
  assert.equal(
    rootPackage.scripts['admin:reset:release'],
    'node scripts/reset-admin-account.mjs --mode release',
  );
  assert.equal(
    rootPackage.scripts.db,
    'node scripts/manage-claw-router-database.mjs',
  );
  assert.equal(
    rootPackage.scripts['db:status'],
    'node scripts/manage-claw-router-database.mjs status',
  );
  assert.equal(
    rootPackage.scripts['db:init'],
    'node scripts/manage-claw-router-database.mjs init',
  );
  assert.equal(
    rootPackage.scripts['db:upgrade'],
    'node scripts/manage-claw-router-database.mjs upgrade',
  );
  assert.equal(
    rootPackage.scripts['db:ensure'],
    'node scripts/manage-claw-router-database.mjs ensure',
  );
  assert.equal(
    rootPackage.scripts['db:refresh-catalog'],
    'node scripts/manage-claw-router-database.mjs refresh-catalog',
  );
  assert.equal(rootPackage.scripts['dev:desktop'], 'pnpm dev:desktop:postgres:standalone');
  assert.equal(rootPackage.scripts['dev:desktop:postgres'], 'pnpm dev:desktop:postgres:standalone');
  assert.equal(rootPackage.scripts['dev:desktop:postgres:standalone'], canonicalDesktop);
  assert.equal(rootPackage.scripts['dev:desktop:sqlite'], canonicalDesktopSqlite);
  assert.equal(rootPackage.scripts['dev:service'], undefined);
  assert.equal(rootPackage.scripts['dev:service:sqlite'], undefined);
  assert.equal(rootPackage.scripts['dev:portal'], undefined);
  assert.equal(rootPackage.scripts['dev:server'], 'pnpm dev:browser:postgres:standalone');
  assert.equal(rootPackage.scripts['dev:server:sqlite'], canonicalBrowserSqlite);
  assert.equal(rootPackage.scripts['dev:server:postgres'], 'pnpm dev:browser:postgres:standalone');
  assert.equal(rootPackage.scripts['topology:plan:server:sqlite'], canonicalPlanSqlite);
  assert.equal(rootPackage.scripts['topology:plan:server:postgres'], canonicalPlanPostgres);
  assert.equal(
    rootPackage.scripts['smoke:dev'],
    'node scripts/smoke-edge-dev-server.mjs',
  );
  assert.equal(rootPackage.scripts['fmt:rust'], undefined);
  assert.equal(rootPackage.scripts['fmt:rust:check'], undefined);
  assert.equal(
    rootPackage.scripts['format:rust'],
    'node scripts/cargo-fmt-workspace.mjs',
  );
  assert.equal(
    rootPackage.scripts['format:rust:check'],
    'node scripts/cargo-fmt-workspace.mjs --check',
  );
  assert.equal(
    rootPackage.scripts['verify:fast'],
    'node scripts/verify-claw-router-application.mjs --fast',
  );
  assert.equal(
    rootPackage.scripts['verify:precommit'],
    'node scripts/verify-claw-router-application.mjs --precommit',
  );
  assert.equal(
    rootPackage.scripts['verify:ci'],
    'node scripts/verify-claw-router-application.mjs --ci',
  );
  assert.equal(
    rootPackage.scripts['verify:parallel'],
    'node scripts/verify-claw-router-application.mjs --parallel',
  );
  assert.equal(
    rootPackage.scripts['test:rust:auto'],
    'node scripts/run-claw-router-rust-tests.mjs auto',
  );
  assert.equal(
    rootPackage.scripts['test:rust:smoke'],
    'node scripts/run-claw-router-rust-tests.mjs smoke',
  );
  assert.equal(
    rootPackage.scripts['test:rust:quick'],
    'node scripts/run-claw-router-rust-tests.mjs quick',
  );
  assert.equal(
    rootPackage.scripts['test:rust:admin-api'],
    'node scripts/run-claw-router-rust-tests.mjs admin-api',
  );
  assert.equal(
    rootPackage.scripts['test:rust:app-api'],
    'node scripts/run-claw-router-rust-tests.mjs app-api',
  );
  assert.equal(
    rootPackage.scripts['test:rust:gateway'],
    'node scripts/run-claw-router-rust-tests.mjs gateway',
  );
  assert.equal(
    rootPackage.scripts['test:rust:product-relay'],
    'node scripts/run-claw-router-rust-tests.mjs product-relay',
  );
  assert.equal(
    rootPackage.scripts['test:rust:runtime'],
    'node scripts/run-claw-router-rust-tests.mjs runtime',
  );
  assert.equal(
    rootPackage.scripts['test:rust:full'],
    'node scripts/run-claw-router-rust-tests.mjs full',
  );
  assert.equal(
    rootPackage.scripts['test:rust:measure'],
    'node scripts/measure-claw-router-test-targets.mjs',
  );
  assert.equal(
    rootPackage.scripts['test:rust:stop'],
    'node scripts/stop-claw-router-test-processes.mjs',
  );
  assert.equal(
    rootPackage.scripts['clean:fast'],
    'node scripts/clean-claw-router-workspace.mjs',
  );
  assert.equal(
    rootPackage.scripts['release:preflight'],
    'node scripts/release-preflight.mjs',
  );
  assert.equal(
    rootPackage.scripts['release:env:write'],
    'node scripts/write-release-env.mjs',
  );
  assert.equal(
    rootPackage.scripts['install:packages:plan'],
    'node scripts/plan-claw-router-install-packages.mjs',
  );
  assert.equal(
    rootPackage.scripts['install:packages:check'],
    'node scripts/plan-claw-router-install-packages.mjs --check',
  );
  assert.equal(
    rootPackage.scripts['install:native:build'],
    'node scripts/build-claw-router-native-installer.mjs',
  );
  assert.equal(
    rootPackage.scripts['install:native:check'],
    'node scripts/build-claw-router-native-installer.mjs --check --dry-run --all',
  );
  assert.equal(
    rootPackage.scripts['app-store:seed:update'],
    'node scripts/update-app-store-seed.mjs',
  );
  assert.equal(
    rootPackage.scripts['app-store:seed:check'],
    'node scripts/update-app-store-seed.mjs --check',
  );
  assert.equal(
    rootPackage.scripts['skills:seed:mirror-clawhub'],
    'node scripts/mirror-clawhub-skills-seed.mjs --fetch',
  );
  assert.equal(
    rootPackage.scripts['skills:seed:check'],
    'node scripts/mirror-clawhub-skills-seed.mjs --check',
  );
  assert.equal(
    rootPackage.scripts['nginx:plan'],
    'node scripts/configure-nginx.mjs --dry-run',
  );
  assert.equal(
    rootPackage.scripts['nginx:render'],
    'node scripts/configure-nginx.mjs --write',
  );
  assert.equal(
    rootPackage.scripts['nginx:deploy'],
    'node scripts/configure-nginx.mjs --deploy',
  );
});

test('pnpm dev delegates to canonical browser topology command', () => {
  const rootPackage = readWorkspaceJson('package.json');

  assert.equal(rootPackage.scripts.dev, 'pnpm install:deps:ensure && pnpm dev:browser');
  assert.equal(rootPackage.scripts['dev:browser'], 'pnpm dev:browser:postgres:standalone');
  assert.match(rootPackage.scripts['dev:browser:postgres:standalone'], /--target browser/u);
  assert.match(rootPackage.scripts['dev:browser:postgres:standalone'], /--deployment-profile standalone/u);
  assert.doesNotMatch(rootPackage.scripts['dev:browser:postgres:standalone'], /client/u);
  assert.doesNotMatch(rootPackage.scripts['dev:browser:sqlite'], /client/u);
});

test('foundation dependency APIs target the shared sdkwork api gateway without a local gateway catalog', () => {
  const componentSpec = readWorkspaceJson('specs/component.spec.json');
  const dependencySurfaces = readWorkspaceJson('specs/dependency-api-surfaces.json');

  assert.deepEqual(componentSpec.integration.foundationApiGateway, {
    targetApplication: 'sdkwork-api-cloud-gateway',
    targetMode: 'shared-gateway',
    commonSdkRootEnv: 'PORTAL_PUBLIC_SDK_BASE_URL',
    authority: 'cargo-workspace',
    catalogPolicy: 'no-dedicated-gateway-catalog',
    productApiPolicy: 'sdkwork-clawrouter APIs remain product-owned SDKWork API surfaces',
    migrationState: 'shared-gateway-default',
  });

  assert.deepEqual(dependencySurfaces.gatewayIntegration, {
    targetApplication: 'sdkwork-api-cloud-gateway',
    targetMode: 'shared-gateway',
    commonSdkRootEnv: 'PORTAL_PUBLIC_SDK_BASE_URL',
    authority: 'cargo-workspace',
    catalogPolicy: 'no-dedicated-gateway-catalog',
    productApiPolicy: 'sdkwork-clawrouter APIs remain product-owned SDKWork API surfaces',
    migrationState: 'shared-gateway-default',
  });

  const foundationDependencies = dependencySurfaces.dependencies.filter((dependency) =>
    /^sdkwork-(iam|commerce)-/u.test(dependency.workspace)
  );
  assert.equal(foundationDependencies.length, 4);
  for (const dependency of foundationDependencies) {
    assert.equal(
      dependency.runtimeIntegration.mode,
      'external-service',
      `${dependency.workspace} must not be declared as product-local same-origin mounted by default`,
    );
    assert.equal(
      dependency.runtimeIntegration.sameOriginAllowed,
      false,
      `${dependency.workspace} must consume the shared gateway root instead of a product-owned API base URL`,
    );
    assert.equal(
      dependency.runtimeIntegration.commonBaseUrlEnv,
      'PORTAL_PUBLIC_SDK_BASE_URL',
      `${dependency.workspace} must derive from the shared sdkwork-api-cloud-gateway root by default`,
    );
    assert.deepEqual(
      dependency.runtimeIntegration.targetRuntimeIntegration,
      {
        mode: 'shared-gateway',
        gatewayApplication: 'sdkwork-api-cloud-gateway',
        commonSdkRootEnv: 'PORTAL_PUBLIC_SDK_BASE_URL',
        catalogPolicy: 'no-dedicated-gateway-catalog',
      },
      `${dependency.workspace} must declare the shared gateway target state`,
    );
  }

  const forbiddenGatewayCatalogs = listFilesRecursive(path.join(workspaceRoot, 'specs'))
    .map((filePath) => slashPath(path.relative(workspaceRoot, filePath)))
    .filter((relativePath) =>
      /(^|\/)(sdkwork-api-cloud-gateway-catalog|api-gateway-catalog|gateway-catalog|foundation-api-catalog)\.(json|ya?ml|toml)$/iu.test(relativePath)
    );
  assert.deepEqual(
    forbiddenGatewayCatalogs,
    [],
    'Gateway integration must use Cargo workspace metadata and existing SDKWork specs, not a standalone gateway catalog',
  );
});

test('product app and admin API servers do not keep direct foundation API runtime debts', () => {
  const dependencySurfaces = readWorkspaceJson('specs/dependency-api-surfaces.json');
  const dependencySurfaceText = readFileSync(
    path.join(workspaceRoot, 'specs', 'dependency-api-surfaces.json'),
    'utf8',
  );

  assert.doesNotMatch(
    dependencySurfaceText,
    /legacy(?:HandlerAdapterExports|RustRouteContractCrate|FallbackBaseUrlEnv|PublicBaseUrlEnv)/u,
    'shared-gateway migration must not keep product-local legacy adapter or base-url fallback fields in dependency-api-surfaces.json',
  );
  for (const dependency of dependencySurfaces.dependencies ?? []) {
    if (/^sdkwork-models-/u.test(dependency.workspace)) {
      assert.equal(
        dependency.runtimeIntegration?.mode,
        'same-origin-mounted',
        `${dependency.workspace} must declare compose-mounted models catalog routes on the product API surface`,
      );
      assert.equal(
        dependency.runtimeIntegration?.sameOriginAllowed,
        true,
        `${dependency.workspace} must allow same-origin product API roots for compose-mounted models catalog routes`,
      );
      assert.equal(
        dependency.runtimeIntegration?.mountCoverage?.status,
        'verified',
        `${dependency.workspace} must declare verified mount coverage for compose-mounted models catalog routes`,
      );
      continue;
    }
    assert.equal(
      dependency.runtimeIntegration?.mode,
      'external-service',
      `${dependency.workspace} must be an external shared-gateway dependency surface`,
    );
    assert.equal(
      dependency.runtimeIntegration?.sameOriginAllowed,
      false,
      `${dependency.workspace} must not inherit product-owned same-origin API roots`,
    );
  }

  const forbiddenFoundationRuntimeCrates = [
    'sdkwork_iam_http',
    'sdkwork_iam_storage_sqlx',
    'sdkwork_commerce_http',
    'sdkwork_commerce_membership_sqlx',
  ];
  for (const relativePath of [
    'services/sdkwork-clawrouter-standalone-gateway/Cargo.toml',
    'services/sdkwork-clawrouter-admin-gateway/Cargo.toml',
  ]) {
    const cargoToml = readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
    for (const crateName of forbiddenFoundationRuntimeCrates) {
      assert.doesNotMatch(
        cargoToml,
        new RegExp(`^${crateName}\\.workspace\\s*=\\s*true`, 'mu'),
        `${relativePath} must not depend on ${crateName}; foundation API runtime is owned by sdkwork-api-cloud-gateway`,
      );
    }
  }

  const rootCargoToml = readFileSync(path.join(workspaceRoot, 'Cargo.toml'), 'utf8');
  for (const crateName of [
    'sdkwork_iam_http',
    'sdkwork_commerce_http',
    'sdkwork_commerce_account',
  ]) {
    assert.doesNotMatch(
      rootCargoToml,
      new RegExp(`^${crateName}\\s*=`, 'mu'),
      `root Cargo.toml must not keep unused ${crateName}; shared foundation API runtime integration belongs to sdkwork-api-cloud-gateway`,
    );
  }

  const forbiddenRuntimeImports = [
    'sdkwork_commerce_http::',
    'sdkwork_commerce_membership_sqlx::',
    'sdkwork_iam_http::',
    'admin_appbase_backend_iam_directory_router_with_read_store',
    'admin_appbase_backend_iam_oauth_router_with_read_store',
  ];
  const sourceChecks = {
    'services/sdkwork-clawrouter-standalone-gateway/src/lib.rs': [
      ...forbiddenRuntimeImports,
    ],
    'crates/sdkwork-routes-clawrouter-app-api/src/routes.rs': [
      ...forbiddenRuntimeImports,
      'app_sessions_router(',
      'app_public_auth_router(',
      'app_iam_directory_router',
      'app_auth_router',
      'app_user_profile_router',
      'VerificationDeliveryQueueSender',
      'verification_code_sender',
    ],
    'services/sdkwork-clawrouter-admin-gateway/src/lib.rs': [
      ...forbiddenRuntimeImports,
    ],
    'crates/sdkwork-routes-clawrouter-backend-api/src/routes.rs': [
      ...forbiddenRuntimeImports,
      'admin_messaging_router_with_store',
      'admin_user_router_with_store',
      'SqliteAdminMessagingStore',
      'PostgresAdminMessagingStore',
      'SqliteAdminUserStore',
      'PostgresAdminUserStore',
    ],
  };
  for (const [relativePath, markers] of Object.entries(sourceChecks)) {
    const source = readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
    for (const marker of markers) {
      assert.equal(
        source.includes(marker),
        false,
        `${relativePath} must not mount, construct, or import product-local foundation runtime marker ${marker}`,
      );
    }
  }

  const productFoundationAdapters = listFilesRecursive(
    path.join(workspaceRoot, 'services', 'sdkwork-clawrouter-router-service', 'src', 'api'),
    '.rs',
  )
    .map((filePath) => slashPath(path.relative(workspaceRoot, filePath)))
    .filter((relativePath) => /admin_appbase_backend_iam/u.test(relativePath));
  assert.deepEqual(
    productFoundationAdapters,
    [],
    'sdkwork-clawrouter-router-service must not retain product-local appbase backend IAM API adapters; appbase backend IAM is served through sdkwork-api-cloud-gateway',
  );

  const productApiModule = readFileSync(
    path.join(workspaceRoot, 'services', 'sdkwork-clawrouter-router-service', 'src', 'api', 'mod.rs'),
    'utf8',
  );
  for (const marker of [
    'admin_appbase_backend_iam_directory_router_with_read_store',
    'admin_appbase_backend_iam_oauth_router_with_read_store',
    'AdminAppbaseBackendIamSqlReadStore',
  ]) {
    assert.equal(
      productApiModule.includes(marker),
      false,
      `sdkwork-clawrouter-router-service api module must not re-export product-local appbase backend IAM adapter ${marker}`,
    );
  }
});

test('product sqlite integration tests consume a shared test-support crate instead of path-including installed sqlite helpers', () => {
  const productCargoToml = readFileSync(
    path.join(workspaceRoot, 'services', 'sdkwork-clawrouter-router-service', 'Cargo.toml'),
    'utf8',
  );
  assert.match(
    productCargoToml,
    /sdkwork-clawrouter-router-service-test-support = \{ path = "\.\.\/\.\.\/crates\/sdkwork-clawrouter-router-service-test-support" \}/u,
  );

  const rustTestFiles = listFilesRecursive(
    path.join(workspaceRoot, 'services', 'sdkwork-clawrouter-router-service', 'tests'),
    '.rs',
  );
  const inlineInstalledSqliteUsers = rustTestFiles.filter((filePath) => {
    const source = readFileSync(filePath, 'utf8');
    return source.includes('#[path = "common/installed_sqlite.rs"]')
      || source.includes('mod installed_sqlite_common;')
      || source.includes('use installed_sqlite_common::');
  });
  assert.deepEqual(
    inlineInstalledSqliteUsers.map((filePath) => path.relative(workspaceRoot, filePath).replaceAll('\\', '/')),
    [],
  );
});

test('rust test runner exposes isolated daily-maintenance profiles', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'run-claw-router-rust-tests.mjs')).href
  );

  const quick = module.buildRustTestPlan(module.parseArgs(['quick']), {
    env: {},
    platform: 'win32',
  });
  assert.equal(quick.profile, 'quick');
  assert.equal(quick.steps[0].label, 'rust format for frequently touched packages');
  assert.deepEqual(quick.steps[0].args.slice(0, 2), ['fmt', '-p']);
  assert.equal(quick.steps[0].env.CARGO_TARGET_DIR, 'target-rust-tests\\daily');
  assert.equal(quick.steps[0].env.SDKWORK_CLAW_HTTP_OPENAPI_BUILD_MODE, 'copy');
  assert.equal('CARGO_BUILD_JOBS' in quick.steps[0].env, false);
  assert.equal(quick.steps.some((step) => step.args.includes('sdkwork-claw-config')), true);

  const inheritedSingleJob = module.buildRustTestPlan(module.parseArgs(['gateway']), {
    env: { CARGO_BUILD_JOBS: '1' },
    platform: 'linux',
  });
  assert.equal('CARGO_BUILD_JOBS' in inheritedSingleJob.steps[0].env, false);

  const smoke = module.buildRustTestPlan(module.parseArgs(['smoke']), {
    env: {},
    platform: 'linux',
  });
  assert.equal(smoke.profile, 'smoke');
  assert.equal(smoke.steps.length, 2);
  assert.equal(smoke.steps[0].args.includes('sdkwork-claw-test-support'), true);
  assert.equal(smoke.steps[1].args.includes('sqlite_product_model_route'), true);

  const explicitBuildJobs = module.buildRustTestPlan(module.parseArgs(['gateway', '--build-jobs', '6']), {
    env: { CARGO_BUILD_JOBS: '1' },
    platform: 'linux',
  });
  assert.equal(explicitBuildJobs.steps[0].env.CARGO_BUILD_JOBS, '6');

  const adminApi = module.buildRustTestPlan(module.parseArgs(['admin-api', '--test-threads', '4']), {
    env: {},
    platform: 'win32',
  });
  assert.equal(adminApi.profile, 'admin-api');
  assert.equal(
    adminApi.steps.some((step) => step.args.includes('database_config_router')),
    true,
  );
  assert.deepEqual(adminApi.steps.at(-1).args.slice(-2), ['--test-threads', '4']);

  const appApi = module.buildRustTestPlan(module.parseArgs(['app-api']), {
    env: {},
    platform: 'linux',
  });
  assert.equal(appApi.profile, 'app-api');
  assert.equal(appApi.steps[0].env.CARGO_TARGET_DIR, 'target-rust-tests/daily');
  assert.equal(
    appApi.steps.some((step) => step.args.includes('database_config_router')),
    true,
  );
  assert.equal(appApi.steps[0].args.includes('sdkwork-clawrouter-standalone-gateway'), true);

  const gateway = module.buildRustTestPlan(module.parseArgs(['gateway']), {
    env: {},
    platform: 'linux',
  });
  assert.equal(gateway.profile, 'gateway');
  assert.equal(gateway.steps.some((step) => step.args.includes('provider_passthrough_route')), true);
  assert.equal(gateway.steps.some((step) => step.args.includes('edge_server')), true);

  const productRelay = module.buildRustTestPlan(module.parseArgs(['product-relay']), {
    env: {},
    platform: 'linux',
  });
  assert.equal(productRelay.profile, 'product-relay');
  assert.equal(
    productRelay.steps.some((step) => step.args.includes('openai_compatible_http_relay')),
    true,
  );
  assert.equal(
    productRelay.steps.some((step) => step.args.includes('openai_chat_adapter_api')),
    true,
  );

  const runtime = module.buildRustTestPlan(module.parseArgs(['runtime']), {
    env: {},
    platform: 'linux',
  });
  assert.equal(runtime.profile, 'runtime');
  assert.equal(runtime.steps.length, 1);
  assert.equal(runtime.steps[0].env.SDKWORK_CLAW_HTTP_OPENAPI_BUILD_MODE, 'copy');
  assert.deepEqual(runtime.steps[0].args.slice(0, 11), [
    'test',
    '-p',
    'sdkwork-clawrouter-router-service',
    '-p',
    'sdkwork-clawrouter-cloud-gateway',
    '-p',
    'sdkwork-clawrouter-admin-gateway',
    '-p',
    'sdkwork-clawrouter-standalone-gateway',
    '-p',
    'sdkwork-claw-installer',
  ]);

  const full = module.buildRustTestPlan(module.parseArgs(['full', '--test-threads', '1']), {
    env: {},
    platform: 'linux',
  });
  assert.equal(full.profile, 'full');
  assert.equal(full.targetDir, 'target-rust-tests/full');
  assert.ok(full.steps.length > 1);
  assert.deepEqual(full.steps[0].args.slice(0, 2), ['test', '--workspace']);
  assert.equal(full.steps[0].args.includes('--exclude'), true);
  assert.equal(full.steps.some((step) => step.args.join(' ') === 'test --workspace -- --test-threads 1'), false);
  assert.equal(
    full.steps.some((step) =>
      step.args.includes('-p')
      && step.args.includes('sdkwork-clawrouter-router-service')
      && step.args.includes('--all-targets')
    ),
    true,
  );
  assert.equal(
    full.steps.every((step) => step.args.slice(-3).join(' ') === '-- --test-threads 1'),
    true,
  );

  const autoDefault = module.buildRustTestPlan(module.parseArgs(['auto']), {
    env: {},
    platform: 'linux',
    cwd: path.join(workspaceRoot, 'target-no-git'),
  });
  assert.equal(autoDefault.profile, 'auto');
  assert.equal(autoDefault.resolvedProfile, 'quick');
  assert.equal(autoDefault.steps[0].label, 'rust format for frequently touched packages');

  const autoExactTestTarget = module.buildRustTestPlan(
    module.parseArgs([
      'auto',
      '--changed-file',
      'services/sdkwork-clawrouter-router-service/tests/openai_compatible_http_relay.rs',
    ]),
    {
      env: {},
      platform: 'linux',
    },
  );
  assert.equal(autoExactTestTarget.profile, 'auto');
  assert.equal(autoExactTestTarget.resolvedProfile, 'auto-targets');
  assert.equal(autoExactTestTarget.steps.length, 1);
  assert.deepEqual(autoExactTestTarget.steps[0].args, [
    'test',
    '-p',
    'sdkwork-clawrouter-router-service',
    '--test',
    'openai_compatible_http_relay',
  ]);

  const autoGatewayServiceChange = module.buildRustTestPlan(
    module.parseArgs([
      'auto',
      '--changed-file',
      'crates/sdkwork-clawrouter-cloud-gateway/src/edge_server.rs',
    ]),
    {
      env: {},
      platform: 'linux',
      cwd: workspaceRoot,
    },
  );
  assert.equal(autoGatewayServiceChange.resolvedProfile, 'auto-targets');
  assert.deepEqual(autoGatewayServiceChange.steps[0].args, [
    'test',
    '-p',
    'sdkwork-clawrouter-cloud-gateway',
    '--test',
    'edge_server',
  ]);

  const autoProductServiceChange = module.buildRustTestPlan(
    module.parseArgs([
      'auto',
      '--changed-file',
      'services/sdkwork-clawrouter-router-service/src/api/app_runtime.rs',
    ]),
    {
      env: {},
      platform: 'linux',
      cwd: workspaceRoot,
    },
  );
  assert.equal(autoProductServiceChange.resolvedProfile, 'auto-targets');
  assert.deepEqual(autoProductServiceChange.steps[0].args, [
    'test',
    '-p',
    'sdkwork-clawrouter-router-service',
    '--test',
    'app_runtime_api',
  ]);

  const autoFallbackServiceChange = module.buildRustTestPlan(
    module.parseArgs([
      'auto',
      '--changed-file',
      'crates/sdkwork-clawrouter-cloud-gateway/src/runtime.rs',
    ]),
    {
      env: {},
      platform: 'linux',
      cwd: workspaceRoot,
    },
  );
  assert.equal(autoFallbackServiceChange.resolvedProfile, 'gateway');

  const autoMixedServiceChange = module.buildRustTestPlan(
    module.parseArgs([
      'auto',
      '--changed-file',
      'crates/sdkwork-clawrouter-cloud-gateway/src/edge_server.rs',
      '--changed-file',
      'services/sdkwork-clawrouter-router-service/src/api/app_runtime.rs',
    ]),
    {
      env: {},
      platform: 'linux',
      cwd: workspaceRoot,
    },
  );
  assert.equal(autoMixedServiceChange.resolvedProfile, 'auto-targets');
  assert.equal(autoMixedServiceChange.steps.some((step) => step.args.includes('edge_server')), true);
  assert.equal(autoMixedServiceChange.steps.some((step) => step.args.includes('app_runtime_api')), true);
  assert.equal(
    autoMixedServiceChange.steps.some((step) => step.args.includes('postgres_app_runtime_sql_contract')),
    true,
  );
  assert.equal(autoMixedServiceChange.steps.some((step) => step.args.includes('sqlite_app_runtime_store')), true);

  const autoProductInstalledSqliteHelperChange = module.buildRustTestPlan(
    module.parseArgs([
      'auto',
      '--changed-file',
      'crates/sdkwork-clawrouter-router-service-test-support/src/lib.rs',
    ]),
    {
      env: {},
      platform: 'linux',
      cwd: workspaceRoot,
    },
  );
  assert.equal(autoProductInstalledSqliteHelperChange.resolvedProfile, 'auto-targets');
  assert.equal(
    autoProductInstalledSqliteHelperChange.steps.some((step) => step.args.includes('sqlite_admin_channel_group_store')),
    true,
  );
  assert.equal(
    autoProductInstalledSqliteHelperChange.steps.some((step) => step.args.includes('sqlite_admin_channel_store')),
    true,
  );
  assert.equal(
    autoProductInstalledSqliteHelperChange.steps.some((step) => step.args.includes('app_runtime_api')),
    false,
  );

  const autoProductSchemaFixtureChange = module.buildRustTestPlan(
    module.parseArgs([
      'auto',
      '--changed-file',
      'crates/sdkwork-clawrouter-router-service-test-support/src/schema.rs',
    ]),
    {
      env: {},
      platform: 'linux',
      cwd: workspaceRoot,
    },
  );
  assert.equal(autoProductSchemaFixtureChange.resolvedProfile, 'auto-targets');
  assert.equal(
    autoProductSchemaFixtureChange.steps.some((step) => step.args.includes('sqlite_admin_channel_group_store')),
    true,
  );
  assert.equal(
    autoProductSchemaFixtureChange.steps.some((step) => step.args.includes('sqlite_app_store_installed_seed')),
    false,
  );
  assert.equal(
    autoProductSchemaFixtureChange.steps.some((step) => step.args.includes('database_installer')),
    false,
  );

  const autoProductRepairFixtureChange = module.buildRustTestPlan(
    module.parseArgs([
      'auto',
      '--changed-file',
      'crates/sdkwork-clawrouter-router-service-test-support/src/repair.rs',
    ]),
    {
      env: {},
      platform: 'linux',
      cwd: workspaceRoot,
    },
  );
  assert.equal(autoProductRepairFixtureChange.resolvedProfile, 'auto-targets');
  assert.equal(
    autoProductRepairFixtureChange.steps.some((step) => step.args.includes('database_installer')),
    true,
  );
  assert.equal(
    autoProductRepairFixtureChange.steps.some((step) => step.args.includes('sqlite_admin_channel_group_store')),
    false,
  );

  const autoProductInstalledFixtureChange = module.buildRustTestPlan(
    module.parseArgs([
      'auto',
      '--changed-file',
      'crates/sdkwork-clawrouter-router-service-test-support/src/installed.rs',
    ]),
    {
      env: {},
      platform: 'linux',
      cwd: workspaceRoot,
    },
  );
  assert.equal(autoProductInstalledFixtureChange.resolvedProfile, 'auto-targets');
  assert.equal(
    autoProductInstalledFixtureChange.steps.some((step) => step.args.includes('database_installer')),
    false,
  );
  assert.equal(
    autoProductInstalledFixtureChange.steps.some((step) => step.args.includes('database_installer_installed')),
    true,
  );
  assert.equal(
    autoProductInstalledFixtureChange.steps.some((step) => step.args.includes('sqlite_admin_channel_group_store')),
    false,
  );

  const autoProductCommonModuleChange = module.buildRustTestPlan(
    module.parseArgs([
      'auto',
      '--changed-file',
      'services/sdkwork-clawrouter-router-service/tests/common/mod.rs',
    ]),
    {
      env: {},
      platform: 'linux',
      cwd: workspaceRoot,
    },
  );
  assert.equal(autoProductCommonModuleChange.resolvedProfile, 'auto-targets');
  assert.equal(
    autoProductCommonModuleChange.steps.some((step) => step.args.includes('admin_channel_group_api')),
    true,
  );
  assert.equal(
    autoProductCommonModuleChange.steps.some((step) => step.args.includes('app_runtime_api')),
    true,
  );
  assert.equal(
    autoProductCommonModuleChange.steps.some((step) => step.args.includes('sqlite_admin_channel_group_store')),
    false,
  );

  assert.deepEqual(module.parseArgs(['auto', '--staged']), {
    profile: 'auto',
    changedFiles: [],
    staged: true,
    baseRef: null,
    targetDir: null,
    buildJobs: null,
    testThreads: null,
    dryRun: false,
    help: false,
  });
  assert.deepEqual(module.parseArgs(['auto', '--base-ref', 'main']), {
    profile: 'auto',
    changedFiles: [],
    staged: false,
    baseRef: 'main',
    targetDir: null,
    buildJobs: null,
    testThreads: null,
    dryRun: false,
    help: false,
  });
  assert.throws(
    () => module.parseArgs(['auto', '--staged', '--base-ref', 'main']),
    /Choose only one auto change selector/u,
  );

  const stagedFixtureRepo = await createRustAutoFixtureRepo();
  try {
    writeFixtureFile(
      stagedFixtureRepo,
      'services/sdkwork-clawrouter-router-service/tests/openai_compatible_http_relay.rs',
      '// staged relay change\n',
    );
    await runGit(stagedFixtureRepo, ['add', 'services/sdkwork-clawrouter-router-service/tests/openai_compatible_http_relay.rs']);
    writeFixtureFile(
      stagedFixtureRepo,
      'crates/sdkwork-clawrouter-cloud-gateway/src/runtime.rs',
      '// unstaged runtime noise\n',
    );

    const autoStagedSelection = module.buildRustTestPlan(
      module.parseArgs(['auto', '--staged']),
      {
        env: {},
        platform: 'linux',
        cwd: stagedFixtureRepo,
      },
    );
    assert.equal(autoStagedSelection.resolvedProfile, 'auto-targets');
    assert.equal(autoStagedSelection.steps.length, 1);
    assert.deepEqual(autoStagedSelection.steps[0].args, [
      'test',
      '-p',
      'sdkwork-clawrouter-router-service',
      '--test',
      'openai_compatible_http_relay',
    ]);
  } finally {
    rmSync(stagedFixtureRepo, { recursive: true, force: true });
  }

  const baseRefFixtureRepo = await createRustAutoFixtureRepo();
  try {
    await runGit(baseRefFixtureRepo, ['checkout', '-b', 'feature/edge-server']);
    writeFixtureFile(
      baseRefFixtureRepo,
      'crates/sdkwork-clawrouter-cloud-gateway/src/edge_server.rs',
      '// committed feature change\n',
    );
    await runGit(baseRefFixtureRepo, ['add', 'crates/sdkwork-clawrouter-cloud-gateway/src/edge_server.rs']);
    await runGit(baseRefFixtureRepo, ['commit', '-m', 'feature change']);
    writeFixtureFile(
      baseRefFixtureRepo,
      'services/sdkwork-clawrouter-router-service/src/api/app_runtime.rs',
      '// dirty local noise\n',
    );

    const autoBaseRefSelection = module.buildRustTestPlan(
      module.parseArgs(['auto', '--base-ref', 'main']),
      {
        env: {},
        platform: 'linux',
        cwd: baseRefFixtureRepo,
      },
    );
    assert.equal(autoBaseRefSelection.resolvedProfile, 'auto-targets');
    assert.equal(autoBaseRefSelection.steps.length, 1);
    assert.deepEqual(autoBaseRefSelection.steps[0].args, [
      'test',
      '-p',
      'sdkwork-clawrouter-cloud-gateway',
      '--test',
      'edge_server',
    ]);
  } finally {
    rmSync(baseRefFixtureRepo, { recursive: true, force: true });
  }
});

test('workspace rust formatter uses per-package cargo-fmt to avoid Windows argument limits', () => {
  const formatter = readFileSync(path.join(workspaceRoot, 'scripts', 'cargo-fmt-workspace.mjs'), 'utf8');
  assert.match(formatter, /function resolveCargoFmtCommand/u);
  assert.doesNotMatch(formatter, /runInherited\('cargo', args\)/u);
});

test('rust test process cleanup scopes Windows stops to repository-local targets', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'stop-claw-router-test-processes.mjs')).href
  );

  const candidates = module.selectStoppableProcesses(
    [
      {
        Id: 1,
        ProcessName: 'database_config_router',
        Path: path.join(workspaceRoot, 'target', 'debug', 'deps', 'database_config_router.exe'),
      },
      {
        Id: 2,
        ProcessName: 'sdkwork-clawrouter-admin-gateway',
        Path: path.join(workspaceRoot, 'target-rust-tests', 'quick', 'debug', 'sdkwork-clawrouter-admin-gateway.exe'),
      },
      {
        Id: 3,
        ProcessName: 'unrelated',
        Path: path.join(path.dirname(workspaceRoot), 'other-project', 'target', 'debug', 'unrelated.exe'),
      },
      {
        Id: 4,
        ProcessName: 'cargo',
        Path: 'C:\\Users\\admin\\.rustup\\toolchains\\stable-x86_64-pc-windows-msvc\\bin\\cargo.exe',
      },
    ],
    { workspaceRoot, currentPid: 999 },
  );

  assert.deepEqual(candidates.map((processInfo) => processInfo.Id), [1, 2]);
});

test('nginx deployment spec documents the sdkwork site-family path convention', () => {
  const specsRoot = resolveClawRouterBusinessSpecsRoot(workspaceRoot);
  const nginxSpecPath = path.join(specsRoot, 'NGINX_SPEC.md');

  assert.equal(existsSync(nginxSpecPath), true, 'specs/NGINX_SPEC.md must exist');

  const nginxSpec = readFileSync(nginxSpecPath, 'utf8');
  assert.ok(nginxSpec.includes('/etc/nginx/sites-enabled/sdkwork/<domain>.conf'));
  assert.ok(nginxSpec.includes('/etc/nginx/sites-enabled/sdkwork/api.sdkwork.com.conf'));
  assert.ok(nginxSpec.includes('/etc/nginx/sites-enabled/sdkwork/www.sdkwork.com.conf'));
  assert.ok(nginxSpec.includes('/opt/certs/letsencrypt/live/<cert-name>/fullchain.pem'));
  assert.ok(nginxSpec.includes('/opt/certs/letsencrypt/live/<cert-name>/privkey.pem'));
  assert.ok(nginxSpec.includes('etc/nginx/NGINX_SAMPLE.conf'));
  assert.ok(nginxSpec.includes('pnpm nginx:deploy -- --domain api.sdkwork.com'));
  assert.ok(nginxSpec.includes('http://127.0.0.1:3900'));
});

test('nginx configurator renders full-domain config files with standardized certs', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'configure-nginx.mjs')).href
  );

  const settings = module.parseNginxConfigureArgs([
    '--domain',
    'api.sdkwork.com',
    '--site-family',
    'sdkwork',
    '--site-type',
    'api',
    '--dry-run',
  ]);
  assert.equal(settings.domain, 'api.sdkwork.com');
  assert.equal(settings.siteFamily, 'sdkwork');
  assert.equal(settings.siteType, 'api');
  assert.equal(settings.upstream, 'http://127.0.0.1:3900');
  assert.equal(settings.certRoot, '/opt/certs/letsencrypt/live');
  assert.equal(settings.certName, null);
  assert.equal(settings.dryRun, true);

  const linuxPlan = module.createNginxDeploymentPlan(settings, {
    platform: 'linux',
    workspaceRoot,
  });
  assert.equal(linuxPlan.domain, 'api.sdkwork.com');
  assert.equal(linuxPlan.siteFamily, 'sdkwork');
  assert.equal(linuxPlan.nginxConfigPath, '/etc/nginx/sites-enabled/sdkwork/api.sdkwork.com.conf');
  assert.equal(linuxPlan.outputPath, '/etc/nginx/sites-enabled/sdkwork/api.sdkwork.com.conf');
  assert.equal(linuxPlan.fileName, 'api.sdkwork.com.conf');
  assert.equal(linuxPlan.upstream, 'http://127.0.0.1:3900');
  assert.equal(linuxPlan.certificates.fullchain, '/opt/certs/letsencrypt/live/sdkwork.com/fullchain.pem');
  assert.equal(linuxPlan.certificates.privkey, '/opt/certs/letsencrypt/live/sdkwork.com/privkey.pem');

  const rendered = module.renderNginxConfig(linuxPlan);
  assert.ok(rendered.includes('server_name api.sdkwork.com;'));
  assert.ok(rendered.includes('proxy_pass http://127.0.0.1:3900;'));
  assert.ok(rendered.includes('http://127.0.0.1:3900/backend/v3/api/net/dns/record/verify'));
  assert.ok(rendered.includes('ssl_certificate /opt/certs/letsencrypt/live/sdkwork.com/fullchain.pem;'));
  assert.ok(rendered.includes('ssl_certificate_key /opt/certs/letsencrypt/live/sdkwork.com/privkey.pem;'));
  assert.ok(rendered.includes('ssl_protocols TLSv1.2 TLSv1.3;'));
  assert.equal(rendered.includes('127.0.0.1:8080'), false);

  const windowsPlan = module.createNginxDeploymentPlan(
    module.parseNginxConfigureArgs(['--domain', 'www.sdkwork.com', '--site-type', 'web']),
    { platform: 'win32', workspaceRoot },
  );
  assert.equal(windowsPlan.nginxConfigPath, '/etc/nginx/sites-enabled/sdkwork/www.sdkwork.com.conf');
  assert.equal(windowsPlan.fileName, 'www.sdkwork.com.conf');
  assert.equal(
    slashPath(path.relative(workspaceRoot, windowsPlan.outputPath)),
    'target/nginx/sites-enabled/sdkwork/www.sdkwork.com.conf',
  );

  assert.throws(
    () => module.createNginxDeploymentPlan(
      module.parseNginxConfigureArgs(['--domain', '../api.sdkwork.com']),
      { platform: 'linux', workspaceRoot },
    ),
    /domain must be a fully qualified hostname/,
  );
});

test('rust target measurement plan covers known slow integration surfaces', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'measure-claw-router-test-targets.mjs')).href
  );

  const plan = module.buildMeasurementPlan(module.parseArgs(['--dry-run']), {
    env: {},
    platform: 'win32',
  });
  assert.equal(plan.targetDir, 'target-rust-tests\\measure');
  assert.equal(plan.steps.length > 8, true);
  assert.equal(
    plan.steps.some(
      (step) =>
        step.packageName === 'sdkwork-clawrouter-admin-gateway' &&
        step.testTarget === 'database_config_router',
    ),
    true,
  );
  assert.equal(
    plan.steps.some(
      (step) =>
        step.packageName === 'sdkwork-clawrouter-cloud-gateway' &&
        step.testTarget === 'provider_passthrough_route',
    ),
    true,
  );
  assert.equal(
    plan.steps.some(
      (step) =>
        step.packageName === 'sdkwork-clawrouter-router-service' &&
        step.testTarget === 'openai_compatible_http_relay',
    ),
    true,
  );
  assert.equal(plan.steps[0].env.SDKWORK_CLAW_HTTP_OPENAPI_BUILD_MODE, 'copy');
  assert.equal('CARGO_BUILD_JOBS' in plan.steps[0].env, false);

  const explicitBuildJobsPlan = module.buildMeasurementPlan(
    module.parseArgs(['--dry-run', '--build-jobs', '5']),
    {
      env: { CARGO_BUILD_JOBS: '1' },
      platform: 'linux',
    },
  );
  assert.equal(explicitBuildJobsPlan.steps[0].env.CARGO_BUILD_JOBS, '5');
});

test('nginx examples use the production edge upstream and full-domain filenames', () => {
  const nginxSample = readFileSync(path.join(workspaceRoot, 'etc', 'nginx', 'NGINX_SAMPLE.conf'), 'utf8');
  assert.ok(nginxSample.includes('Deploy path: /etc/nginx/sites-enabled/sdkwork/api.sdkwork.com.conf'));
  assert.ok(nginxSample.includes('server_name api.sdkwork.com;'));
  assert.ok(nginxSample.includes('proxy_pass http://127.0.0.1:3900;'));
  assert.ok(nginxSample.includes('/opt/certs/letsencrypt/live/sdkwork.com/fullchain.pem'));
  assert.equal(nginxSample.includes('127.0.0.1:8080'), false);

  const apiSample = readFileSync(path.join(workspaceRoot, 'etc', 'nginx', 'API_SAMPLE.conf'), 'utf8');
  assert.ok(apiSample.includes('server_name api.sdkwork.com;'));
  assert.ok(apiSample.includes('proxy_pass http://127.0.0.1:3900;'));
  assert.ok(apiSample.includes('/opt/certs/letsencrypt/live/sdkwork.com/fullchain.pem'));
  assert.equal(apiSample.includes('127.0.0.1:8080'), false);

  for (const domain of ['api.sdkwork.com', 'www.sdkwork.com']) {
    const examplePath = path.join(workspaceRoot, 'etc', 'nginx', 'sdkwork', `${domain}.conf`);
    assert.equal(existsSync(examplePath), true, `${domain}.conf example must exist`);
    const config = readFileSync(examplePath, 'utf8');
    assert.ok(config.includes(`server_name ${domain};`));
    assert.ok(config.includes('proxy_pass http://127.0.0.1:3900;'));
    assert.ok(config.includes('/opt/certs/letsencrypt/live/sdkwork.com/fullchain.pem'));
    assert.equal(config.includes('127.0.0.1:8080'), false);
  }
});

test('installation documentation covers release, source, initialization, usage, and valid local links', () => {
  const rootReadme = readFileSync(path.join(workspaceRoot, 'README.md'), 'utf8');
  const requiredDocs = [
    'docs/installation/README.md',
    'docs/installation/zh-CN/README.md',
    'docs/installation/zh-CN/release-install.md',
    'docs/installation/zh-CN/source-install.md',
    'docs/installation/zh-CN/initialization.md',
    'docs/installation/zh-CN/deployment-modes.md',
    'docs/installation/zh-CN/usage.md',
    'docs/installation/en-US/README.md',
    'docs/installation/en-US/release-install.md',
    'docs/installation/en-US/source-install.md',
    'docs/installation/en-US/initialization.md',
    'docs/installation/en-US/deployment-modes.md',
    'docs/installation/en-US/usage.md',
    'docs/installation/postgresql-database-configuration.md',
    'docs/installation/postgresql-development.md',
    'docs/installation/postgresql-production.md',
  ];
  for (const relativePath of requiredDocs) {
    assert.equal(existsSync(path.join(workspaceRoot, relativePath)), true, `${relativePath} must exist`);
  }

  assert.ok(rootReadme.includes('./docs/installation/README.md'));
  assert.ok(rootReadme.includes('./docs/installation/zh-CN/release-install.md'));
  assert.ok(rootReadme.includes('./docs/installation/en-US/source-install.md'));

  const zhRelease = readFileSync(path.join(workspaceRoot, 'docs/installation/zh-CN/release-install.md'), 'utf8');
  const enRelease = readFileSync(path.join(workspaceRoot, 'docs/installation/en-US/release-install.md'), 'utf8');
  const zhSource = readFileSync(path.join(workspaceRoot, 'docs/installation/zh-CN/source-install.md'), 'utf8');
  const enSource = readFileSync(path.join(workspaceRoot, 'docs/installation/en-US/source-install.md'), 'utf8');
  const zhUsage = readFileSync(path.join(workspaceRoot, 'docs/installation/zh-CN/usage.md'), 'utf8');
  const enUsage = readFileSync(path.join(workspaceRoot, 'docs/installation/en-US/usage.md'), 'utf8');
  const installationIndex = readFileSync(path.join(workspaceRoot, 'docs/installation/README.md'), 'utf8');
  const zhInstallationIndex = readFileSync(path.join(workspaceRoot, 'docs/installation/zh-CN/README.md'), 'utf8');
  const enInstallationIndex = readFileSync(path.join(workspaceRoot, 'docs/installation/en-US/README.md'), 'utf8');
  const postgresqlIndex = readFileSync(path.join(workspaceRoot, 'docs/installation/postgresql-database-configuration.md'), 'utf8');
  const postgresqlDevelopment = readFileSync(path.join(workspaceRoot, 'docs/installation/postgresql-development.md'), 'utf8');
  const postgresqlProduction = readFileSync(path.join(workspaceRoot, 'docs/installation/postgresql-production.md'), 'utf8');

  assert.ok(zhRelease.includes('clawrouter-linux-x64-archive-0.3.0.tar.gz'));
  assert.ok(enRelease.includes('clawrouter-linux-x64-archive-0.3.0.tar.gz'));
  assert.ok(zhRelease.includes('pnpm install:package:build -- --package-id linux-x64-service'));
  assert.ok(enRelease.includes('pnpm install:package:build -- --package-id linux-x64-service'));
  assert.ok(zhRelease.includes('sudo apt install ./clawrouter-linux-x64-server-0.3.0.deb'));
  assert.ok(enRelease.includes('sudo apt install ./clawrouter-linux-x64-server-0.3.0.deb'));
  assert.ok(zhRelease.includes('/etc/nginx/sites-enabled/sdkwork/api.sdkwork.com.conf'));
  assert.ok(enRelease.includes('/etc/nginx/sites-enabled/sdkwork/api.sdkwork.com.conf'));
  assert.ok(zhRelease.includes('etc/nginx/NGINX_SAMPLE.conf'));
  assert.ok(enRelease.includes('etc/nginx/NGINX_SAMPLE.conf'));
  assert.ok(zhRelease.includes('sudo pnpm nginx:deploy -- --domain api.sdkwork.com --cert-name sdkwork.com'));
  assert.ok(enRelease.includes('sudo pnpm nginx:deploy -- --domain api.sdkwork.com --cert-name sdkwork.com'));
  for (const readme of [rootReadme, installationIndex, zhInstallationIndex, enInstallationIndex]) {
    assert.ok(readme.includes('/etc/nginx/sites-enabled/sdkwork/api.sdkwork.com.conf'));
    assert.ok(readme.includes('etc/nginx/NGINX_SAMPLE.conf'));
    assert.ok(readme.includes('pnpm nginx:plan -- --domain api.sdkwork.com'));
    assert.ok(readme.includes('sudo pnpm nginx:deploy -- --domain api.sdkwork.com --cert-name sdkwork.com'));
    assert.ok(readme.includes('http://127.0.0.1:3900'));
  }
  assert.equal(zhRelease.includes('sudo systemctl enable --now clawrouter'), false);
  assert.equal(enRelease.includes('sudo systemctl enable --now clawrouter'), false);
  assert.ok(enRelease.includes('/usr/bin/clawrouter'));
  assert.ok(enRelease.includes('/usr/lib/sdkwork/router'));
  assert.ok(enRelease.includes('root:sdkwork'));
  assert.ok(enRelease.includes('0640'));
  assert.ok(enRelease.includes('0750'));
  assert.ok(enRelease.includes('inherited ProgramData ACLs'));
  assert.ok(enRelease.includes('root:wheel'));
  assert.ok(zhRelease.includes('[redis]'));
  assert.ok(enRelease.includes('[redis]'));
  assert.ok(zhRelease.includes('/etc/sdkwork/router/redis.secret'));
  assert.ok(enRelease.includes('/etc/sdkwork/router/redis.secret'));
  assert.ok(zhRelease.includes('host = "redis.example.com"'));
  assert.ok(enRelease.includes('host = "redis.example.com"'));
  assert.ok(zhRelease.includes('port = 6379'));
  assert.ok(enRelease.includes('port = 6379'));
  assert.ok(zhRelease.includes('database = 0'));
  assert.ok(enRelease.includes('database = 0'));
  assert.ok(zhRelease.includes('./bin/clawrouterctl ensure'));
  assert.ok(enRelease.includes('./bin/clawrouterctl ensure'));
  assert.ok(zhSource.includes('pnpm release:env:write -- --check'));
  assert.ok(enSource.includes('pnpm release:env:write -- --check'));
  assert.ok(zhSource.includes('\u76ee\u6807\u673a\u5668\u540e\uff0c\u4e0d\u8981\u6c42\u5b89\u88c5 `pnpm`'));
  assert.ok(enSource.includes('the host does not need `pnpm`'));
  assert.ok(zhUsage.includes('\u6ce8\u518c\u662f\u5426\u9700\u8981\u9a8c\u8bc1\u7801\u7531 IAM \u8fd0\u884c\u65f6\u7b56\u7565\u63a7\u5236\u3002'));
  assert.ok(enUsage.includes('Whether registration requires verification code is controlled by IAM runtime policy'));
  assert.ok(zhUsage.includes('SDK 包版本独立于 Claw Router release 版本'));
  assert.ok(enUsage.includes('SDK package versions are independent from Claw Router release versions'));
  assert.ok(rootReadme.includes('Client development commands use `sdkwork-api-cloud-gateway` for API integration.'));
  assert.ok(rootReadme.includes('Explicit product server development commands use PostgreSQL for integration'));
  assert.ok(rootReadme.includes('Desktop packages and first-run local user data use SQLite under `~/.sdkwork/router/data`.'));
  assert.ok(postgresqlIndex.includes('./postgresql-development.md'));
  assert.ok(postgresqlIndex.includes('./postgresql-production.md'));
  assert.ok(postgresqlIndex.includes('pnpm dev:server:postgres'));
  assert.ok(postgresqlDevelopment.includes('pnpm dev:browser'));
  assert.ok(postgresqlDevelopment.includes('pnpm dev'));
  assert.ok(postgresqlDevelopment.includes('pnpm dev:server'));
  assert.ok(postgresqlDevelopment.includes('pnpm dev:desktop'));
  assert.ok(postgresqlDevelopment.includes('Copy-Item .env.postgres.example .env.postgres'));
  assert.ok(postgresqlDevelopment.includes('SDKWORK_CLAW_DATABASE_ENGINE=postgresql'));
  assert.ok(!postgresqlDevelopment.includes('SDKWORK_CLAW_DATABASE_PROVIDER=postgresql'));
  assert.ok(postgresqlDevelopment.includes('pnpm dev:server:postgres'));
  assert.ok(postgresqlDevelopment.includes('Default local PostgreSQL dev database'));
  assert.ok(postgresqlDevelopment.includes('Workspace desktop commands are gateway-backed client commands.'));
  assert.ok(postgresqlDevelopment.includes('Use `pnpm dev:server` for PostgreSQL-backed product server debugging'));
  assert.ok(postgresqlDevelopment.includes('Desktop packages and desktop user data still use SQLite by default.'));
  assert.ok(postgresqlDevelopment.includes('~/.sdkwork/router/data/clawrouter.sqlite'));
  assert.ok(postgresqlIndex.includes('Desktop/runtime local user data remains SQLite by default.'));
  assert.ok(postgresqlIndex.includes('Workspace desktop development commands are gateway-backed client commands; they'));
  assert.ok(postgresqlIndex.includes('do not start a product backend service. Packaged desktop runtime and'));
  assert.ok(postgresqlIndex.includes('desktop local data profile stores SQLite under `~/.sdkwork/router/data/clawrouter.sqlite`'));
  assert.ok(postgresqlProduction.includes('/etc/sdkwork/router/clawrouter.toml'));
  assert.ok(postgresqlProduction.includes('/etc/sdkwork/router/database.secret'));
  assert.ok(postgresqlProduction.includes('password_file = "/etc/sdkwork/router/database.secret"'));
  assert.ok(postgresqlProduction.includes('SDKWORK_CLAW_DATABASE_URL'));
  assert.ok(postgresqlProduction.includes('Desktop local runtime'));
  assert.ok(postgresqlProduction.includes('~/.sdkwork/router/data/clawrouter.sqlite'));
  assert.ok(enRelease.includes('This desktop SQLite policy is independent from the explicit product server PostgreSQL development profile used by `pnpm dev`, `pnpm dev:server`, and `pnpm dev:server:postgres` for the backend service runtime.'));
  assert.ok(enRelease.includes('Gateway-backed client commands such as `pnpm dev:desktop` and `pnpm dev:desktop:sqlite` run through `sdkwork-api-cloud-gateway` and do not start a Claw Router backend service.'));

  for (const relativePath of ['README.md', ...requiredDocs]) {
    assertMarkdownLocalLinksExist(relativePath);
  }
});

test('root release entrypoint regenerates the release env before strict preflight and verify', () => {
  const rootPackage = JSON.parse(
    readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'),
  );
  const releaseScript = rootPackage.scripts.release;
  const downloadsCheckIndex = releaseScript.indexOf('pnpm downloads:check');
  const envCheckIndex = releaseScript.indexOf('pnpm release:env:write -- --check');
  const envWriteIndex = releaseScript.indexOf('pnpm release:env:write -- --force');
  const preflightIndex = releaseScript.indexOf('pnpm release:preflight -- --strict --env-file .env.release --strict-root-clean');
  const verifyIndex = releaseScript.indexOf('pnpm verify');

  assert.ok(downloadsCheckIndex >= 0, 'release must validate checked-in download JSON before release preflight');
  assert.ok(envCheckIndex > downloadsCheckIndex, 'release must validate download JSON before release env');
  assert.ok(envWriteIndex > envCheckIndex, 'release must write .env.release after check');
  assert.ok(preflightIndex > envWriteIndex, 'release must run strict preflight after env write');
  assert.ok(verifyIndex > preflightIndex, 'release must run verify after strict preflight');
  assert.ok(!releaseScript.includes('.env.release.example'), 'release must not write or consume the checked-in example template');
});

test('download catalog generator derives homepage JSON from release version and package matrix', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'update-claw-router-downloads.mjs')).href
  );

  const catalog = module.createClawRouterDownloadCatalog({
    generatedAt: '2026-05-18T00:00:00.000Z',
    releaseBaseUrl: 'https://downloads.example.test/releases/v1.2.3',
    releaseTag: 'v1.2.3',
    version: '1.2.3',
  });
  const actions = catalog.cards.flatMap((card) => card.actions);
  const actionsById = new Map(actions.map((action) => [action.id, action]));

  assert.equal(catalog.schemaVersion, '2026-05-18.sdkwork-download-catalog.v1');
  assert.equal(catalog.product.version, '1.2.3');
  assert.equal(catalog.product.releaseTag, 'v1.2.3');
  assert.deepEqual(catalog.cards.map((card) => card.kind), ['desktop', 'server', 'mobile']);
  assert.equal(
    actionsById.get('desktop-windows-x64')?.href,
    'https://downloads.example.test/releases/v1.2.3/clawrouter-windows-x64-desktop-1.2.3.msi',
  );
  assert.equal(
    actionsById.get('server-linux-x64')?.href,
    'https://downloads.example.test/releases/v1.2.3/clawrouter-linux-x64-server-1.2.3.deb',
  );
  assert.equal(actionsById.get('server-docker')?.disabled, true);
  assert.equal(actionsById.get('mobile-android')?.disabled, true);
  assert.equal(actions.some((action) => action.href === '#'), false);
});

test('download catalog generator emits selectable CDN sources only when configured', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'update-claw-router-downloads.mjs')).href
  );

  const githubOnlyCatalog = module.createClawRouterDownloadCatalog({
    generatedAt: '2026-05-18T00:00:00.000Z',
    releaseBaseUrl: 'https://github.com/Sdkwork-Cloud/sdkwork-clawrouter/releases/download/v1.2.3',
    releaseTag: 'v1.2.3',
    version: '1.2.3',
  });
  const cdnCatalog = module.createClawRouterDownloadCatalog({
    cdnBaseUrl: 'https://cdn.example.test/claw-router/v1.2.3',
    generatedAt: '2026-05-18T00:00:00.000Z',
    releaseBaseUrl: 'https://github.com/Sdkwork-Cloud/sdkwork-clawrouter/releases/download/v1.2.3',
    releaseTag: 'v1.2.3',
    version: '1.2.3',
  });
  const githubOnlyActions = githubOnlyCatalog.cards.flatMap((card) => card.actions);
  const cdnActionsById = new Map(cdnCatalog.cards.flatMap((card) => card.actions.map((action) => [action.id, action])));
  const windowsSources = cdnActionsById.get('desktop-windows-x64')?.sources ?? [];

  assert.equal(
    githubOnlyActions.some((action) => action.sources?.some((source) => source.id === 'cdn')),
    false,
    'default generated JSON must not include CDN sources',
  );
  assert.deepEqual(windowsSources.map((source) => source.id), ['github', 'cdn']);
  assert.equal(
    windowsSources.find((source) => source.id === 'github')?.href,
    'https://github.com/Sdkwork-Cloud/sdkwork-clawrouter/releases/download/v1.2.3/clawrouter-windows-x64-desktop-1.2.3.msi',
  );
  assert.equal(
    windowsSources.find((source) => source.id === 'cdn')?.href,
    'https://cdn.example.test/claw-router/v1.2.3/clawrouter-windows-x64-desktop-1.2.3.msi',
  );
  assert.equal(cdnActionsById.get('server-docker')?.sources, undefined);
});

test('verification plan checks the release download catalog before expensive suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const fastPlan = module.buildFastVerificationPlan({});
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const fastCommandLines = fastPlan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const downloadsCheckIndex = plan.findIndex((step) => step.label === 'claw router download catalog check');
  const topologyValidateIndex = plan.findIndex((step) => step.label === 'topology spec validate');
  const toolingTestsIndex = plan.findIndex((step) => step.label === 'tooling contract tests');

  assert.ok(downloadsCheckIndex >= 0, 'verification must include the download catalog freshness check');
  assert.ok(topologyValidateIndex >= 0, 'verification must include topology spec validation');
  assert.ok(downloadsCheckIndex < toolingTestsIndex, 'download catalog freshness must fail before broad tooling tests');
  assert.ok(topologyValidateIndex < toolingTestsIndex, 'topology validation must fail before broad tooling tests');
  assert.ok(commandLines.some((commandLine) => /pnpm(?:\.cmd)? downloads:check/u.test(commandLine)));
  assert.ok(fastCommandLines.some((commandLine) => /sdkwork-topology\.mjs validate/u.test(commandLine)));
});

test('app store seed updater defaults to file seed updates and gates database sync behind explicit flag', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'update-app-store-seed.mjs')).href
  );

  const defaults = module.parseAppStoreSeedArgs([]);
  const defaultPlan = module.buildAppStoreSeedCommandPlan(defaults, { workspaceRoot });

  assert.equal(defaults.appsRoot, resolveClawRouterBusinessAppsRoot(workspaceRoot));
  assert.equal(defaults.check, false);
  assert.equal(defaults.syncDb, false);
  assert.equal(defaults.initializeMissing, true);
  assert.deepEqual(defaultPlan.steps.map((step) => step.name), [
    'initialize-missing-app-manifests',
    'export-plus-app-seed',
    'generate-app-category-seed',
  ]);
  assert.equal(defaultPlan.steps.some((step) => step.name === 'sync-database'), false);

  const check = module.parseAppStoreSeedArgs(['--check']);
  const checkPlan = module.buildAppStoreSeedCommandPlan(check, { workspaceRoot });
  assert.equal(check.check, true);
  assert.equal(checkPlan.steps.find((step) => step.name === 'export-plus-app-seed').mode, 'check');
  assert.equal(checkPlan.steps.find((step) => step.name === 'generate-app-category-seed').mode, 'check');

  const sync = module.parseAppStoreSeedArgs(['--sync-db']);
  const syncPlan = module.buildAppStoreSeedCommandPlan(sync, { workspaceRoot });
  assert.deepEqual(syncPlan.steps.at(-1), {
    name: 'sync-database',
    command: 'cargo',
    args: ['run', '-p', 'sdkwork-claw-installer', '--', 'ensure'],
    requiresDatabaseUrl: true,
  });
});

test('app store seed updater emits pure JSON for machine-readable check output', async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    path.join(workspaceRoot, 'scripts', 'update-app-store-seed.mjs'),
    '--check',
    '--json',
  ], {
    cwd: workspaceRoot,
    maxBuffer: 1024 * 1024 * 8,
  });
  const payload = JSON.parse(stdout);

  assert.equal(payload.ok, true);
  assert.equal(payload.mode, 'check');
  assert.equal(payload.appCount > 0, true);
  assert.equal(payload.categoryCount > 0, true);
  assert.equal(payload.databaseSynced, false);
});

test('application scripts keep commercial default ports and reject obsolete aliases', () => {
  const rootPackage = JSON.parse(
    readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'),
  );
  const workspaceStarter = readFileSync(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs'), 'utf8');
  const productionStarter = readFileSync(path.join(workspaceRoot, 'scripts', 'start-claw-router-production.mjs'), 'utf8');
  const portalViteConfig = readFileSync(path.join(portalRoot, 'vite.config.ts'), 'utf8');
  const productSurface = [
    JSON.stringify(rootPackage.scripts),
    workspaceStarter,
    productionStarter,
    portalViteConfig,
  ].join('\n');

  assert.ok(workspaceStarter.includes("const DEFAULT_SERVER_BIND = '0.0.0.0:3900';"));
  assert.ok(workspaceStarter.includes("const DEFAULT_PORTAL_BIND = '127.0.0.1:3901';"));
  assert.ok(productionStarter.includes("'0.0.0.0:3900'"));
  assert.match(portalViteConfig, /DEFAULT_PORTAL_DEV_PORT\s*=\s*3901/u);
  assert.ok(!productSurface.includes('3000'));
  assert.ok(!productSurface.includes('39000'));
  assert.ok(!productSurface.includes('unified_server'));
  assert.ok(!productSurface.includes('unified server'));
  assert.ok(!productSurface.includes('--portal-dev-bind'));
  assert.match(workspaceStarter, /--internal-distributed is retired/u);
  assert.match(workspaceStarter, /--all-in-one is retired/u);
});

test('application scripts wire SDKWork application env standard checks and entrypoints', () => {
  const rootPackage = JSON.parse(
    readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'),
  );
  const verifyScript = readFileSync(
    path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs'),
    'utf8',
  );
  const productRunner = readFileSync(
    path.join(workspaceRoot, 'scripts', 'run-claw-router-application.mjs'),
    'utf8',
  );

  assert.equal(
    rootPackage.scripts['check:application-env'],
    'node --test scripts/lib/claw-router-browser-env-contract.test.mjs scripts/lib/claw-router-edge-env-contract.test.mjs scripts/dev/claw-router-application-env.test.mjs scripts/dev/ensure-claw-router-env.test.mjs scripts/write-release-env.test.mjs scripts/release-environment-validation.test.mjs && node scripts/check-claw-router-application-env.mjs',
  );
  assert.match(rootPackage.scripts.check, /check:application-env/u);
  assert.match(verifyScript, /buildApplicationEnvVerificationPlan/u);
  assert.match(verifyScript, /check:application-env/u);
  assert.match(productRunner, /resolveProductLaunchEnv/u);
  assert.match(productRunner, /ensureClawRouterBrowserProductionEnv/u);
  assert.match(productRunner, /ensureClawRouterBrowserDevelopmentEnv/u);
});

test('portal runtime is served by Rust edge server without Node server entrypoint', () => {
  const forbiddenPortalServerFiles = [
    'server.ts',
    'server.test.ts',
    path.join('scripts', 'build-server.mjs'),
    path.join('scripts', 'smoke-production-server.mjs'),
  ];

  for (const relativeFile of forbiddenPortalServerFiles) {
    assert.equal(
      existsSync(path.join(portalRoot, relativeFile)),
      false,
      `${relativeFile} must be removed; portal runtime belongs to Rust edge server`,
    );
  }

  const portalPackage = JSON.parse(
    readFileSync(path.join(portalRoot, 'package.json'), 'utf8'),
  );
  const rootPackage = JSON.parse(
    readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'),
  );
  const scriptsSurface = JSON.stringify({
    root: rootPackage.scripts,
    portal: portalPackage.scripts,
  });

  assert.ok(!scriptsSurface.includes('server.ts'));
  assert.ok(!scriptsSurface.includes('dist/server.mjs'));
  assert.ok(!scriptsSurface.includes('smoke-production-server.mjs'));
  assert.equal(portalPackage.scripts['deps:check'], 'node scripts/check-portal-deps.mjs');
  assert.equal(portalPackage.scripts.dev, 'pnpm deps:check && vite --configLoader native');
  assert.equal(portalPackage.scripts['dev:browser'], 'pnpm deps:check && vite --configLoader native');
  assert.equal(portalPackage.scripts.preview, 'vite preview --configLoader native');
  assert.equal(portalPackage.scripts.build, 'pnpm deps:check && node scripts/build-portal.mjs');
  assert.equal(portalPackage.scripts.start, 'node ../../scripts/start-claw-router-production.mjs');
  assert.equal(rootPackage.scripts.start, 'node scripts/start-claw-router-production.mjs');
});

test('Rust edge server owns configurable portal CSP connect-src policy', () => {
  const edgeServerSource = readFileSync(
    path.join(workspaceRoot, 'crates', 'sdkwork-clawrouter-cloud-gateway', 'src', 'edge_server.rs'),
    'utf8',
  );
  const gatewayMainSource = readFileSync(
    path.join(workspaceRoot, 'crates', 'sdkwork-clawrouter-standalone-gateway', 'src', 'main.rs'),
    'utf8',
  );
  const gatewayEdgeEnvSource = readFileSync(
    path.join(workspaceRoot, 'crates', 'sdkwork-clawrouter-standalone-gateway', 'src', 'edge_env.rs'),
    'utf8',
  );
  const readmeSource = readFileSync(path.join(workspaceRoot, 'README.md'), 'utf8');

  assert.ok(edgeServerSource.includes('with_portal_csp_connect_src'));
  assert.ok(edgeServerSource.includes('with_portal_csp_frame_src'));
  assert.ok(edgeServerSource.includes('with_portal_strict_transport_security'));
  assert.ok(edgeServerSource.includes('normalize_portal_csp_connect_src'));
  assert.ok(edgeServerSource.includes('normalize_portal_csp_frame_src_origin'));
  assert.ok(edgeServerSource.includes('build_portal_content_security_policy'));
  assert.ok(edgeServerSource.includes('portal_public_url_origin'));
  assert.ok(edgeServerSource.includes('"content-security-policy"'));
  assert.ok(edgeServerSource.includes('"strict-transport-security"'));
  assert.ok(gatewayMainSource.includes('SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC'));
  assert.ok(gatewayMainSource.includes('SDKWORK_CLAW_EDGE_HSTS_ENABLED'));
  assert.ok(gatewayMainSource.includes('SDKWORK_CLAW_EDGE_CSP_FRAME_SRC'));
  assert.ok(gatewayMainSource.includes('SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS'));
  assert.ok(gatewayMainSource.includes('SDKWORK_CLAW_TOOL_API_RATE_LIMIT_WINDOW_SECONDS'));
  assert.ok(gatewayMainSource.includes('SDKWORK_CLAW_TOOL_API_SDK_ARCHIVE_ROOT'));
  assert.ok(gatewayEdgeEnvSource.includes('LEGACY_PORTAL_CSP_CONNECT_SRC'));
  assert.ok(gatewayEdgeEnvSource.includes('LEGACY_PORTAL_TOOL_API_SDK_ARCHIVE_ROOT'));
  assert.ok(edgeServerSource.includes('with_portal_tool_api_rate_limit'));
  assert.ok(edgeServerSource.includes('with_portal_tool_api_sdk_archive_root'));
  assert.ok(edgeServerSource.includes('serve_prebuilt_sdk_archive'));
  assert.ok(edgeServerSource.includes('sdk_archive_not_found'));
  assert.ok(edgeServerSource.includes('application/zip'));
  assert.ok(edgeServerSource.includes('tool_api_rate_limited'));
  assert.ok(edgeServerSource.includes('header::RETRY_AFTER'));
  assert.ok(edgeServerSource.includes('ratelimit-limit'));
  assert.ok(readmeSource.includes('SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC'));
  assert.ok(readmeSource.includes('[portal.security]'));
  assert.ok(readmeSource.includes('SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS'));
  assert.ok(readmeSource.includes('SDKWORK_CLAW_TOOL_API_SDK_ARCHIVE_ROOT'));
  assert.ok(readmeSource.includes('prebuilt SDK ZIP archives'));
  assert.ok(readmeSource.includes('sdk_archive_not_found'));
  assert.ok(readmeSource.includes('RateLimit-Remaining'));
  assert.ok(readmeSource.includes('the limiter uses'));
  assert.ok(readmeSource.includes('x-forwarded-for'));
  assert.ok(readmeSource.includes('Absolute runtime API origins are added to'));
  assert.ok(!readmeSource.includes('TOOL_API_ENABLED` on the server'));
});

test('portal env example defaults to same-origin SDKWork API entrypoint paths', () => {
  const envExample = readFileSync(
    path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', '.env.example'),
    'utf8',
  );

  assert.ok(envExample.includes('PORTAL_PUBLIC_API_BASE_URL="/v1"'));
  assert.ok(envExample.includes('PORTAL_PUBLIC_OPEN_API_BASE_URL="/v1"'));
  assert.ok(envExample.includes('PORTAL_PUBLIC_APP_API_BASE_URL="/app/v3/api"'));
  assert.ok(envExample.includes('PORTAL_PUBLIC_BACKEND_API_BASE_URL="/backend/v3/api"'));
  assert.ok(!envExample.includes('https://api.sdkwork.com'));
});

test('claw router application launcher preserves forwarded mode arguments after --', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'run-claw-router-application.mjs')).href
  );

  const parsed = module.parseClawRouterProductArgs(['server', '--', '--help']);

  assert.equal(parsed.mode, 'server');
  assert.equal(parsed.help, false);
  assert.deepEqual(parsed.extraArgs, ['--help']);
});

test('claw router application launcher drops repeated pnpm separator inside forwarded arguments', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'run-claw-router-application.mjs')).href
  );

  const parsed = module.parseClawRouterProductArgs([
    'server',
    '--',
    '--database-url',
    'sqlite://target/dev/clawrouter.sqlite',
    '--',
    '--dry-run',
  ]);

  assert.equal(parsed.mode, 'server');
  assert.deepEqual(parsed.extraArgs, [
    '--database-url',
    'sqlite://target/dev/clawrouter.sqlite',
    '--dry-run',
  ]);
});

test('claw router application launcher help distinguishes workspace PostgreSQL from desktop SQLite runtime', async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    path.join(workspaceRoot, 'scripts', 'run-claw-router-application.mjs'),
    '--help',
  ], { cwd: workspaceRoot });

  assert.ok(stdout.includes('Database profiles:'));
  assert.ok(stdout.includes('pnpm dev:browser starts the topology-aware integrated product server workspace'));
  assert.ok(stdout.includes('pnpm dev:desktop starts the desktop dev workspace with PostgreSQL and standalone topology by default'));
  assert.ok(stdout.includes('Desktop packages and first-run local user data use SQLite under ~/.sdkwork/router/data.'));
  assert.ok(stdout.includes('Use pnpm dev:browser:sqlite or pnpm dev:desktop:sqlite to validate explicit SQLite behavior.'));
});

test('claw router application launcher parses dev env file before forwarded workspace arguments', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'run-claw-router-application.mjs')).href
  );

  const parsed = module.parseClawRouterProductArgs([
    'server',
    '--dev-env-file',
    '.env.postgres',
    '--',
    '--gateway-bind',
    '0.0.0.0:19080',
  ]);

  assert.equal(parsed.mode, 'server');
  assert.equal(parsed.devEnvFile, '.env.postgres');
  assert.deepEqual(parsed.extraArgs, ['--gateway-bind', '0.0.0.0:19080']);
});

test('claw router dev database env helper prefers split fields over stale process URL', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'claw-router-dev-database-env.mjs')).href
  );

  const merged = module.mergeDevEnvWithDatabasePrecedence(
    {
      SDKWORK_CLAW_DATABASE_URL:
        'postgresql://stale_user:wrong_pass@127.0.0.1:5432/stale_db?sslmode=disable',
    },
    {
      SDKWORK_CLAW_DATABASE_ENGINE: 'postgresql',
      SDKWORK_CLAW_DATABASE_HOST: '127.0.0.1',
      SDKWORK_CLAW_DATABASE_PORT: '5432',
      SDKWORK_CLAW_DATABASE_NAME: 'sdkwork_ai_dev',
      SDKWORK_CLAW_DATABASE_USERNAME: 'sdkwork_ai_dev',
      SDKWORK_CLAW_DATABASE_PASSWORD: 'sdkworkdev123',
      SDKWORK_CLAW_DATABASE_SSL_MODE: 'disable',
    },
  );

  const resolved = module.resolveClawRouterDevDatabaseEnv({ env: merged, defaultDatabase: 'none' });
  assert.equal(
    resolved.databaseUrl,
    'postgresql://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev?sslmode=disable',
  );
});

test('claw router dev database env helper resolves split PostgreSQL fields', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'claw-router-dev-database-env.mjs')).href
  );

  const splitConfig = module.resolveClawRouterDevDatabaseEnv({
    env: {
      SDKWORK_CLAW_DATABASE_ENGINE: 'postgresql',
      SDKWORK_CLAW_DATABASE_HOST: '127.0.0.1',
      SDKWORK_CLAW_DATABASE_PORT: '15432',
      SDKWORK_CLAW_DATABASE_NAME: 'sdkwork_claw_router',
      SDKWORK_CLAW_DATABASE_USERNAME: 'router_user',
      SDKWORK_CLAW_DATABASE_PASSWORD: 'router pass',
      SDKWORK_CLAW_DATABASE_SSL_MODE: 'disable',
      SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS: '12',
    },
  });

  assert.equal(splitConfig.kind, 'postgresql');
  assert.equal(
    splitConfig.databaseUrl,
    'postgresql://router_user:router%20pass@127.0.0.1:15432/sdkwork_claw_router?sslmode=disable',
  );
  assert.deepEqual(splitConfig.env, {
    SDKWORK_CLAW_DATABASE_URL:
      'postgresql://router_user:router%20pass@127.0.0.1:15432/sdkwork_claw_router?sslmode=disable',
    SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS: '12',
  });

  assert.throws(
    () => module.resolveClawRouterDevDatabaseEnv({
      env: {
        SDKWORK_CLAW_DATABASE_ENGINE: 'postgres',
        SDKWORK_CLAW_DATABASE_HOST: '127.0.0.1',
        SDKWORK_CLAW_DATABASE_NAME: 'sdkwork_claw_router',
        SDKWORK_CLAW_DATABASE_USERNAME: 'router_user',
      },
    }),
    /SDKWORK_CLAW_DATABASE_PASSWORD/u,
  );
  assert.throws(
    () => module.resolveClawRouterDevDatabaseEnv({
      env: {
        SDKWORK_CLAW_DATABASE_ENGINE: 'mysql',
        SDKWORK_CLAW_DATABASE_HOST: '127.0.0.1',
        SDKWORK_CLAW_DATABASE_NAME: 'sdkwork_claw_router',
        SDKWORK_CLAW_DATABASE_USERNAME: 'router_user',
        SDKWORK_CLAW_DATABASE_PASSWORD: 'router_pass',
      },
    }),
    /unsupported SDKWORK_CLAW_DATABASE_ENGINE/u,
  );

  const explicitConfig = module.resolveClawRouterDevDatabaseEnv({
    env: {
      SDKWORK_CLAW_DATABASE_URL:
        'postgresql://url_user:url_pass@127.0.0.1:25432/url_db?sslmode=require',
      SDKWORK_CLAW_DATABASE_ENGINE: 'postgresql',
      SDKWORK_CLAW_DATABASE_HOST: '127.0.0.1',
      SDKWORK_CLAW_DATABASE_PORT: '15432',
      SDKWORK_CLAW_DATABASE_NAME: 'split_db',
      SDKWORK_CLAW_DATABASE_USERNAME: 'split_user',
      SDKWORK_CLAW_DATABASE_PASSWORD: 'split_pass',
      SDKWORK_CLAW_DATABASE_SSL_MODE: 'disable',
    },
  });
  assert.equal(
    explicitConfig.databaseUrl,
    'postgresql://url_user:url_pass@127.0.0.1:25432/url_db?sslmode=require',
  );

  const defaultConfig = module.resolveClawRouterDevDatabaseEnv({ env: {} });
  assert.equal(defaultConfig.kind, 'postgresql');
  assert.equal(defaultConfig.databaseUrl, defaultDevPostgresDatabaseUrl);
  assert.deepEqual(defaultConfig.env, {
    SDKWORK_CLAW_DATABASE_URL: defaultDevPostgresDatabaseUrl,
    SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS: '10',
  });

  assert.throws(
    () => module.resolveClawRouterDevDatabaseEnv({
      env: {
        SDKWORK_CLAW_DATABASE_PROVIDER: 'postgresql',
        SDKWORK_CLAW_DATABASE_HOST: '127.0.0.1',
        SDKWORK_CLAW_DATABASE_NAME: 'legacy_dev_db',
        SDKWORK_CLAW_DATABASE_USERNAME: 'legacy_user',
        SDKWORK_CLAW_DATABASE_PASSWORD: 'legacy pass',
      },
    }),
    /SDKWORK_CLAW_DATABASE_PROVIDER is not supported/u,
  );
});

test('claw router dev postgres env example documents split database fields', () => {
  const envExamplePath = path.join(workspaceRoot, '.env.postgres.example');
  const ignored = readFileSync(path.join(workspaceRoot, '.gitignore'), 'utf8');
  const envExample = readFileSync(envExamplePath, 'utf8');

  assert.equal(existsSync(envExamplePath), true);
  assert.ok(ignored.includes('.env'));
  assert.ok(ignored.includes('.env.*'));
  assert.ok(ignored.includes('!.env.*.example'));
  assert.ok(!ignored.includes('!.env.postgres'));
  for (const requiredName of [
    'SDKWORK_CLAW_DATABASE_ENGINE=postgresql',
    'SDKWORK_CLAW_DATABASE_HOST=127.0.0.1',
    'SDKWORK_CLAW_DATABASE_PORT=5432',
    'SDKWORK_CLAW_DATABASE_NAME=sdkwork_ai_dev',
    'SDKWORK_CLAW_DATABASE_SCHEMA=sdkwork_ai_dev',
    'SDKWORK_CLAW_DATABASE_USERNAME=sdkwork_ai_dev',
    'SDKWORK_CLAW_DATABASE_PASSWORD=sdkworkdev123',
    'SDKWORK_CLAW_DATABASE_SSL_MODE=disable',
    'SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS=10',
    'SDKWORK_CLAW_DATABASE_ADMIN_HOST=127.0.0.1',
    'SDKWORK_CLAW_DATABASE_ADMIN_PORT=5432',
    'SDKWORK_CLAW_DATABASE_ADMIN_USERNAME=postgres',
    'SDKWORK_CLAW_DATABASE_ADMIN_PASSWORD=postgres_admin_pass',
    'SDKWORK_CLAW_DATABASE_ADMIN_DATABASE=postgres',
    'SDKWORK_CLAW_DATABASE_ADMIN_SSL_MODE=disable',
  ]) {
    assert.ok(
      envExample.includes(requiredName),
      `.env.postgres.example must document ${requiredName}`,
    );
  }
  assert.ok(envExample.includes('SDKWORK_CLAW_DATABASE_URL='));
  assert.ok(envExample.includes('SDKWORK_CLAW_DATABASE_ADMIN_URL='));
});

test('claw router application launcher loads dev env file into server workspace env', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'run-claw-router-application.mjs')).href
  );
  const fixtureRoot = createFixtureDir('claw-router-dev-postgres-env');
  const envFile = path.join(fixtureRoot, 'postgres.env');
  writeFixtureFile(
    fixtureRoot,
    'postgres.env',
    [
      'SDKWORK_CLAW_DATABASE_ENGINE=postgresql',
      'SDKWORK_CLAW_DATABASE_HOST=[::1]',
      'SDKWORK_CLAW_DATABASE_PORT=15433',
      'SDKWORK_CLAW_DATABASE_NAME=env_file_db',
      'SDKWORK_CLAW_DATABASE_USERNAME=env_file_user',
      'SDKWORK_CLAW_DATABASE_PASSWORD=env file pass',
      'SDKWORK_CLAW_DATABASE_SSL_MODE=disable',
      'SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS=15',
      '',
    ].join('\n'),
  );

  const plan = module.createClawRouterProductLaunchPlan({
    workspaceRoot,
    mode: 'server',
    install: false,
    platform: 'linux',
    env: {},
    devEnvFile: envFile,
    extraArgs: [],
  });

  const serverStep = findPlanStep(plan, 'server development workspace');
  assert.equal(
    serverStep.env.SDKWORK_CLAW_DATABASE_URL,
    'postgresql://env_file_user:env%20file%20pass@[::1]:15433/env_file_db?sslmode=disable',
  );
  assert.equal(serverStep.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS, '15');
});

test('claw router application launcher loads default PostgreSQL dev profile from workspace files', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'run-claw-router-application.mjs')).href
  );
  const fixtureRoot = createFixtureDir('claw-router-default-dev-postgres-env');
  seedMinimalClawRouterWorkspaceFixture(fixtureRoot);
  writeFixtureFile(
    fixtureRoot,
    '.env.postgres.example',
    [
      'SDKWORK_CLAW_DATABASE_ENGINE=postgresql',
      'SDKWORK_CLAW_DATABASE_HOST=[::1]',
      'SDKWORK_CLAW_DATABASE_PORT=15432',
      'SDKWORK_CLAW_DATABASE_NAME=example_dev_db',
      'SDKWORK_CLAW_DATABASE_SCHEMA=example_dev_schema',
      'SDKWORK_CLAW_DATABASE_USERNAME=example_dev_user',
      'SDKWORK_CLAW_DATABASE_PASSWORD=example_dev_pass',
      'SDKWORK_CLAW_DATABASE_SSL_MODE=disable',
      'SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS=9',
      'SDKWORK_CLAW_DATABASE_ADMIN_HOST=127.0.0.1',
      'SDKWORK_CLAW_DATABASE_ADMIN_PORT=5432',
      'SDKWORK_CLAW_DATABASE_ADMIN_USERNAME=postgres',
      'SDKWORK_CLAW_DATABASE_ADMIN_PASSWORD=postgres_admin_pass',
      'SDKWORK_CLAW_DATABASE_ADMIN_DATABASE=postgres',
      'SDKWORK_CLAW_DATABASE_ADMIN_SSL_MODE=disable',
      '',
    ].join('\n'),
  );
  writeFixtureFile(fixtureRoot, 'apps/sdkwork-clawrouter-pc/node_modules/.bin/vite', '');

  const examplePlan = module.createClawRouterProductLaunchPlan({
    workspaceRoot: fixtureRoot,
    mode: 'server',
    install: false,
    platform: 'linux',
    env: {},
    extraArgs: [],
  });

  assert.equal(examplePlan.length, 1);
  assert.equal(
    examplePlan[0].env.SDKWORK_CLAW_DATABASE_URL,
    'postgresql://example_dev_user:example_dev_pass@[::1]:15432/example_dev_db?sslmode=disable',
  );
  assert.equal(examplePlan[0].env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS, '9');
  assert.equal(examplePlan[0].env.SDKWORK_CLAW_DATABASE_SCHEMA, 'example_dev_schema');
  assert.equal(examplePlan[0].env.SDKWORK_CLAW_DATABASE_ADMIN_DATABASE, 'postgres');

  writeFixtureFile(
    fixtureRoot,
    '.env.postgres',
    [
      'SDKWORK_CLAW_DATABASE_ENGINE=postgresql',
      'SDKWORK_CLAW_DATABASE_HOST=[::1]',
      'SDKWORK_CLAW_DATABASE_PORT=25432',
      'SDKWORK_CLAW_DATABASE_NAME=local_override_db',
      'SDKWORK_CLAW_DATABASE_USERNAME=local_override_user',
      'SDKWORK_CLAW_DATABASE_PASSWORD=local_override_pass',
      'SDKWORK_CLAW_DATABASE_SSL_MODE=require',
      'SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS=11',
      '',
    ].join('\n'),
  );

  const overridePlan = module.createClawRouterProductLaunchPlan({
    workspaceRoot: fixtureRoot,
    mode: 'server',
    install: false,
    platform: 'linux',
    env: {},
    extraArgs: [],
  });

  assert.equal(
    overridePlan[0].env.SDKWORK_CLAW_DATABASE_URL,
    'postgresql://local_override_user:local_override_pass@[::1]:25432/local_override_db?sslmode=require',
  );
  assert.equal(overridePlan[0].env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS, '11');
  rmSync(fixtureRoot, { recursive: true, force: true });
});

test('claw router application launcher reinstalls portal dependencies when command shims are missing', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'run-claw-router-application.mjs')).href
  );
  const fixtureRoot = createFixtureDir('claw-router-stale-portal-install');
  seedMinimalClawRouterWorkspaceFixture(fixtureRoot);
  writeFixtureFile(
    fixtureRoot,
    '.env.postgres.example',
    [
      'SDKWORK_CLAW_DATABASE_ENGINE=postgresql',
      'SDKWORK_CLAW_DATABASE_HOST=[::1]',
      'SDKWORK_CLAW_DATABASE_PORT=15432',
      'SDKWORK_CLAW_DATABASE_NAME=example_dev_db',
      'SDKWORK_CLAW_DATABASE_USERNAME=example_dev_user',
      'SDKWORK_CLAW_DATABASE_PASSWORD=example_dev_pass',
      'SDKWORK_CLAW_DATABASE_SSL_MODE=disable',
      '',
    ].join('\n'),
  );
  writeFixtureFile(fixtureRoot, 'apps/sdkwork-clawrouter-pc/node_modules/vite/package.json', '{}');

  const plan = module.createClawRouterProductLaunchPlan({
    workspaceRoot: fixtureRoot,
    mode: 'server',
    install: false,
    platform: 'linux',
    env: {},
    extraArgs: [],
  });

  assert.equal(plan.length, 2);
  assert.equal(plan[0].label, 'portal install');
  assert.deepEqual(plan[0].args, ['--dir', 'apps/sdkwork-clawrouter-pc', 'install']);
  assert.equal(plan[1].label, 'server development workspace');
  rmSync(fixtureRoot, { recursive: true, force: true });
});

test('claw router application launcher defaults explicit server dev to PostgreSQL only', async () => {
  await withIsolatedDevDatabaseEnv(async () => {
    const module = await import(
      pathToFileURL(path.join(workspaceRoot, 'scripts', 'run-claw-router-application.mjs')).href
    );
    const fixtureRoot = createFixtureDir('claw-router-default-server-dev');
    seedMinimalClawRouterWorkspaceFixture(fixtureRoot);
    writeFixtureFile(fixtureRoot, 'apps/sdkwork-clawrouter-pc/node_modules/.bin/vite', '');

    try {
      const serverPlan = module.createClawRouterProductLaunchPlan({
        workspaceRoot: fixtureRoot,
        mode: 'server',
        install: false,
        platform: 'linux',
        env: {},
        extraArgs: [],
      });
      const desktopPlan = module.createClawRouterProductLaunchPlan({
        workspaceRoot: fixtureRoot,
        mode: 'desktop',
        install: false,
        platform: 'linux',
        env: {},
        extraArgs: [],
      });

      const serverStep = findPlanStep(serverPlan, 'server development workspace');
      const desktopStep = findPlanStep(desktopPlan, 'desktop development workspace');
      assert.equal(serverStep.env.SDKWORK_CLAW_DATABASE_URL, defaultDevPostgresDatabaseUrl);
      assert.equal(serverStep.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS, '10');
      assert.equal(desktopStep.env.SDKWORK_CLAW_DATABASE_URL, undefined);
      assert.equal(desktopStep.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS, undefined);
      assert.equal(desktopStep.env.SDKWORK_CLAW_DEPLOYMENT_MODE, 'desktop');
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});

test('claw router application launcher keeps explicit client and desktop modes gateway-backed', async () => {
  await withIsolatedDevDatabaseEnv(async () => {
    const module = await import(
      pathToFileURL(path.join(workspaceRoot, 'scripts', 'run-claw-router-application.mjs')).href
    );

    const clientPlan = module.createClawRouterProductLaunchPlan({
      workspaceRoot,
      mode: 'client',
      install: false,
      platform: 'linux',
      env: {},
      extraArgs: [],
    });
    const desktopPlan = module.createClawRouterProductLaunchPlan({
      workspaceRoot,
      mode: 'desktop',
      install: false,
      platform: 'linux',
      env: {},
      extraArgs: [],
    });

    for (const [expectedLabel, plan] of [
      ['client development workspace', clientPlan],
      ['desktop development workspace', desktopPlan],
    ]) {
      const step = findPlanStep(plan, expectedLabel);
      assert.deepEqual(step.args.slice(1), ['--client-only']);
      assert.equal(step.env.SDKWORK_CLAW_DATABASE_URL, undefined);
      assert.equal(step.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS, undefined);
    }
    assert.equal(findPlanStep(desktopPlan, 'desktop development workspace').env.SDKWORK_CLAW_DEPLOYMENT_MODE, 'desktop');
  });
});

test('claw router workspace client-only launch plan starts sdkwork-api-cloud-gateway and portal only', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
  );

  const settings = module.parseWorkspaceArgs(['--client-only']);
  const plan = module.buildWorkspaceCommandPlan(settings, { workspaceRoot, platform: 'linux' });
  const managedGatewayStep = plan.steps.find((step) => step.name === 'sdkwork-api-cloud-gateway');
  const portalStep = plan.steps.find((step) => step.name === 'portal');

  assert.equal(settings.runtimeMode, 'client');
  assert.deepEqual(plan.steps.map((step) => step.name), [
    'sdkwork-api-cloud-gateway-prebuild',
    'sdkwork-api-cloud-gateway',
    'portal',
  ]);
  assert.deepEqual(managedGatewayStep.args, [
    'run',
    '-p',
    'sdkwork-api-cloud-gateway',
    '--bin',
    'sdkwork-api-cloud-gateway',
    '--',
    '--config',
    'configs/sdkwork-api-cloud-gateway.development.toml.example',
  ]);
  assert.equal(
    managedGatewayStep.cwd,
    path.resolve(workspaceRoot, '..', 'sdkwork-api-cloud-gateway'),
  );
  assert.equal(portalStep.env.PORTAL_PUBLIC_SDK_BASE_URL, undefined);
  assert.equal(portalStep.env.PORTAL_PUBLIC_API_BASE_URL, undefined);
  assert.equal(portalStep.env.PORTAL_PUBLIC_OPEN_API_BASE_URL, undefined);
  assert.equal(portalStep.env.PORTAL_PUBLIC_APP_API_BASE_URL, undefined);
  assert.equal(portalStep.env.PORTAL_PUBLIC_BACKEND_API_BASE_URL, undefined);
  assert.equal(portalStep.env.SDKWORK_CLAW_BROWSER_DEV_PROXY_OPEN_API_ORIGIN, 'http://127.0.0.1:3902');
  assert.equal(portalStep.env.SDKWORK_CLAW_BROWSER_DEV_PROXY_BACKEND_API_ORIGIN, 'http://127.0.0.1:3902');
  assert.equal(portalStep.env.SDKWORK_CLAW_BROWSER_DEV_PROXY_APP_API_ORIGIN, 'http://127.0.0.1:3902');
  assert.equal(portalStep.env.VITE_CLAWROUTER_OPEN_API_BASE_URL, 'http://127.0.0.1:3902/v1');
  assert.equal(portalStep.env.VITE_CLAWROUTER_APP_API_BASE_URL, 'http://127.0.0.1:3902/app/v3/api');
  assert.equal(portalStep.env.VITE_CLAWROUTER_BACKEND_API_BASE_URL, 'http://127.0.0.1:3902/backend/v3/api');
  assert.equal(portalStep.env.VITE_SDKWORK_APPBASE_APP_API_BASE_URL, 'http://127.0.0.1:3902/app/v3/api');
  assert.equal(portalStep.env.VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL, 'http://127.0.0.1:3902/backend/v3/api');
  assert.equal(portalStep.env.VITE_SDKWORK_DRIVE_APP_API_BASE_URL, 'http://127.0.0.1:3902/app/v3/api');
  assert.equal(plan.steps.some((step) => step.name === 'server'), false);
  assert.equal(plan.steps.some((step) => step.name === 'gateway'), false);
  assert.equal(plan.steps.some((step) => step.name === 'admin-api'), false);
  assert.equal(plan.steps.some((step) => step.name === 'app-api'), false);
  assert.deepEqual(
    module.workspaceBindTargets(settings).map((target) => `${target.name} ${target.bind}`),
    [
      'sdkwork-api-cloud-gateway 127.0.0.1:3902',
      'portal 127.0.0.1:3901',
    ],
  );
});

test('claw router workspace launch plan defaults to all-in-one Rust edge runtime', async () => {
  await withIsolatedDevDatabaseEnv(async () => {
    const module = await import(
      pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
    );

    const settings = parseWorkspaceArgsIsolated(module, ['--gateway-bind', '0.0.0.0:19080']);
    const plan = module.buildWorkspaceCommandPlan(settings, { workspaceRoot });
    const portalStep = plan.steps.find((step) => step.name === 'portal');
    const serverStep = plan.steps.find((step) => step.name === 'server');

    assert.equal(settings.serverBind, '0.0.0.0:3900');
    assert.equal(settings.portalBind, '127.0.0.1:3901');
    assert.equal(settings.sdkworkApiGatewayBind, '127.0.0.1:3902');
    assert.equal(settings.portalDevBind, undefined);
    assert.equal(settings.databaseUrl, defaultDevPostgresDatabaseUrl);
    assert.equal(settings.runtimeMode, 'all-in-one');
    assert.deepEqual(plan.steps.map((step) => step.name), [
      'rust-prebuild',
      'installer',
      'model-catalog-refresh',
      'portal',
      'server',
    ]);
    const prebuildStep = plan.steps.find((step) => step.name === 'rust-prebuild');
    const installerStep = plan.steps.find((step) => step.name === 'installer');
    const refreshStep = plan.steps.find((step) => step.name === 'model-catalog-refresh');
    assert.deepEqual(prebuildStep.args, [
      'build',
      '-p',
      'sdkwork-claw-installer',
      '-p',
      'sdkwork-clawrouter-standalone-gateway-lib',
    ]);
    assert.equal(prebuildStep.blocking, true);
    assert.equal(
      prebuildStep.env.CARGO_TARGET_DIR,
      path.join(workspaceRoot, 'target', 'dev-workspace'),
    );
    assert.deepEqual(installerStep.args, [
      'run',
      '-p',
      'sdkwork-claw-installer',
      '--',
      'ensure',
    ]);
    assert.equal(installerStep.blocking, true);
    assert.equal(installerStep.env.SDKWORK_CLAW_DATABASE_URL, settings.databaseUrl);
    assert.equal(installerStep.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS, '10');
    assert.equal(installerStep.env.SDKWORK_CLAW_STARTUP_INSTALL_MODE, 'ensure');
    assert.equal(installerStep.env.SDKWORK_CLAW_SNOWFLAKE_NODE_ID, '1000');
    assert.equal(installerStep.env.SDKWORK_CLAW_INSTALL_ENVIRONMENT, 'development');
    assert.equal(installerStep.env.SDKWORK_CLAW_INSTALL_SEED_PROFILE, 'commercial');
    assert.equal(
      installerStep.env.SDKWORK_MODELS_CATALOG_ROOT,
      path.join(workspaceRoot, '..', 'sdkwork-models'),
    );
    assert.deepEqual(refreshStep.args, [
      'run',
      '-p',
      'sdkwork-claw-installer',
      '--',
      'refresh-catalog',
      '--catalog-root',
      path.join(workspaceRoot, '..', 'sdkwork-models'),
      '--force',
    ]);
    assert.equal(refreshStep.blocking, true);
    assert.match(refreshStep.failureHint, /model catalog refresh failed/u);
    assert.match(refreshStep.failureHint, /pnpm models:check/u);
    assert.equal(refreshStep.env.SDKWORK_CLAW_DATABASE_URL, settings.databaseUrl);
    assert.equal(refreshStep.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS, '10');
    assert.equal(refreshStep.env.SDKWORK_CLAW_STARTUP_INSTALL_MODE, 'ensure');
    assert.equal(refreshStep.env.SDKWORK_CLAW_SNOWFLAKE_NODE_ID, '1001');
    assert.equal(
      refreshStep.env.SDKWORK_MODELS_CATALOG_ROOT,
      path.join(workspaceRoot, '..', 'sdkwork-models'),
    );
    assert.equal(plan.steps.some((step) => step.name === 'sdkwork-api-cloud-gateway'), true);
    assert.deepEqual(portalStep.args, [
      '--dir',
      'apps/sdkwork-clawrouter-pc',
      'dev:browser',
    ]);
    assert.equal(portalStep.env.PORT, '3901');
    assert.equal(portalStep.env.SDKWORK_CLAW_PORTAL_BIND, '127.0.0.1:3901');
    assert.equal(portalStep.env.OPENAPI_DEV_URL, 'http://127.0.0.1:3900/openapi.json');
    assert.equal(portalStep.env.PORTAL_FORWARDING_ENABLED, undefined);
    assert.equal(portalStep.env.PORTAL_FORWARD_GATEWAY_BASE_URL, undefined);
    assert.equal(portalStep.env.PORTAL_FORWARD_BACKEND_API_BASE_URL, undefined);
    assert.equal(portalStep.env.PORTAL_FORWARD_APP_API_BASE_URL, undefined);
    assert.equal(portalStep.env.PORTAL_PUBLIC_SDK_BASE_URL, undefined);
    assert.equal(portalStep.env.PORTAL_PUBLIC_API_BASE_URL, undefined);
    assert.equal(portalStep.env.PORTAL_PUBLIC_OPEN_API_BASE_URL, undefined);
    assert.equal(portalStep.env.PORTAL_PUBLIC_BACKEND_API_BASE_URL, undefined);
    assert.equal(portalStep.env.PORTAL_PUBLIC_APP_API_BASE_URL, undefined);
    assert.equal(portalStep.env.SDKWORK_CLAW_BROWSER_DEV_PROXY_OPEN_API_ORIGIN, 'http://127.0.0.1:3900');
    assert.equal(portalStep.env.SDKWORK_CLAW_BROWSER_DEV_PROXY_BACKEND_API_ORIGIN, 'http://127.0.0.1:3900');
    assert.equal(portalStep.env.SDKWORK_CLAW_BROWSER_DEV_PROXY_APP_API_ORIGIN, 'http://127.0.0.1:3900');
    assert.equal(portalStep.env.VITE_CLAWROUTER_APP_API_BASE_URL, '/app/v3/api');
    assert.equal(portalStep.env.VITE_SDKWORK_APPBASE_APP_API_BASE_URL, 'http://127.0.0.1:3902/app/v3/api');
    assert.notEqual(portalStep.env.VITE_SDKWORK_APPBASE_APP_API_BASE_URL, portalStep.env.VITE_CLAWROUTER_APP_API_BASE_URL);
    assert.equal(portalStep.env.VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL, 'http://127.0.0.1:3902/backend/v3/api');
    assert.equal(portalStep.env.VITE_SDKWORK_DRIVE_APP_API_BASE_URL, 'http://127.0.0.1:3902/app/v3/api');
    assert.deepEqual(serverStep.args, [
      'run',
      '-p',
      'sdkwork-clawrouter-standalone-gateway-lib',
    ]);
    assert.equal(
      serverStep.env.CARGO_TARGET_DIR,
      path.join(workspaceRoot, 'target', 'dev-workspace'),
    );
    assert.equal(serverStep.env.SDKWORK_CLAW_EDGE_SERVER, '1');
    assert.equal(serverStep.env.SDKWORK_CLAW_ALL_IN_ONE_RUNTIME, '1');
    assert.equal(serverStep.env.SDKWORK_API_CLOUD_GATEWAY_MODE, 'embedded');
    assert.equal(serverStep.env.SDKWORK_CLAW_SERVER_BIND, '0.0.0.0:3900');
    assert.equal(serverStep.env.SDKWORK_CLAW_STARTUP_INSTALL_MODE, 'skip');
    assert.equal(serverStep.env.SDKWORK_CLAW_SNOWFLAKE_NODE_ID, '1005');
    assert.equal(serverStep.env.PORTAL_PUBLIC_SDK_BASE_URL, 'http://127.0.0.1:3900');
    assert.equal(serverStep.env.SDKWORK_CLAW_EDGE_GATEWAY_BASE_URL, 'http://127.0.0.1:3900');
    assert.equal(serverStep.env.SDKWORK_CLAW_EDGE_BACKEND_API_BASE_URL, 'http://127.0.0.1:3900');
    assert.equal(serverStep.env.SDKWORK_CLAW_EDGE_APP_API_BASE_URL, 'http://127.0.0.1:3900');
    assert.equal(serverStep.env.SDKWORK_CLAW_EDGE_PORTAL_BASE_URL, 'http://127.0.0.1:3901');
    assert.equal(serverStep.env.SDKWORK_CLAW_APP_RUNTIME_GATEWAY_BASE_URL, 'http://127.0.0.1:3900');
    assert.equal(serverStep.env.SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS, '120');
    assert.equal(serverStep.env.SDKWORK_CLAW_TOOL_API_RATE_LIMIT_WINDOW_SECONDS, '60');
    assert.equal(serverStep.env.SDKWORK_CLAW_TOOL_API_SDK_ARCHIVE_ROOT, '');
    assert.equal(serverStep.env.SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC, '');
    assert.equal(serverStep.env.SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_BASE_URL, '');
    assert.equal(serverStep.env.SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_API_KEY, '');
    assert.equal(
      serverStep.env.SDKWORK_MODELS_CATALOG_ROOT,
      path.join(workspaceRoot, '..', 'sdkwork-models'),
    );
    assert.deepEqual(
      module.workspaceBindTargets(settings).map((target) => `${target.name} ${target.bind}`),
      [
        'server 0.0.0.0:3900',
        'sdkwork-api-cloud-gateway 127.0.0.1:3902',
        'portal 127.0.0.1:3901',
      ],
    );
  });
});

test('claw router development services receive explicit Snowflake node ids', async () => {
  const previousNodeId = process.env.SDKWORK_CLAW_SNOWFLAKE_NODE_ID;
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
  );

  try {
    delete process.env.SDKWORK_CLAW_SNOWFLAKE_NODE_ID;
    const settings = module.parseWorkspaceArgs([
      '--database-url',
      'sqlite:target/test-snowflake-node-id.sqlite',
    ], { skipDevEnvFile: true });
    const plan = module.buildWorkspaceCommandPlan(settings, { workspaceRoot, platform: 'linux' });

    assert.equal(plan.steps.find((step) => step.name === 'installer').env.SDKWORK_CLAW_SNOWFLAKE_NODE_ID, '1000');
    assert.equal(plan.steps.find((step) => step.name === 'model-catalog-refresh').env.SDKWORK_CLAW_SNOWFLAKE_NODE_ID, '1001');
    assert.equal(plan.steps.find((step) => step.name === 'server').env.SDKWORK_CLAW_SNOWFLAKE_NODE_ID, '1005');

    process.env.SDKWORK_CLAW_SNOWFLAKE_NODE_ID = '17';
    const overriddenPlan = module.buildWorkspaceCommandPlan(settings, { workspaceRoot, platform: 'linux' });
    for (const stepName of ['installer', 'model-catalog-refresh', 'server']) {
      assert.equal(
        overriddenPlan.steps.find((step) => step.name === stepName).env.SDKWORK_CLAW_SNOWFLAKE_NODE_ID,
        '17',
      );
    }
  } finally {
    if (previousNodeId === undefined) {
      delete process.env.SDKWORK_CLAW_SNOWFLAKE_NODE_ID;
    } else {
      process.env.SDKWORK_CLAW_SNOWFLAKE_NODE_ID = previousNodeId;
    }
  }
});

test('claw router workspace launch plan honors SDKWORK_CLAW_DATABASE_URL from dev env', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
  );
  const previousDatabaseUrl = process.env.SDKWORK_CLAW_DATABASE_URL;
  const previousMaxConnections = process.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS;
  try {
    process.env.SDKWORK_CLAW_DATABASE_URL =
      'postgresql://env_user:env_pass@127.0.0.1:15434/env_db?sslmode=disable';
    process.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS = '18';

    const settings = parseWorkspaceArgsIsolated(module, []);
    const plan = module.buildWorkspaceCommandPlan(settings, { workspaceRoot });
    const serviceSteps = plan.steps.filter((step) =>
      ['installer', 'model-catalog-refresh', 'server'].includes(step.name),
    );

    assert.equal(
      settings.databaseUrl,
      'postgresql://env_user:env_pass@127.0.0.1:15434/env_db?sslmode=disable',
    );
    for (const step of serviceSteps) {
      assert.equal(
        step.env.SDKWORK_CLAW_DATABASE_URL,
        'postgresql://env_user:env_pass@127.0.0.1:15434/env_db?sslmode=disable',
      );
      assert.equal(step.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS, '18');
    }
  } finally {
    if (previousDatabaseUrl === undefined) {
      delete process.env.SDKWORK_CLAW_DATABASE_URL;
    } else {
      process.env.SDKWORK_CLAW_DATABASE_URL = previousDatabaseUrl;
    }
    if (previousMaxConnections === undefined) {
      delete process.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS;
    } else {
      process.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS = previousMaxConnections;
    }
  }
});

test('claw router workspace launch plan resolves split PostgreSQL env fields directly', async () => {
  await withIsolatedDevDatabaseEnv(async () => {
    const module = await import(
      pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
    );
    process.env.SDKWORK_CLAW_DATABASE_ENGINE = 'postgresql';
    process.env.SDKWORK_CLAW_DATABASE_HOST = '127.0.0.1';
    process.env.SDKWORK_CLAW_DATABASE_PORT = '15435';
    process.env.SDKWORK_CLAW_DATABASE_NAME = 'direct_split_db';
    process.env.SDKWORK_CLAW_DATABASE_USERNAME = 'direct_user';
    process.env.SDKWORK_CLAW_DATABASE_PASSWORD = 'direct pass';
    process.env.SDKWORK_CLAW_DATABASE_SSL_MODE = 'disable';
    process.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS = '11';

    const settings = parseWorkspaceArgsIsolated(module, []);
    const plan = module.buildWorkspaceCommandPlan(settings, { workspaceRoot });
    const serviceSteps = plan.steps.filter((step) =>
      ['installer', 'model-catalog-refresh', 'server'].includes(step.name),
    );

    assert.equal(
      settings.databaseUrl,
      'postgresql://direct_user:direct%20pass@127.0.0.1:15435/direct_split_db?sslmode=disable',
    );
    for (const step of serviceSteps) {
      assert.equal(step.env.SDKWORK_CLAW_DATABASE_URL, settings.databaseUrl);
      assert.equal(step.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS, '11');
    }
  });
});

test('claw router workspace launch plan preserves split-services topology from profile env', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
  );

  const settings = module.parseWorkspaceArgs([
    '--service-layout',
    'split-services',
    '--gateway-bind',
    '0.0.0.0:19080',
  ]);
  const plan = module.buildWorkspaceCommandPlan(settings, { workspaceRoot });

  assert.equal(settings.runtimeMode, 'distributed');
  assert.deepEqual(plan.steps.map((step) => step.name), [
    'rust-prebuild',
    'sdkwork-api-cloud-gateway-prebuild',
    'installer',
    'model-catalog-refresh',
    'gateway',
    'admin-api',
    'app-api',
    'sdkwork-api-cloud-gateway',
    'portal',
    'server',
  ]);
  const gatewayStep = plan.steps.find((step) => step.name === 'gateway');
  const appApiStep = plan.steps.find((step) => step.name === 'app-api');
  const managedGatewayStep = plan.steps.find((step) => step.name === 'sdkwork-api-cloud-gateway');
  const portalStep = plan.steps.find((step) => step.name === 'portal');
  const serverStep = plan.steps.find((step) => step.name === 'server');
  assert.equal(gatewayStep.env.SDKWORK_CLAW_GATEWAY_BIND, '0.0.0.0:19080');
  assert.equal(appApiStep.env.SDKWORK_CLAW_APP_RUNTIME_GATEWAY_BASE_URL, 'http://127.0.0.1:19080');
  assert.equal(managedGatewayStep.env.SDKWORK_API_CLOUD_GATEWAY_BIND, '127.0.0.1:3902');
  assert.equal(portalStep.env.PORTAL_PUBLIC_SDK_BASE_URL, undefined);
  assert.equal(portalStep.env.SDKWORK_CLAW_BROWSER_DEV_PROXY_OPEN_API_ORIGIN, 'http://127.0.0.1:19080');
  assert.equal(portalStep.env.SDKWORK_CLAW_BROWSER_DEV_PROXY_BACKEND_API_ORIGIN, 'http://127.0.0.1:18081');
  assert.equal(portalStep.env.SDKWORK_CLAW_BROWSER_DEV_PROXY_APP_API_ORIGIN, 'http://127.0.0.1:18082');
  assert.equal(serverStep.env.PORTAL_PUBLIC_SDK_BASE_URL, 'http://127.0.0.1:3902');
  assert.equal(serverStep.env.SDKWORK_CLAW_ALL_IN_ONE_RUNTIME, '0');
  assert.equal(serverStep.env.SDKWORK_CLAW_EDGE_GATEWAY_BASE_URL, 'http://127.0.0.1:19080');
});

test('claw router workspace reports occupied service ports before startup', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
  );

  const settings = module.parseWorkspaceArgs([]);
  const unavailable = await module.findUnavailableWorkspaceBinds(settings, async (target) =>
    !['18082', '3900', '3902'].includes(target.port),
  );

  assert.deepEqual(
    unavailable.map((target) => `${target.name} ${target.bind}`),
    [
      'server 0.0.0.0:3900',
      'sdkwork-api-cloud-gateway 127.0.0.1:3902',
    ],
  );
  await assert.rejects(
    () => module.assertWorkspaceBindsAvailable(settings, async (target) =>
      !['18082', '3900', '3902'].includes(target.port),
    ),
    /workspace ports are already in use: server 0\.0\.0\.0:3900, sdkwork-api-cloud-gateway 127\.0\.0\.1:3902/u,
  );
});

test('claw router workspace can recheck the portal bind after backend startup', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
  );

  const settings = module.parseWorkspaceArgs([]);
  const portalTargets = module.workspaceBindTargets(settings)
    .filter((target) => target.name === 'portal');

  await assert.rejects(
    () => module.assertWorkspaceBindTargetsAvailable(portalTargets, async () => false),
    /workspace ports are already in use: portal 127\.0\.0\.1:3901/u,
  );
});

test('claw router workspace terminates Windows child process trees', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
  );
  const spawned = [];
  const child = {
    pid: 4321,
    exitCode: null,
    signalCode: null,
    killed: false,
    kill() {
      child.killed = true;
      return true;
    },
  };

  await module.terminateChildProcess(child, {
    platform: 'win32',
    spawnProcess(command, args, options) {
      spawned.push({ command, args, options });
      return {
        once(event, listener) {
          if (event === 'exit') {
            listener(0);
          }
        },
      };
    },
  });

  assert.deepEqual(spawned, [
    {
      command: 'taskkill',
      args: ['/PID', '4321', '/T', '/F'],
      options: { stdio: 'ignore', windowsHide: true },
    },
  ]);
  assert.equal(child.killed, false);
});

test('claw router workspace checks service ports before running installer steps', () => {
  const workspaceStarter = readFileSync(
    path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs'),
    'utf8',
  );

  const preflightIndex = workspaceStarter.indexOf('await assertWorkspaceBindsAvailable(settings);');
  const blockingStepsIndex = workspaceStarter.indexOf('for (const step of blockingSteps)');

  assert.ok(preflightIndex >= 0, 'workspace starter must check service ports before startup');
  assert.ok(blockingStepsIndex >= 0, 'workspace starter must run blocking installer steps');
  assert.ok(
    preflightIndex < blockingStepsIndex,
    'workspace service port preflight must run before installer/model refresh steps',
  );
});

test('claw router workspace rechecks backend ports after installer steps', () => {
  const workspaceStarter = readFileSync(
    path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs'),
    'utf8',
  );

  const blockingStepsIndex = workspaceStarter.indexOf('for (const step of blockingSteps)');
  const backendPreflightIndex = workspaceStarter.indexOf(
    'const backendStepNames = new Set(backendServiceSteps.map((step) => step.name));',
  );
  const backendLaunchIndex = workspaceStarter.indexOf('for (const step of backendServiceSteps)');

  assert.ok(blockingStepsIndex >= 0, 'workspace starter must run blocking installer steps');
  assert.ok(backendPreflightIndex >= 0, 'workspace starter must recheck backend binds');
  assert.ok(backendLaunchIndex >= 0, 'workspace starter must launch backend services');
  assert.ok(
    blockingStepsIndex < backendPreflightIndex && backendPreflightIndex < backendLaunchIndex,
    'backend bind recheck must run after installer steps and before backend launch',
  );
});

test('claw router workspace rechecks the portal port immediately before launching it', () => {
  const workspaceStarter = readFileSync(
    path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs'),
    'utf8',
  );

  const healthCheckIndex = workspaceStarter.indexOf(
    'await waitForWorkspaceHealthSurfaces(settings);',
  );
  const portalPreflightIndex = workspaceStarter.indexOf(
    "workspaceBindTargets(settings).filter((target) => target.name === 'portal')",
  );
  const portalLaunchIndex = workspaceStarter.indexOf('for (const step of portalSteps)');

  assert.ok(healthCheckIndex >= 0, 'workspace starter must wait for backend health');
  assert.ok(portalPreflightIndex >= 0, 'workspace starter must recheck the portal bind');
  assert.ok(portalLaunchIndex >= 0, 'workspace starter must launch the portal');
  assert.ok(
    healthCheckIndex < portalPreflightIndex && portalPreflightIndex < portalLaunchIndex,
    'portal bind recheck must run after backend health and before portal launch',
  );
});

test('claw router workspace supports custom edge server and direct portal binds', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
  );

  const settings = module.parseWorkspaceArgs([
    '--server-bind',
    '0.0.0.0:12900',
    '--portal-bind',
    '0.0.0.0:13900',
  ]);
  const plan = module.buildWorkspaceCommandPlan(settings, { workspaceRoot });
  const portalStep = plan.steps.find((step) => step.name === 'portal');
  const serverStep = plan.steps.find((step) => step.name === 'server');

  assert.deepEqual(portalStep.args, [
    '--dir',
    'apps/sdkwork-clawrouter-pc',
    'dev:browser',
  ]);
  assert.equal(portalStep.env.HOST, '0.0.0.0');
  assert.equal(portalStep.env.PORT, '13900');
  assert.equal(portalStep.env.SDKWORK_CLAW_PORTAL_BIND, '0.0.0.0:13900');
  assert.equal(serverStep.env.SDKWORK_CLAW_SERVER_BIND, '0.0.0.0:12900');
  assert.equal(serverStep.env.SDKWORK_CLAW_EDGE_PORTAL_BASE_URL, 'http://127.0.0.1:13900');
});

test('claw router workspace uses one resolved model catalog root for refresh and services', async () => {
  const previousCatalogRoot = process.env.SDKWORK_MODELS_CATALOG_ROOT;
  const externalCatalogRoot = path.join(workspaceRoot, 'tmp', 'external-sdkwork-models');
  process.env.SDKWORK_MODELS_CATALOG_ROOT = externalCatalogRoot;
  try {
    const module = await import(
      pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
    );

    const settings = parseWorkspaceArgsIsolated(module, []);
    const plan = module.buildWorkspaceCommandPlan(settings, { workspaceRoot });
    const refreshStep = plan.steps.find((step) => step.name === 'model-catalog-refresh');
    const serviceSteps = plan.steps.filter((step) =>
      ['installer', 'gateway', 'admin-api', 'app-api', 'server'].includes(step.name),
    );

    assert.equal(settings.modelsCatalogRoot, externalCatalogRoot);
    assert.deepEqual(refreshStep.args.slice(-3), [
      '--catalog-root',
      externalCatalogRoot,
      '--force',
    ]);
    for (const step of serviceSteps) {
      assert.equal(step.env.SDKWORK_MODELS_CATALOG_ROOT, externalCatalogRoot);
    }
  } finally {
    if (previousCatalogRoot === undefined) {
      delete process.env.SDKWORK_MODELS_CATALOG_ROOT;
    } else {
      process.env.SDKWORK_MODELS_CATALOG_ROOT = previousCatalogRoot;
    }
  }
});

test('claw router workspace pins startup install ownership to installer steps', async () => {
  const previousStartupInstallMode = process.env.SDKWORK_CLAW_STARTUP_INSTALL_MODE;
  process.env.SDKWORK_CLAW_STARTUP_INSTALL_MODE = 'ensure';
  try {
    const module = await import(
      pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
    );

    const settings = parseWorkspaceArgsIsolated(module, []);
    const plan = module.buildWorkspaceCommandPlan(settings, { workspaceRoot });
    const modesByStep = new Map(
      plan.steps
        .filter((step) => ['installer', 'model-catalog-refresh', 'gateway', 'admin-api', 'app-api', 'server'].includes(step.name))
        .map((step) => [step.name, step.env.SDKWORK_CLAW_STARTUP_INSTALL_MODE]),
    );

    assert.deepEqual(Object.fromEntries(modesByStep), {
      installer: 'ensure',
      'model-catalog-refresh': 'ensure',
      server: 'skip',
    });
  } finally {
    if (previousStartupInstallMode === undefined) {
      delete process.env.SDKWORK_CLAW_STARTUP_INSTALL_MODE;
    } else {
      process.env.SDKWORK_CLAW_STARTUP_INSTALL_MODE = previousStartupInstallMode;
    }
  }
});

test('claw router workspace constrains explicit SQLite dev database without overriding explicit database tuning', async () => {
  const previousMaxConnections = process.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS;
  const previousSettlementWorker = process.env.SDKWORK_CLAW_USAGE_SETTLEMENT_WORKER_ENABLED;
  const previousRankingStartup = process.env.SDKWORK_CLAW_MODEL_RANKING_RUN_ON_STARTUP;
  try {
    delete process.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS;
    delete process.env.SDKWORK_CLAW_USAGE_SETTLEMENT_WORKER_ENABLED;
    delete process.env.SDKWORK_CLAW_MODEL_RANKING_RUN_ON_STARTUP;
    const module = await import(
      pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
    );

    const sqliteSettings = module.parseWorkspaceArgs([
      '--database-url',
      defaultDevSqliteDatabaseUrl,
    ]);
    const sqlitePlan = module.buildWorkspaceCommandPlan(sqliteSettings, { workspaceRoot });
    assert.equal(sqliteSettings.databaseUrl, defaultDevSqliteDatabaseUrl);
    for (const step of sqlitePlan.steps.filter((step) =>
      ['installer', 'model-catalog-refresh', 'gateway', 'admin-api', 'app-api', 'server'].includes(step.name),
    )) {
      assert.equal(step.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS, '1');
      assert.equal(step.env.SDKWORK_CLAW_USAGE_SETTLEMENT_WORKER_ENABLED, 'false');
      assert.equal(step.env.SDKWORK_CLAW_MODEL_RANKING_RUN_ON_STARTUP, 'false');
    }

    process.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS = '8';
    process.env.SDKWORK_CLAW_USAGE_SETTLEMENT_WORKER_ENABLED = 'true';
    process.env.SDKWORK_CLAW_MODEL_RANKING_RUN_ON_STARTUP = 'true';
    const tunedSettings = module.parseWorkspaceArgs([
      '--database-url',
      'postgres://sdkwork:sdkwork@localhost:5432/sdkwork_claw_router',
    ]);
    const tunedPlan = module.buildWorkspaceCommandPlan(tunedSettings, { workspaceRoot });
    for (const step of tunedPlan.steps.filter((step) =>
      ['installer', 'model-catalog-refresh', 'gateway', 'admin-api', 'app-api', 'server'].includes(step.name),
    )) {
      assert.equal(step.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS, '8');
      assert.equal(step.env.SDKWORK_CLAW_USAGE_SETTLEMENT_WORKER_ENABLED, 'true');
      assert.equal(step.env.SDKWORK_CLAW_MODEL_RANKING_RUN_ON_STARTUP, 'true');
    }
  } finally {
    if (previousMaxConnections === undefined) {
      delete process.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS;
    } else {
      process.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS = previousMaxConnections;
    }
    if (previousSettlementWorker === undefined) {
      delete process.env.SDKWORK_CLAW_USAGE_SETTLEMENT_WORKER_ENABLED;
    } else {
      process.env.SDKWORK_CLAW_USAGE_SETTLEMENT_WORKER_ENABLED = previousSettlementWorker;
    }
    if (previousRankingStartup === undefined) {
      delete process.env.SDKWORK_CLAW_MODEL_RANKING_RUN_ON_STARTUP;
    } else {
      process.env.SDKWORK_CLAW_MODEL_RANKING_RUN_ON_STARTUP = previousRankingStartup;
    }
  }
});

test('claw router workspace provides Redis host and port defaults for server dev services', async () => {
  const previousRedisEnabled = process.env.SDKWORK_CLAW_REDIS_ENABLED;
  const previousRedisHost = process.env.SDKWORK_CLAW_REDIS_HOST;
  const previousRedisPort = process.env.SDKWORK_CLAW_REDIS_PORT;
  const previousRedisDatabase = process.env.SDKWORK_CLAW_REDIS_DATABASE;
  const previousRedisUrl = process.env.SDKWORK_CLAW_REDIS_URL;
  try {
    delete process.env.SDKWORK_CLAW_REDIS_ENABLED;
    delete process.env.SDKWORK_CLAW_REDIS_HOST;
    delete process.env.SDKWORK_CLAW_REDIS_PORT;
    delete process.env.SDKWORK_CLAW_REDIS_DATABASE;
    delete process.env.SDKWORK_CLAW_REDIS_URL;
    const module = await import(
      pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
    );

    const settings = parseWorkspaceArgsIsolated(module, []);
    const plan = module.buildWorkspaceCommandPlan(settings, { workspaceRoot });
    for (const step of plan.steps.filter((step) =>
      ['gateway', 'admin-api', 'app-api', 'server'].includes(step.name),
    )) {
      assert.equal(step.env.SDKWORK_CLAW_REDIS_HOST, '127.0.0.1');
      assert.equal(step.env.SDKWORK_CLAW_REDIS_PORT, '6379');
      assert.equal(step.env.SDKWORK_CLAW_REDIS_DATABASE, '0');
      assert.equal(step.env.SDKWORK_CLAW_REDIS_URL, undefined);
    }

    process.env.SDKWORK_CLAW_REDIS_URL = 'redis://cache.internal:6380/3';
    process.env.SDKWORK_CLAW_REDIS_HOST = 'stale-redis.internal';
    process.env.SDKWORK_CLAW_REDIS_PORT = '6381';
    process.env.SDKWORK_CLAW_REDIS_DATABASE = '4';
    const urlPlan = module.buildWorkspaceCommandPlan(module.parseWorkspaceArgs([]), { workspaceRoot });
    for (const step of urlPlan.steps.filter((step) =>
      ['gateway', 'admin-api', 'app-api', 'server'].includes(step.name),
    )) {
      assert.equal(step.env.SDKWORK_CLAW_REDIS_URL, 'redis://cache.internal:6380/3');
      assert.equal(step.env.SDKWORK_CLAW_REDIS_HOST, undefined);
      assert.equal(step.env.SDKWORK_CLAW_REDIS_PORT, undefined);
      assert.equal(step.env.SDKWORK_CLAW_REDIS_DATABASE, undefined);
    }
  } finally {
    if (previousRedisEnabled === undefined) {
      delete process.env.SDKWORK_CLAW_REDIS_ENABLED;
    } else {
      process.env.SDKWORK_CLAW_REDIS_ENABLED = previousRedisEnabled;
    }
    if (previousRedisHost === undefined) {
      delete process.env.SDKWORK_CLAW_REDIS_HOST;
    } else {
      process.env.SDKWORK_CLAW_REDIS_HOST = previousRedisHost;
    }
    if (previousRedisPort === undefined) {
      delete process.env.SDKWORK_CLAW_REDIS_PORT;
    } else {
      process.env.SDKWORK_CLAW_REDIS_PORT = previousRedisPort;
    }
    if (previousRedisDatabase === undefined) {
      delete process.env.SDKWORK_CLAW_REDIS_DATABASE;
    } else {
      process.env.SDKWORK_CLAW_REDIS_DATABASE = previousRedisDatabase;
    }
    if (previousRedisUrl === undefined) {
      delete process.env.SDKWORK_CLAW_REDIS_URL;
    } else {
      process.env.SDKWORK_CLAW_REDIS_URL = previousRedisUrl;
    }
  }
});

test('admin reset wrapper maps dev mode to the local SQLite database without exposing password args', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'reset-admin-account.mjs')).href
  );

  const settings = module.parseResetAdminArgs([
    '--mode',
    'dev',
    '--password',
    'Admin-Dev-Reset-Password-2026!',
  ]);
  const plan = module.createResetAdminPlan({
    settings,
    workspaceRoot,
    platform: 'linux',
    env: {},
  });

  assert.equal(plan.mode, 'dev');
  assert.equal(plan.steps.length, 1);
  const [step] = plan.steps;
  assert.equal(step.name, 'reset-admin');
  assert.equal(step.command, 'cargo');
  assert.deepEqual(step.args, [
    'run',
    '-p',
    'sdkwork-claw-installer',
    '--',
    'reset-admin',
    '--username',
    'admin',
    '--display-name',
    'Administrator',
    '--email',
    'admin@sdkwork.com',
  ]);
  assert.equal(step.args.includes('Admin-Dev-Reset-Password-2026!'), false);
  assert.equal(step.env.SDKWORK_CLAW_ADMIN_RESET_PASSWORD, 'Admin-Dev-Reset-Password-2026!');
  assert.equal(step.env.SDKWORK_CLAW_DATABASE_URL, 'sqlite://target/dev/clawrouter.sqlite');
  assert.equal(step.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS, '1');
  assert.equal(step.env.SDKWORK_CLAW_DEPLOYMENT_MODE, 'server');
  assert.equal(step.env.SDKWORK_CLAW_INSTALL_ENVIRONMENT, 'development');
  assert.equal(step.env.SDKWORK_CLAW_INSTALL_SEED_PROFILE, 'commercial');
});

test('admin reset wrapper maps postgres dev mode through the configured env file', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'reset-admin-account.mjs')).href
  );
  const fixtureRoot = path.join(workspaceRoot, 'target', 'admin-reset-config-tests', `postgres-dev-${Date.now()}`);
  const envFile = path.join(fixtureRoot, '.env.postgres');
  rmSync(fixtureRoot, { recursive: true, force: true });
  mkdirSync(fixtureRoot, { recursive: true });
  writeFileSync(
    envFile,
    [
      'SDKWORK_CLAW_DATABASE_ENGINE=postgresql',
      'SDKWORK_CLAW_DATABASE_HOST=[::1]',
      'SDKWORK_CLAW_DATABASE_PORT=5432',
      'SDKWORK_CLAW_DATABASE_NAME=sdkwork_ai_dev',
      'SDKWORK_CLAW_DATABASE_USERNAME=sdkwork_ai_dev',
      'SDKWORK_CLAW_DATABASE_PASSWORD=sdkworkdev123',
      'SDKWORK_CLAW_DATABASE_SSL_MODE=disable',
      'SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS=10',
      '',
    ].join('\n'),
  );

  const settings = module.parseResetAdminArgs([
    '--mode',
    'dev',
    '--dev-env-file',
    envFile,
    '--password',
    'Admin-Postgres-Reset-Password-2026!',
  ]);
  const plan = module.createResetAdminPlan({
    settings,
    workspaceRoot,
    platform: 'linux',
    env: {},
  });

  assert.equal(plan.mode, 'dev');
  const [step] = plan.steps;
  assert.equal(
    step.env.SDKWORK_CLAW_DATABASE_URL,
    'postgresql://sdkwork_ai_dev:sdkworkdev123@[::1]:5432/sdkwork_ai_dev?sslmode=disable',
  );
  assert.equal(step.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS, '10');
  assert.equal(step.env.SDKWORK_CLAW_ADMIN_RESET_PASSWORD, 'Admin-Postgres-Reset-Password-2026!');
  assert.equal(step.env.SDKWORK_CLAW_INSTALL_ENVIRONMENT, 'development');
  assert.equal(step.args.includes('Admin-Postgres-Reset-Password-2026!'), false);
  rmSync(fixtureRoot, { recursive: true, force: true });
});

test('admin reset wrapper accepts pnpm argument separator before script options', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'reset-admin-account.mjs')).href
  );

  const settings = module.parseResetAdminArgs([
    '--mode',
    'dev',
    '--dev-env-file',
    '.env.postgres',
    '--',
    '--password',
    'Admin-Separator-Reset-Password-2026!',
  ]);

  assert.equal(settings.mode, 'dev');
  assert.equal(settings.devEnvFile, '.env.postgres');
  assert.equal(settings.password, 'Admin-Separator-Reset-Password-2026!');
});

test('admin reset wrapper maps release mode through production runtime config and requires a password', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'reset-admin-account.mjs')).href
  );
  const fixtureRoot = path.join(workspaceRoot, 'target', 'admin-reset-config-tests', `release-${Date.now()}`);
  const configFile = path.join(fixtureRoot, 'clawrouter.toml');
  rmSync(fixtureRoot, { recursive: true, force: true });
  mkdirSync(fixtureRoot, { recursive: true });

  assert.throws(
    () =>
      module.createResetAdminPlan({
        settings: module.parseResetAdminArgs(['--mode', 'release']),
        workspaceRoot,
        platform: 'linux',
        env: {},
        writeRuntimeConfig: false,
      }),
    /admin reset password is required/,
  );

  const settings = module.parseResetAdminArgs([
    '--mode',
    'release',
    '--config-file',
    configFile,
    '--database-url',
    `sqlite://${slashPath(path.join(fixtureRoot, 'release.sqlite'))}`,
    '--password',
    'Admin-Release-Reset-Password-2026!',
  ]);
  const plan = module.createResetAdminPlan({
    settings,
    workspaceRoot,
    platform: 'linux',
    env: { HOME: path.join(fixtureRoot, 'home') },
    writeRuntimeConfig: false,
  });

  assert.equal(plan.mode, 'release');
  assert.equal(plan.runtimeConfig.deploymentMode, 'server');
  assert.equal(plan.runtimeConfig.configFile, configFile);
  assert.equal(plan.runtimeConfig.blockingIssue, null);
  const [step] = plan.steps;
  assert.deepEqual(step.args, [
    'run',
    '-p',
    'sdkwork-claw-installer',
    '--',
    'reset-admin',
    '--username',
    'admin',
    '--display-name',
    'Administrator',
    '--email',
    'admin@sdkwork.com',
  ]);
  assert.equal(step.args.includes('Admin-Release-Reset-Password-2026!'), false);
  assert.equal(step.env.SDKWORK_CLAW_ADMIN_RESET_PASSWORD, 'Admin-Release-Reset-Password-2026!');
  assert.equal(step.env.SDKWORK_CLAW_CONFIG_FILE, configFile);
  assert.equal(step.env.SDKWORK_CLAW_DEPLOYMENT_MODE, 'server');
  assert.equal(step.env.SDKWORK_CLAW_DATABASE_URL, `sqlite://${slashPath(path.join(fixtureRoot, 'release.sqlite'))}`);
  assert.equal(existsSync(configFile), false);
  rmSync(fixtureRoot, { recursive: true, force: true });
});

test('database management wrapper maps pnpm init and upgrade commands to the installer', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'manage-claw-router-database.mjs')).href
  );
  const fixtureRoot = path.join(workspaceRoot, 'target', 'database-management-tests', `config-${Date.now()}`);
  const configFile = path.join(fixtureRoot, 'clawrouter.toml');

  const initSettings = module.parseDatabaseManagementArgs([
    'init',
    '--',
    '--config-file',
    configFile,
    '--database-max-connections',
    '7',
    '--environment',
    'staging',
    '--seed-profile',
    'commercial',
    '--models-catalog-root',
    '../sdkwork-models',
  ]);
  const initPlan = module.createDatabaseManagementPlan({
    settings: initSettings,
    workspaceRoot,
    platform: 'linux',
    env: {},
  });

  assert.equal(initPlan.command, 'init');
  assert.equal(initPlan.installerCommand, 'install');
  assert.equal(initPlan.steps.length, 1);
  const [initStep] = initPlan.steps;
  assert.equal(initStep.name, 'database-init');
  assert.equal(initStep.command, 'cargo');
  assert.deepEqual(initStep.args, [
    'run',
    '-p',
    'sdkwork-claw-installer',
    '--',
    'install',
  ]);
  assert.equal(initStep.env.SDKWORK_CLAW_CONFIG_FILE, configFile);
  assert.equal(initStep.env.SDKWORK_CLAW_DEPLOYMENT_MODE, 'server');
  assert.equal(initStep.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS, '7');
  assert.equal(initStep.env.SDKWORK_CLAW_INSTALL_ENVIRONMENT, 'staging');
  assert.equal(initStep.env.SDKWORK_CLAW_INSTALL_SEED_PROFILE, 'commercial');
  assert.equal(initStep.env.SDKWORK_MODELS_CATALOG_ROOT, '../sdkwork-models');

  const upgradeSettings = module.parseDatabaseManagementArgs([
    'upgrade',
    '--',
    '--database-url',
    'postgresql://sdkwork:secret@db.internal:5432/sdkwork_claw_router',
    '--database-max-connections',
    '12',
  ]);
  const upgradePlan = module.createDatabaseManagementPlan({
    settings: upgradeSettings,
    workspaceRoot,
    platform: 'linux',
    env: {},
  });

  assert.equal(upgradePlan.command, 'upgrade');
  assert.equal(upgradePlan.installerCommand, 'upgrade');
  const [upgradeStep] = upgradePlan.steps;
  assert.deepEqual(upgradeStep.args, [
    'run',
    '-p',
    'sdkwork-claw-installer',
    '--',
    'upgrade',
  ]);
  assert.equal(
    upgradeStep.env.SDKWORK_CLAW_DATABASE_URL,
    'postgresql://sdkwork:secret@db.internal:5432/sdkwork_claw_router',
  );
  assert.equal(upgradeStep.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS, '12');

  const rootDbSettings = module.parseDatabaseManagementArgs([
    '--',
    'status',
    '--config-file',
    configFile,
  ]);
  const rootDbPlan = module.createDatabaseManagementPlan({
    settings: rootDbSettings,
    workspaceRoot,
    platform: 'linux',
    env: {},
  });
  assert.equal(rootDbPlan.command, 'status');
  assert.deepEqual(rootDbPlan.steps[0].args, [
    'run',
    '-p',
    'sdkwork-claw-installer',
    '--',
    'status',
  ]);
  assert.equal(rootDbPlan.steps[0].env.SDKWORK_CLAW_CONFIG_FILE, configFile);
});

test('database management wrapper forwards catalog refresh options and supports dry runs', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'manage-claw-router-database.mjs')).href
  );
  const settings = module.parseDatabaseManagementArgs([
    'refresh-catalog',
    '--',
    '--config-file',
    'etc/clawrouter.toml',
    '--deployment-mode',
    'desktop',
    '--dry-run',
    '--vendor',
    'openai',
    '--force',
  ]);
  const plan = module.createDatabaseManagementPlan({
    settings,
    workspaceRoot,
    platform: 'win32',
    env: {},
  });

  assert.equal(plan.command, 'refresh-catalog');
  assert.equal(plan.installerCommand, 'refresh-catalog');
  assert.equal(plan.dryRun, true);
  const [step] = plan.steps;
  assert.equal(step.command, 'cargo.exe');
  assert.deepEqual(step.args, [
    'run',
    '-p',
    'sdkwork-claw-installer',
    '--',
    'refresh-catalog',
    '--vendor',
    'openai',
    '--force',
  ]);
  assert.equal(step.env.SDKWORK_CLAW_CONFIG_FILE, path.resolve(workspaceRoot, 'etc/clawrouter.toml'));
  assert.equal(step.env.SDKWORK_CLAW_DEPLOYMENT_MODE, 'desktop');
  assert.equal(
    step.env.SDKWORK_IAM_APP_ROOT,
    path.resolve(workspaceRoot, '..', 'sdkwork-iam'),
  );
  assert.equal(step.windowsHide, true);
});

test('database management example config documents structured PostgreSQL fields', () => {
  const examplePath = path.join(workspaceRoot, 'etc', 'clawrouter.database.example.toml');
  const content = readFileSync(examplePath, 'utf8');

  assert.match(content, /^\[database\]$/mu);
  assert.match(content, /^engine = "postgresql"$/mu);
  assert.match(content, /^host = "db.internal"$/mu);
  assert.match(content, /^port = 5432$/mu);
  assert.match(content, new RegExp(`^database = "${defaultProdPostgresDatabase}"$`, 'mu'));
  assert.match(content, new RegExp(`^username = "${defaultProdPostgresUsername.replaceAll('+', '\\+')}"$`, 'mu'));
  assert.match(content, /^password_file = "\.\/database.secret"$/mu);
  assert.match(content, /^max_connections = 16$/mu);
  assert.match(content, /\[database_sqlite_example\]/u);
});

test('claw router workspace rejects obsolete portal dev bind option', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
  );

  assert.throws(
    () => module.parseWorkspaceArgs(['--portal-dev-bind', '127.0.0.1:13900']),
    /unknown option: --portal-dev-bind/u,
  );
});

test('claw router workspace supports explicit Rust server forwarding target URLs', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
  );

  const settings = module.parseWorkspaceArgs([
    '--gateway-forward-url',
    'http://gateway.internal:18080',
    '--backend-api-forward-url',
    'https://admin.internal',
    '--app-api-forward-url',
    'http://app.internal:18082',
  ]);
  const plan = module.buildWorkspaceCommandPlan(settings, { workspaceRoot });
  const serverEnv = plan.steps.find((step) => step.name === 'server').env;

  assert.equal(serverEnv.SDKWORK_CLAW_EDGE_GATEWAY_BASE_URL, 'http://gateway.internal:18080');
  assert.equal(serverEnv.SDKWORK_CLAW_EDGE_BACKEND_API_BASE_URL, 'https://admin.internal');
  assert.equal(serverEnv.SDKWORK_CLAW_EDGE_APP_API_BASE_URL, 'http://app.internal:18082');
});

test('workspace dry-run output uses server and portal bind names without obsolete aliases', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
  );

  const settings = module.parseWorkspaceArgs([
    '--server-bind',
    '0.0.0.0:12900',
    '--portal-bind',
    '0.0.0.0:13900',
    '--plan-format',
    'json',
  ]);
  const plan = module.buildWorkspaceCommandPlan(settings, { workspaceRoot });
  const [jsonLine] = module.renderWorkspaceDryRun(settings, plan);
  const dryRun = JSON.parse(jsonLine);
  const textOutput = module.renderWorkspaceDryRun(
    { ...settings, planFormat: 'text' },
    plan,
  ).join('\n');
  const helpText = module.workspaceHelpText();

  assert.equal(dryRun.serverBind, '0.0.0.0:12900');
  assert.equal(dryRun.portalBind, '0.0.0.0:13900');
  assert.equal(Object.hasOwn(dryRun, 'portalDevBind'), false);
  assert.equal(
    dryRun.steps.find((step) => step.name === 'model-catalog-refresh').blocking,
    true,
  );
  assert.match(
    dryRun.steps.find((step) => step.name === 'model-catalog-refresh').failureHint,
    /refresh-catalog/u,
  );
  assert.ok(textOutput.includes('SDKWORK_CLAW_SERVER_BIND=0.0.0.0:12900'));
  assert.ok(textOutput.includes('SDKWORK_CLAW_PORTAL_BIND=0.0.0.0:13900'));
  assert.ok(textOutput.includes(`SDKWORK_MODELS_CATALOG_ROOT=${path.join(workspaceRoot, '..', 'sdkwork-models')}`));
  assert.ok(textOutput.includes('PORTAL_PUBLIC_API_BASE_URL=/v1'));
  assert.ok(textOutput.includes('PORTAL_PUBLIC_OPEN_API_BASE_URL=/v1'));
  assert.ok(textOutput.includes('PORTAL_PUBLIC_BACKEND_API_BASE_URL=/backend/v3/api'));
  assert.ok(textOutput.includes('PORTAL_PUBLIC_APP_API_BASE_URL=/app/v3/api'));
  assert.ok(!textOutput.includes('PORTAL_DEV_BIND'));
  assert.ok(helpText.includes('--server-bind <bind>'));
  assert.ok(helpText.includes('--portal-bind <bind>'));
  assert.ok(!helpText.includes('--portal-dev-bind'));
});

test('workspace launch plan exposes explicit forwarded header trust settings', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
  );

  const defaults = module.parseWorkspaceArgs([]);
  const defaultPlan = module.buildWorkspaceCommandPlan(defaults, { workspaceRoot });
  const defaultServerEnv = defaultPlan.steps.find((step) => step.name === 'server').env;

  assert.equal(defaults.externalScheme, 'http');
  assert.equal(defaults.trustForwardedHeaders, false);
  assert.equal(defaultServerEnv.SDKWORK_CLAW_EDGE_EXTERNAL_SCHEME, 'http');
  assert.equal(defaultServerEnv.SDKWORK_CLAW_EDGE_TRUST_FORWARDED_HEADERS, '0');

  const settings = module.parseWorkspaceArgs([
    '--external-scheme',
    'https',
    '--trust-forwarded-headers',
    '--plan-format',
    'json',
  ]);
  const plan = module.buildWorkspaceCommandPlan(settings, { workspaceRoot });
  const serverEnv = plan.steps.find((step) => step.name === 'server').env;
  const [jsonLine] = module.renderWorkspaceDryRun(settings, plan);
  const dryRun = JSON.parse(jsonLine);
  const textOutput = module.renderWorkspaceDryRun(
    { ...settings, planFormat: 'text' },
    plan,
  ).join('\n');
  const helpText = module.workspaceHelpText();

  assert.equal(settings.externalScheme, 'https');
  assert.equal(settings.trustForwardedHeaders, true);
  assert.equal(serverEnv.SDKWORK_CLAW_EDGE_EXTERNAL_SCHEME, 'https');
  assert.equal(serverEnv.SDKWORK_CLAW_EDGE_TRUST_FORWARDED_HEADERS, '1');
  assert.equal(dryRun.externalScheme, 'https');
  assert.equal(dryRun.trustForwardedHeaders, true);
  assert.ok(textOutput.includes('SDKWORK_CLAW_EDGE_EXTERNAL_SCHEME=https'));
  assert.ok(textOutput.includes('SDKWORK_CLAW_EDGE_TRUST_FORWARDED_HEADERS=1'));
  assert.ok(helpText.includes('--external-scheme <scheme>'));
  assert.ok(helpText.includes('--trust-forwarded-headers'));
  assert.throws(
    () => module.parseWorkspaceArgs(['--external-scheme', 'ftp']),
    /--external-scheme must be http or https/u,
  );
});

test('workspace access output includes split-services topology details', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
  );

  const settings = module.parseWorkspaceArgs([
    '--service-layout',
    'split-services',
    '--gateway-bind',
    '0.0.0.0:19080',
    '--admin-api-bind',
    '0.0.0.0:19081',
    '--app-api-bind',
    '0.0.0.0:19082',
    '--server-bind',
    '0.0.0.0:12900',
  ]);
  const lines = module.workspaceAccessLines(settings);

  assert.deepEqual(lines, [
    '[start-workspace] Mode: server (distributed)',
    '[start-workspace] Edge Server Access',
    '[start-workspace]   Portal: http://127.0.0.1:12900/',
    '[start-workspace]   Gateway API: http://127.0.0.1:12900/v1',
    '[start-workspace]   Backend/Admin API: http://127.0.0.1:12900/backend/v3/api',
    '[start-workspace]   App API: http://127.0.0.1:12900/app/v3/api',
    '[start-workspace]   Gateway OpenAPI: http://127.0.0.1:12900/openapi.json',
    '[start-workspace]   Admin API OpenAPI: http://127.0.0.1:12900/backend/v3/api/openapi.json',
    '[start-workspace]   App API OpenAPI: http://127.0.0.1:12900/app/v3/api/openapi.json',
    '[start-workspace] Direct Service Access',
    '[start-workspace]   Direct Portal Dev: http://127.0.0.1:3901/',
    '[start-workspace]   Direct Portal Gateway API Proxy: http://127.0.0.1:3901/v1',
    '[start-workspace]   Direct Portal Backend/Admin API Proxy: http://127.0.0.1:3901/backend/v3/api',
    '[start-workspace]   Direct Portal App API Proxy: http://127.0.0.1:3901/app/v3/api',
    '[start-workspace]   Direct Portal Gateway OpenAPI Proxy: http://127.0.0.1:3901/openapi.json',
    '[start-workspace]   Direct Portal Admin API OpenAPI Proxy: http://127.0.0.1:3901/backend/v3/api/openapi.json',
    '[start-workspace]   Direct Portal App API OpenAPI Proxy: http://127.0.0.1:3901/app/v3/api/openapi.json',
    '[start-workspace] Internal Validation Topology',
    '[start-workspace] OpenAPI Schemas',
    '[start-workspace]   Gateway OpenAPI: http://127.0.0.1:19080/openapi.json',
    '[start-workspace]   Admin API OpenAPI: http://127.0.0.1:19081/backend/v3/api/openapi.json',
    '[start-workspace]   App API OpenAPI: http://127.0.0.1:19082/app/v3/api/openapi.json',
    '[start-workspace] API Access Paths',
    '[start-workspace]   OpenAI-compatible Gateway API: http://127.0.0.1:19080/v1',
    '[start-workspace]   Backend/Admin API: http://127.0.0.1:19081/backend/v3/api',
    '[start-workspace]   App API: http://127.0.0.1:19082/app/v3/api',
    '[start-workspace] Health Checks',
    '[start-workspace]   Edge Server Health: http://127.0.0.1:12900/healthz',
    '[start-workspace]   Edge Server Ready: http://127.0.0.1:12900/readyz',
    '[start-workspace]   Gateway Health: http://127.0.0.1:19080/healthz',
    '[start-workspace]   Gateway Ready: http://127.0.0.1:19080/readyz',
    '[start-workspace]   Admin API Health: http://127.0.0.1:19081/healthz',
    '[start-workspace]   Admin API Ready: http://127.0.0.1:19081/readyz',
    '[start-workspace]   App API Health: http://127.0.0.1:19082/healthz',
    '[start-workspace]   App API Ready: http://127.0.0.1:19082/readyz',
  ]);
});

test('workspace access output defaults to edge server port 3900', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
  );

  const settings = module.parseWorkspaceArgs([]);
  const lines = module.workspaceAccessLines(settings);

  assert.equal(settings.serverBind, '0.0.0.0:3900');
  assert.equal(settings.portalBind, '127.0.0.1:3901');
  assert.equal(lines[2], '[start-workspace]   Portal: http://127.0.0.1:3900/');
  assert.equal(lines[3], '[start-workspace]   Gateway API: http://127.0.0.1:3900/v1');
  assert.equal(lines[6], '[start-workspace]   Gateway OpenAPI: http://127.0.0.1:3900/openapi.json');
  assert.equal(lines[7], '[start-workspace]   Admin API OpenAPI: http://127.0.0.1:3900/backend/v3/api/openapi.json');
  assert.equal(lines[8], '[start-workspace]   App API OpenAPI: http://127.0.0.1:3900/app/v3/api/openapi.json');
  assert.ok(lines.includes('[start-workspace]   Direct Portal Dev: http://127.0.0.1:3901/'));
  assert.ok(lines.includes('[start-workspace]   Direct Portal Gateway API Proxy: http://127.0.0.1:3901/v1'));
  assert.ok(lines.includes('[start-workspace]   Direct Portal App API Proxy: http://127.0.0.1:3901/app/v3/api'));
  assert.ok(lines.includes('[start-workspace]   Direct Portal App API OpenAPI Proxy: http://127.0.0.1:3901/app/v3/api/openapi.json'));
  assert.ok(lines.includes('[start-workspace]   Edge Server Health: http://127.0.0.1:3900/healthz'));
  assert.ok(lines.includes('[start-workspace]   Edge Server Ready: http://127.0.0.1:3900/readyz'));
  assert.equal(lines.some((line) => line.includes('Gateway Health: http://127.0.0.1:18080')), false);
});

test('workspace startup output includes LAN portal links for wildcard edge binds', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
  );

  const settings = module.parseWorkspaceArgs([]);
  const lines = module.workspaceAccessLines(settings, true, {
    Ethernet: [
      { family: 'IPv4', address: '192.168.50.12', internal: false },
      { family: 'IPv6', address: 'fe80::1', internal: false },
    ],
    WiFi: [{ family: 'IPv4', address: '10.0.0.7', internal: false }],
  });

  assert.ok(lines.includes('[start-workspace] LAN Access (same Wi-Fi/LAN)'));
  assert.ok(lines.includes('[start-workspace]   LAN: http://10.0.0.7:3900/'));
  assert.ok(lines.includes('[start-workspace]   LAN: http://192.168.50.12:3900/'));

  const successLines = module.successfulStartupAccessLines(settings, {
    Ethernet: [{ family: 'IPv4', address: '192.168.50.12', internal: false }],
  });
  assert.deepEqual(successLines, [
    '[start-workspace] application started successfully',
    '[start-workspace] Access URLs',
    '[start-workspace]   Local: http://127.0.0.1:3900/',
    '[start-workspace]   LAN: http://192.168.50.12:3900/',
  ]);
});

test('workspace reports successful startup only after the portal is ready', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs')).href
  );
  const settings = module.parseWorkspaceArgs([]);
  let attempts = 0;

  const portalUrl = await module.waitForPortalReady(settings, {
    waitFn: async () => {
      attempts += 1;
      return attempts === 2;
    },
    sleep: async () => {},
    maxAttempts: 3,
  });

  assert.equal(portalUrl, 'http://127.0.0.1:3901/');
  assert.equal(attempts, 2);
});

test('claw router application launcher desktop mode runs install-checked workspace and installs portal dependencies when requested', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'run-claw-router-application.mjs')).href
  );

  const plan = module.createClawRouterProductLaunchPlan({
    workspaceRoot,
    mode: 'desktop',
    install: true,
    platform: 'win32',
    env: {},
    extraArgs: [],
  });

  assert.equal(plan.length, 2);
  assert.equal(plan[0].label, 'portal install');
  assert.deepEqual(plan[0].args, ['--dir', 'apps/sdkwork-clawrouter-pc', 'install']);
  assert.equal(plan[0].command, 'pnpm.cmd');
  assert.equal(plan[0].shell, true);
  assert.equal(plan[1].label, 'desktop development workspace');
  assert.equal(plan[1].command, process.execPath);
  assert.deepEqual(plan[1].args, [
    path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs'),
    '--client-only',
  ]);
  assert.equal(plan[1].shell, false);
  assert.equal(plan[1].env.SDKWORK_CLAW_DEPLOYMENT_MODE, 'desktop');
});

test('claw router application launcher service mode runs install-checked workspace with service flags', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'run-claw-router-application.mjs')).href
  );

  const plan = module.createClawRouterProductLaunchPlan({
    workspaceRoot,
    mode: 'service',
    install: false,
    platform: 'linux',
    env: {},
    extraArgs: ['--server-bind', '127.0.0.1:3910'],
  });

  const serviceStep = findPlanStep(plan, 'service development workspace');
  assert.equal(serviceStep.command, process.execPath);
  assert.deepEqual(serviceStep.args, [
    path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs'),
    '--server-bind',
    '127.0.0.1:3910',
  ]);
  assert.equal(serviceStep.env.SDKWORK_CLAW_DEPLOYMENT_MODE, 'desktop');
  assert.equal(serviceStep.env.SDKWORK_CLAW_SERVICE_MODE, '1');
  assert.equal(serviceStep.env.SDKWORK_CLAW_PORTAL_START_HIDDEN, '1');
  assert.equal(serviceStep.shell, false);
});

test('claw router application launcher forwards workspace arguments into server mode', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'run-claw-router-application.mjs')).href
  );

  const plan = module.createClawRouterProductLaunchPlan({
    workspaceRoot,
    mode: 'server',
    install: false,
    platform: 'linux',
    env: {},
    extraArgs: ['--gateway-bind', '0.0.0.0:19080'],
  });

  const serverStep = findPlanStep(plan, 'server development workspace');
  assert.equal(serverStep.command, process.execPath);
  assert.deepEqual(serverStep.args, [
    path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs'),
    '--gateway-bind',
    '0.0.0.0:19080',
  ]);
  assert.equal(serverStep.shell, false);
});

test('claw router application launcher server plan prints human-readable access matrix by default', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'run-claw-router-application.mjs')).href
  );

  const plan = module.createClawRouterProductLaunchPlan({
    workspaceRoot,
    mode: 'plan',
    install: false,
    platform: 'linux',
    env: {},
    extraArgs: [],
  });

  assert.equal(plan.length, 1);
  assert.equal(plan[0].label, 'server development plan');
  assert.deepEqual(plan[0].args, [
    path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs'),
    '--dry-run',
  ]);
});

test('production starter supports help, dry-run, and full edge access matrix', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'start-claw-router-production.mjs')).href
  );
  const artifacts = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'claw-router-production-artifacts.mjs')).href
  );

  assert.deepEqual(module.parseStartProductionArgs(['--help']), {
    help: true,
    dryRun: false,
    initConfigOnly: false,
    forwardingMode: false,
    deploymentMode: null,
    configFile: null,
    databaseUrl: null,
    databaseMaxConnections: null,
    serverBind: null,
    gatewayForwardUrl: null,
    backendApiForwardUrl: null,
    appApiForwardUrl: null,
    externalScheme: null,
    trustForwardedHeaders: false,
  });
  assert.deepEqual(module.parseStartProductionArgs(['--dry-run']), {
    help: false,
    dryRun: true,
    initConfigOnly: false,
    forwardingMode: false,
    deploymentMode: null,
    configFile: null,
    databaseUrl: null,
    databaseMaxConnections: null,
    serverBind: null,
    gatewayForwardUrl: null,
    backendApiForwardUrl: null,
    appApiForwardUrl: null,
    externalScheme: null,
    trustForwardedHeaders: false,
  });
  assert.deepEqual(
    module.parseStartProductionArgs([
      '--dry-run',
      '--deployment-mode',
      'server',
      '--config-file',
      '/etc/sdkwork/router/clawrouter.toml',
      '--database-url',
      'postgresql://sdkwork:secret@db.internal:5432/sdkwork_claw_router',
      '--database-max-connections',
      '24',
      '--server-bind',
      '0.0.0.0:12900',
      '--gateway-forward-url',
      'http://gateway.internal:18080',
      '--backend-api-forward-url',
      'https://admin.internal',
      '--app-api-forward-url',
      'http://app.internal:18082',
      '--external-scheme',
      'https',
      '--trust-forwarded-headers',
      '--forwarding-mode',
    ]),
    {
      help: false,
      dryRun: true,
      initConfigOnly: false,
      forwardingMode: true,
      deploymentMode: 'server',
      configFile: '/etc/sdkwork/router/clawrouter.toml',
      databaseUrl: 'postgresql://sdkwork:secret@db.internal:5432/sdkwork_claw_router',
      databaseMaxConnections: '24',
      serverBind: '0.0.0.0:12900',
      gatewayForwardUrl: 'http://gateway.internal:18080',
      backendApiForwardUrl: 'https://admin.internal',
      appApiForwardUrl: 'http://app.internal:18082',
      externalScheme: 'https',
      trustForwardedHeaders: true,
    },
  );
  assert.throws(
    () => module.parseStartProductionArgs(['--gateway-forward-url', 'http://gateway.internal:18080/v1']),
    /must be an HTTP\/HTTPS origin/,
  );
  assert.throws(
    () => module.parseStartProductionArgs(['--external-scheme', 'ftp']),
    /must be http or https/,
  );
  assert.throws(
    () => module.parseStartProductionArgs(['--deployment-mode', 'browser']),
    /must be server or desktop/,
  );
  assert.throws(
    () => module.parseStartProductionArgs(['--database-max-connections', '0']),
    /must be a positive integer/,
  );
  assert.doesNotThrow(() => module.main(['--dry-run']));
  assert.doesNotThrow(() => module.assertPortalDistReadyForStart(true, path.join(workspaceRoot, 'missing-dist')));
  assert.throws(
    () => module.assertPortalDistReadyForStart(false, path.join(workspaceRoot, 'missing-dist')),
    /portal production dist is missing/,
  );

  const env = module.resolveStartProductionEnv(
    {
      SDKWORK_CLAW_SERVER_BIND: '0.0.0.0:12900',
      PORTAL_PUBLIC_API_BASE_URL: 'https://api.example.com/v1',
      CARGO_TARGET_DIR: 'target-codex',
    },
    path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'dist'),
    module.parseStartProductionArgs([
      '--gateway-forward-url',
      'http://gateway.internal:18080',
      '--backend-api-forward-url',
      'https://admin.internal',
      '--app-api-forward-url',
      'http://app.internal:18082',
      '--external-scheme',
      'https',
      '--trust-forwarded-headers',
    ]),
  );
  assert.equal(env.SDKWORK_CLAW_EDGE_SERVER, '1');
  assert.equal(env.SDKWORK_CLAW_ALL_IN_ONE_RUNTIME, '0');
  assert.equal(env.SDKWORK_CLAW_SERVER_BIND, '0.0.0.0:12900');
  assert.equal(env.SDKWORK_CLAW_EDGE_GATEWAY_BASE_URL, 'http://gateway.internal:18080');
  assert.equal(env.SDKWORK_CLAW_EDGE_BACKEND_API_BASE_URL, 'https://admin.internal');
  assert.equal(env.SDKWORK_CLAW_EDGE_APP_API_BASE_URL, 'http://app.internal:18082');
  assert.equal(env.SDKWORK_CLAW_EDGE_EXTERNAL_SCHEME, 'https');
  assert.equal(env.SDKWORK_CLAW_EDGE_TRUST_FORWARDED_HEADERS, '1');
  assert.equal(env.PORTAL_PUBLIC_API_BASE_URL, 'https://api.example.com/v1');
  assert.equal(env.PORTAL_PUBLIC_OPEN_API_BASE_URL, 'https://api.example.com/v1');
  assert.equal(env.PORTAL_PUBLIC_APP_API_BASE_URL, '/app/v3/api');
  assert.equal(env.PORTAL_PUBLIC_BACKEND_API_BASE_URL, '/backend/v3/api');
  assert.equal(env.PORTAL_PUBLIC_TOOL_API_ENABLED, 'false');
  assert.equal(env.SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS, '120');
  assert.equal(env.SDKWORK_CLAW_TOOL_API_RATE_LIMIT_WINDOW_SECONDS, '60');
  assert.equal(
    env.SDKWORK_CLAW_TOOL_API_SDK_ARCHIVE_ROOT,
    path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'dist', 'sdk-archives'),
  );
  assert.equal(env.CARGO_TARGET_DIR, 'target-codex');
  assert.equal(
    artifacts.productionGatewayBinaryPath({ env, platform: 'win32', workspaceRoot }),
    path.join(workspaceRoot, 'target-codex', 'release', 'clawrouter.exe'),
  );
  assert.deepEqual(
    module.resolveStartProductionCommand(
      { ...env, SDKWORK_CLAW_GATEWAY_BIN: 'D:\\prod\\clawrouter.exe' },
      'win32',
      workspaceRoot,
    ),
    {
      command: 'D:\\prod\\clawrouter.exe',
      args: [],
      source: 'env',
    },
  );

  const lines = module.buildStartProductionAccessLines(env);
  assert.ok(lines.includes('[start-production] Edge Server Access'));
  assert.ok(lines.includes('[start-production]   Portal: http://127.0.0.1:12900/'));
  assert.ok(lines.includes('[start-production]   Gateway OpenAPI: http://127.0.0.1:12900/openapi.json'));
  assert.ok(lines.includes('[start-production]   Admin API OpenAPI: http://127.0.0.1:12900/backend/v3/api/openapi.json'));
  assert.ok(lines.includes('[start-production]   App API OpenAPI: http://127.0.0.1:12900/app/v3/api/openapi.json'));
  assert.ok(lines.includes('[start-production]   Gateway API: http://127.0.0.1:12900/v1'));
  assert.ok(lines.includes('[start-production]   Backend/Admin API: http://127.0.0.1:12900/backend/v3/api'));
  assert.ok(lines.includes('[start-production]   App API: http://127.0.0.1:12900/app/v3/api'));
  assert.ok(lines.includes('[start-production]   Edge Server Health: http://127.0.0.1:12900/healthz'));
  assert.ok(lines.includes('[start-production]   Edge Server Ready: http://127.0.0.1:12900/readyz'));
  assert.ok(lines.includes('[start-production] Edge Forwarding Targets'));
  assert.ok(lines.includes('[start-production]   Gateway Target: http://gateway.internal:18080'));
  assert.ok(lines.includes('[start-production]   Backend/Admin Target: https://admin.internal'));
  assert.ok(lines.includes('[start-production]   App Target: http://app.internal:18082'));
  assert.ok(lines.includes('[start-production] Direct Service Access'));
  assert.ok(lines.includes('[start-production]   Gateway OpenAPI: http://gateway.internal:18080/openapi.json'));
  assert.ok(lines.includes('[start-production]   Admin API OpenAPI: https://admin.internal/backend/v3/api/openapi.json'));
  assert.ok(lines.includes('[start-production]   App API OpenAPI: http://app.internal:18082/app/v3/api/openapi.json'));
  assert.ok(lines.includes('[start-production]   OpenAI-compatible Gateway API: http://gateway.internal:18080/v1'));
  assert.ok(lines.includes('[start-production]   Backend/Admin API: https://admin.internal/backend/v3/api'));
  assert.ok(lines.includes('[start-production]   App API: http://app.internal:18082/app/v3/api'));
  assert.ok(lines.includes('[start-production]   PORTAL_PUBLIC_TOOL_API_ENABLED=false'));
  assert.ok(lines.includes('[start-production]   SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS=120'));
  assert.ok(lines.includes('[start-production]   SDKWORK_CLAW_TOOL_API_RATE_LIMIT_WINDOW_SECONDS=60'));
  assert.ok(lines.some((line) => (
    line.startsWith('[start-production]   SDKWORK_CLAW_TOOL_API_SDK_ARCHIVE_ROOT=')
    && line.includes(path.join('apps', 'sdkwork-clawrouter-pc', 'dist', 'sdk-archives'))
  )));
  assert.ok(lines.includes('[start-production]   SDKWORK_CLAW_EDGE_EXTERNAL_SCHEME=https'));
  assert.ok(lines.includes('[start-production]   SDKWORK_CLAW_EDGE_TRUST_FORWARDED_HEADERS=1'));
});

test('production starter defaults to all-in-one runtime without forwarding targets', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'start-claw-router-production.mjs')).href
  );

  const env = module.resolveStartProductionEnv(
    {
      SDKWORK_CLAW_SERVER_BIND: '0.0.0.0:12900',
    },
    path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'dist'),
    module.parseStartProductionArgs([]),
  );
  const lines = module.buildStartProductionAccessLines(env);

  assert.equal(env.SDKWORK_CLAW_EDGE_SERVER, '1');
  assert.equal(env.SDKWORK_CLAW_ALL_IN_ONE_RUNTIME, '1');
  assert.equal(env.SDKWORK_CLAW_APP_RUNTIME_GATEWAY_BASE_URL, 'http://127.0.0.1:12900');
  assert.ok(lines.includes('[start-production] Runtime Mode: all-in-one'));
  assert.equal(lines.includes('[start-production] Edge Forwarding Targets'), false);
  assert.ok(module.buildStartProductionHelpText().includes('--forwarding-mode'));
  assert.ok(module.buildStartProductionHelpText().includes('Deprecated alias for --forwarding-mode.'));
});

test('claw router application help does not present distributed dev as a standard workflow example', async () => {
  const source = readFileSync(
    path.join(workspaceRoot, 'scripts', 'run-claw-router-application.mjs'),
    'utf8',
  );

  assert.equal(
    source.includes('pnpm server:dev'),
    false,
    'default help examples must not advertise server:dev as a standard workflow',
  );
});

test('production starter resolves OS-standard runtime config locations', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'start-claw-router-production.mjs')).href
  );

  const linuxDesktop = module.runtimeConfigLocationForPlatform('linux', 'desktop', {
    HOME: '/home/ada',
    XDG_CONFIG_HOME: '/home/ada/.config-xdg',
    XDG_DATA_HOME: '/home/ada/.data-xdg',
  });
  assert.equal(
    slashPath(linuxDesktop.configFile),
    '/home/ada/.sdkwork/router/config/clawrouter.toml',
  );
  assert.equal(
    slashPath(linuxDesktop.dataDirectory),
    '/home/ada/.sdkwork/router/data',
  );

  const windowsServer = module.runtimeConfigLocationForPlatform('win32', 'server', {
    ProgramData: 'C:/ProgramData',
  });
  assert.equal(
    slashPath(windowsServer.configFile),
    'C:/ProgramData/sdkwork/router/clawrouter.toml',
  );
  assert.equal(
    slashPath(windowsServer.dataDirectory),
    'C:/ProgramData/sdkwork/router/Data',
  );

  const macosDesktop = module.runtimeConfigLocationForPlatform('darwin', 'desktop', {
    HOME: '/Users/ada',
  });
  assert.equal(
    slashPath(macosDesktop.configFile),
    '/Users/ada/.sdkwork/router/config/clawrouter.toml',
  );
  assert.equal(
    slashPath(macosDesktop.dataDirectory),
    '/Users/ada/.sdkwork/router/data',
  );
});

test('production starter auto-initializes desktop SQLite runtime config', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'start-claw-router-production.mjs')).href
  );
  const fixtureRoot = path.join(workspaceRoot, 'target', 'start-production-config-tests', `desktop-${Date.now()}`);
  rmSync(fixtureRoot, { recursive: true, force: true });
  mkdirSync(fixtureRoot, { recursive: true });

  const env = {
    HOME: path.join(fixtureRoot, 'home'),
    XDG_CONFIG_HOME: path.join(fixtureRoot, 'xdg-config'),
    XDG_DATA_HOME: path.join(fixtureRoot, 'xdg-data'),
  };
  const result = module.prepareStartProductionRuntimeConfig({
    baseEnv: env,
    settings: module.parseStartProductionArgs(['--deployment-mode', 'desktop']),
    platform: 'linux',
    write: true,
  });

  assert.equal(result.action, 'created');
  assert.equal(result.deploymentMode, 'desktop');
  assert.equal(result.databaseEngine, 'sqlite');
  assert.equal(result.databaseUrl, `sqlite://${slashPath(path.join(env.HOME, '.sdkwork', 'router', 'data', 'clawrouter.sqlite'))}`);
  assert.equal(result.blockingIssue, null);
  assert.equal(
    slashPath(result.configFile),
    slashPath(path.join(env.HOME, '.sdkwork', 'router', 'config', 'clawrouter.toml')),
  );
  assert.equal(result.env.SDKWORK_CLAW_CONFIG_FILE, result.configFile);
  assert.equal(result.env.SDKWORK_CLAW_DEPLOYMENT_MODE, 'desktop');
  assert.equal(existsSync(result.configFile), true);

  const content = readFileSync(result.configFile, 'utf8');
  assert.ok(content.includes('[database]'));
  assert.ok(content.includes('engine = "sqlite"'));
  assert.ok(content.includes(`url = "${result.databaseUrl}"`));
  assert.ok(content.includes('max_connections = 1'));
  assert.ok(content.includes('[paths]'));
  assert.ok(content.includes(`[runtime]`));
  rmSync(fixtureRoot, { recursive: true, force: true });
});

test('production starter initializes server PostgreSQL runtime config template', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'start-claw-router-production.mjs')).href
  );
  const fixtureRoot = path.join(workspaceRoot, 'target', 'start-production-config-tests', `server-${Date.now()}`);
  const configFile = path.join(fixtureRoot, 'etc', 'clawrouter.toml');
  rmSync(fixtureRoot, { recursive: true, force: true });
  mkdirSync(fixtureRoot, { recursive: true });

  const result = module.prepareStartProductionRuntimeConfig({
    baseEnv: { HOME: path.join(fixtureRoot, 'home') },
    settings: module.parseStartProductionArgs([
      '--deployment-mode',
      'server',
      '--config-file',
      configFile,
    ]),
    platform: 'linux',
    write: true,
  });

  assert.equal(result.action, 'created');
  assert.equal(result.deploymentMode, 'server');
  assert.equal(result.databaseEngine, 'postgresql');
  assert.equal(result.databaseUrl, defaultProdPostgresUrlWithoutPassword);
  assert.equal(result.env.SDKWORK_CLAW_CONFIG_FILE, configFile);
  assert.equal(result.env.SDKWORK_CLAW_DEPLOYMENT_MODE, 'server');
  assert.equal(
    slashPath(result.dataDirectory),
    slashPath(path.join(fixtureRoot, 'etc', 'Data')),
  );
  assert.equal(
    slashPath(result.sqlitePath),
    slashPath(path.join(fixtureRoot, 'etc', 'Data', 'clawrouter.sqlite')),
  );
  assert.equal(result.blockingIssue.code, 'database_configuration_required');
  assert.ok(result.blockingIssue.message.includes('default placeholder PostgreSQL host or password'));
  assert.equal(existsSync(configFile), true);

  const content = readFileSync(configFile, 'utf8');
  assert.ok(content.includes('engine = "postgresql"'));
  assert.ok(content.includes('host = "db.example.com"'));
  assert.ok(content.includes(`database = "${defaultProdPostgresDatabase}"`));
  assert.ok(content.includes(`username = "${defaultProdPostgresUsername}"`));
  assert.ok(content.includes(`password_file = "${slashPath(path.join(fixtureRoot, 'etc', 'database.secret'))}"`));
  assert.ok(content.includes('# password = "change-me"'));
  assert.ok(content.includes('ssl_mode = "require"'));
  assert.ok(content.includes('max_connections = 16'));
  assert.ok(content.includes(`data_directory = "${slashPath(path.join(fixtureRoot, 'etc', 'Data'))}"`));
  assert.ok(content.includes('[redis]'));
  assert.ok(content.includes('enabled = true'));
  assert.ok(content.includes('host = "redis.example.com"'));
  rmSync(fixtureRoot, { recursive: true, force: true });
});

test('production starter blocks placeholder PostgreSQL password files', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'start-claw-router-production.mjs')).href
  );
  const fixtureRoot = path.join(workspaceRoot, 'target', 'start-production-config-tests', `server-password-file-${Date.now()}`);
  const configFile = path.join(fixtureRoot, 'etc', 'clawrouter.toml');
  const passwordFile = path.join(fixtureRoot, 'etc', 'database.secret');
  rmSync(fixtureRoot, { recursive: true, force: true });
  mkdirSync(path.dirname(configFile), { recursive: true });
  writeFileSync(passwordFile, 'change-me\n', 'utf8');
  writeFileSync(configFile, [
    '[database]',
    'engine = "postgresql"',
    'host = "db.internal"',
    'port = 5432',
    'database = "sdkwork_claw_router"',
    'username = "sdkwork_claw_router"',
    `password_file = "${slashPath(passwordFile)}"`,
    'ssl_mode = "require"',
    'max_connections = 16',
    '',
    '[paths]',
    `data_directory = "${slashPath(path.join(fixtureRoot, 'data'))}"`,
    '',
    '[runtime]',
    'deployment_mode = "server"',
    '',
  ].join('\n'), 'utf8');

  const result = module.prepareStartProductionRuntimeConfig({
    baseEnv: { HOME: path.join(fixtureRoot, 'home') },
    settings: module.parseStartProductionArgs([
      '--deployment-mode',
      'server',
      '--config-file',
      configFile,
    ]),
    platform: 'linux',
    write: false,
  });

  assert.equal(result.action, 'existing');
  assert.equal(result.databaseEngine, 'postgresql');
  assert.equal(result.blockingIssue.code, 'database_configuration_required');
  assert.ok(result.blockingIssue.message.includes('default placeholder PostgreSQL host or password'));
  rmSync(fixtureRoot, { recursive: true, force: true });
});

test('production starter expands password_file environment variables', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'start-claw-router-production.mjs')).href
  );
  const fixtureRoot = path.join(workspaceRoot, 'target', 'start-production-config-tests', `server-password-env-${Date.now()}`);
  const configFile = path.join(fixtureRoot, 'etc', 'clawrouter.toml');
  const secretRoot = path.join(fixtureRoot, 'secrets');
  const passwordFile = path.join(secretRoot, 'database.secret');
  rmSync(fixtureRoot, { recursive: true, force: true });
  mkdirSync(secretRoot, { recursive: true });
  mkdirSync(path.dirname(configFile), { recursive: true });
  writeFileSync(passwordFile, 'real-password\n', 'utf8');
  writeFileSync(configFile, [
    '[database]',
    'engine = "postgresql"',
    'host = "db.internal"',
    'port = 5432',
    'database = "sdkwork_claw_router"',
    'username = "sdkwork_claw_router"',
    'password_file = "${SDKWORK_CLAW_TEST_SECRET_ROOT}/database.secret"',
    'ssl_mode = "require"',
    'max_connections = 16',
    '',
    '[paths]',
    `data_directory = "${slashPath(path.join(fixtureRoot, 'data'))}"`,
    '',
    '[runtime]',
    'deployment_mode = "server"',
    '',
  ].join('\n'), 'utf8');

  const result = module.prepareStartProductionRuntimeConfig({
    baseEnv: {
      HOME: path.join(fixtureRoot, 'home'),
      SDKWORK_CLAW_TEST_SECRET_ROOT: secretRoot,
    },
    settings: module.parseStartProductionArgs([
      '--deployment-mode',
      'server',
      '--config-file',
      configFile,
    ]),
    platform: 'linux',
    write: false,
  });

  assert.equal(result.action, 'existing');
  assert.equal(result.databaseEngine, 'postgresql');
  assert.equal(result.databaseUrl, 'postgresql://sdkwork_claw_router:real-password@db.internal:5432/sdkwork_claw_router?sslmode=require');
  assert.equal(result.blockingIssue, null);
  rmSync(fixtureRoot, { recursive: true, force: true });
});

test('production starter help documents automatic runtime config initialization', async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    path.join(workspaceRoot, 'scripts', 'start-claw-router-production.mjs'),
    '--help',
  ], {
    cwd: workspaceRoot,
    maxBuffer: 1024 * 1024,
  });

  assert.ok(stdout.includes('Runtime config initialization:'));
  assert.ok(stdout.includes('Missing runtime TOML files are created automatically before startup.'));
  assert.ok(stdout.includes('Server deployments use external PostgreSQL by default.'));
  assert.ok(stdout.includes('Configure PostgreSQL in clawrouter.toml with host, database, username,'));
  assert.ok(stdout.includes('Desktop deployments default to SQLite and can start from the generated config.'));
  assert.ok(stdout.includes('pnpm start -- --init-config-only --deployment-mode server'));
  assert.ok(stdout.includes(`SDKWORK_CLAW_DATABASE_URL="${productionPostgresDsnExample}"`));
  assert.ok(stdout.includes('Linux server: /etc/sdkwork/router/clawrouter.toml'));
  assert.ok(stdout.includes('Linux desktop: ~/.sdkwork/router/config/clawrouter.toml'));
  assert.ok(stdout.includes('Windows server: %ProgramData%/sdkwork/router/clawrouter.toml'));
  assert.ok(stdout.includes('Windows desktop: %USERPROFILE%/.sdkwork/router/config/clawrouter.toml'));
  assert.ok(stdout.includes('macOS server: /Library/Application Support/sdkwork/router/clawrouter.toml'));
  assert.ok(stdout.includes('macOS desktop: ~/.sdkwork/router/config/clawrouter.toml'));
});

test('production build creates portal assets and Rust edge release artifact', async () => {
  const rootPackage = JSON.parse(
    readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'),
  );
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'build-claw-router-production.mjs')).href
  );

  assert.equal(rootPackage.scripts.build, 'node scripts/build-claw-router-production.mjs');
  assert.deepEqual(module.parseProductionBuildArgs(['--dry-run']), {
    help: false,
    dryRun: true,
  });
  const plan = module.createProductionBuildPlan(
    { help: false, dryRun: false },
    { CARGO_TARGET_DIR: 'target-codex' },
    'win32',
    workspaceRoot,
  );

  assert.deepEqual(plan.map((step) => step.label), [
    'gateway OpenAPI schema generation',
    'app SDK runtime build',
    'backend SDK runtime build',
    'open SDK runtime build',
    'portal production assets',
    'SDK archive artifacts',
    'Rust edge release binary',
  ]);
  assert.equal(plan[0].command, 'python');
  assert.deepEqual(plan[0].args, ['-B', '-m', 'tools.clawrouter_gateway_openapi_generator']);
  assert.deepEqual(plan[1].args, ['--dir', 'sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi', 'build']);
  assert.deepEqual(plan[2].args, ['--dir', 'sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi', 'build']);
  assert.deepEqual(plan[3].args, ['--dir', 'sdks/clawrouter-open-sdk/clawrouter-open-sdk-typescript/generated/server-openapi', 'build']);
  assert.equal(plan[1].attempts, 2);
  assert.equal(plan[2].attempts, 2);
  assert.equal(plan[3].attempts, 2);
  assert.deepEqual(plan[4].args, ['--dir', 'apps/sdkwork-clawrouter-pc', 'build']);
  assert.deepEqual(plan[5].args, ['scripts/archive-claw-router-sdks.mjs']);
  assert.equal(plan[5].command, 'node');
  assert.deepEqual(plan[6].args, ['build', '-p', 'sdkwork-clawrouter-cloud-gateway', '--bin', 'clawrouter', '--release']);
  assert.equal(plan[6].command, 'cargo.exe');
  assert.equal(plan[6].env.CARGO_TARGET_DIR, 'target-codex');
  assert.ok(
    module.renderProductionBuildPlan(plan, { CARGO_TARGET_DIR: 'target-codex' }, 'win32', workspaceRoot)
      .some((line) => line.includes('target-codex') && line.includes('clawrouter.exe')),
  );
  assert.ok(
    module.renderProductionBuildPlan(plan, { CARGO_TARGET_DIR: 'target-codex' }, 'win32', workspaceRoot)
      .some((line) => line.includes('dist') && line.includes('sdk-archives')),
  );
  const buildProductionSource = readFileSync(
    path.join(workspaceRoot, 'scripts', 'build-claw-router-production.mjs'),
    'utf8',
  );
  assert.match(buildProductionSource, /attempt \${attempt}\/\${attempts}/);
  assert.match(buildProductionSource, /retrying once to recover from transient toolchain process exits/);
});

test('install package planner covers platforms, architectures, modes, fast init, and security defaults', async () => {
  const rootPackage = JSON.parse(
    readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'),
  );
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'plan-claw-router-install-packages.mjs')).href
  );

  assert.equal(
    rootPackage.scripts['install:packages:plan'],
    'node scripts/plan-claw-router-install-packages.mjs',
  );
  assert.equal(
    rootPackage.scripts['install:packages:check'],
    'node scripts/plan-claw-router-install-packages.mjs --check',
  );
  assert.deepEqual(module.SUPPORTED_PLATFORMS, ['windows', 'linux', 'macos']);
  assert.deepEqual(module.SUPPORTED_ARCHITECTURES, ['x64', 'arm64']);
  assert.deepEqual(module.SUPPORTED_DEPLOYMENT_MODES, ['archive', 'service', 'container', 'desktop']);
  assert.equal(module.DEFAULT_VERSION, '0.3.0');

  const defaultPlan = module.createInstallPackagePlan();
  assert.equal(defaultPlan.version, '0.3.0');
  assert.equal(
    defaultPlan.packages.find((item) => item.id === 'linux-x64-archive')?.archiveName,
    'clawrouter-linux-x64-archive-0.3.0.tar.gz',
  );

  const plan = module.createInstallPackagePlan({
    version: '0.1.0',
    platforms: ['windows', 'linux', 'macos'],
    architectures: ['x64', 'arm64'],
    deploymentModes: ['archive', 'service', 'container', 'desktop'],
  });

  assert.equal(plan.schemaVersion, '2026-05-15.install-packages.v2');
  assert.equal(plan.product, 'sdkwork-clawrouter');
  assert.equal(plan.packageName, 'clawrouter');
  assert.equal(plan.runtimeName, 'clawrouter');
  assert.equal(plan.displayName, 'SdkWork ClawRouter');
  assert.deepEqual(plan.platforms, ['windows', 'linux', 'macos']);
  assert.deepEqual(plan.architectures, ['x64', 'arm64']);
  assert.deepEqual(plan.deploymentModes, ['archive', 'service', 'container', 'desktop']);
  assert.equal(plan.packages.length, 24);
  assert.equal(plan.artifactPolicy.noSecretsInPackage, true);
  assert.equal(plan.artifactPolicy.envLocalGeneratedOnHost, true);
  assert.equal(plan.artifactPolicy.envExampleReferenceOnly, true);
  assert.equal(plan.artifactPolicy.releaseEnvLocalExcluded, true);
  assert.ok(plan.fastInitializationContract.includes('host-env-prepare'));
  assert.ok(!plan.fastInitializationContract.includes('release-env-check'));
  assert.ok(!plan.fastInitializationContract.includes('release-env-write'));
  assert.ok(plan.fastInitializationContract.includes('database-ensure'));
  assert.ok(plan.fastInitializationContract.includes('catalog-refresh'));
  assert.ok(plan.fastInitializationContract.includes('edge-readiness'));

  const windowsService = plan.packages.find((item) =>
    item.platform === 'windows' && item.architecture === 'x64' && item.deploymentMode === 'service'
  );
  assert.ok(windowsService);
  assert.equal(windowsService.id, 'windows-x64-service');
  assert.equal(windowsService.artifactId, 'windows-x64-server');
  assert.equal(windowsService.version, '0.1.0');
  assert.equal(windowsService.archiveName, 'clawrouter-windows-x64-server-0.1.0.zip');
  assert.equal(windowsService.binaryName, 'clawrouter.exe');
  assert.equal(windowsService.installerBinaryName, 'clawrouterctl.exe');
  assert.deepEqual(windowsService.serviceIntegration, {
    kind: 'windows-service',
    manifest: 'service/windows/clawrouter.xml',
  });
  assert.ok(windowsService.artifacts.some((artifact) =>
    artifact.kind === 'edge-binary' && artifact.path === 'bin/clawrouter.exe'
  ));
  assert.ok(windowsService.artifacts.some((artifact) =>
    artifact.kind === 'installer-binary' && artifact.path === 'bin/clawrouterctl.exe'
  ));
  assert.ok(windowsService.artifacts.some((artifact) =>
    artifact.kind === 'portal-dist' && artifact.path === 'portal/dist'
  ));
  assert.ok(windowsService.artifacts.some((artifact) =>
    artifact.kind === 'sdk-archives' && artifact.path === 'portal/dist/sdk-archives'
  ));
  assert.ok(windowsService.artifacts.some((artifact) =>
    artifact.kind === 'env-template' && artifact.path === '.env.release.example'
  ));
  assert.ok(!windowsService.artifacts.some((artifact) => artifact.path === '.env.release'));
  assert.equal(windowsService.initCommands.length, 2);
  assert.ok(!windowsService.initCommands.some((command) => command.includes('pnpm')));
  assert.ok(windowsService.initCommands.includes('.\\bin\\clawrouterctl.exe ensure'));
  assert.ok(windowsService.initCommands.includes('.\\bin\\clawrouterctl.exe refresh-catalog --force'));
  assert.equal(windowsService.startCommand, '.\\bin\\clawrouter.exe');
  assert.deepEqual(windowsService.healthChecks, ['/healthz', '/readyz']);
  assert.equal(windowsService.runtimeProfile, 'server');
  assert.equal(windowsService.databasePolicy.defaultEngine, 'postgresql');
  assert.equal(windowsService.databasePolicy.configurableFromFile, true);
  assert.equal(windowsService.databasePolicy.requiresExternalDatabase, true);
  assert.equal(windowsService.databasePolicy.configFile.path, '%ProgramData%/sdkwork/router/clawrouter.toml');
  assert.equal(windowsService.databasePolicy.envOverrides.includes('SDKWORK_CLAW_DATABASE_URL'), true);
  assert.equal(windowsService.databasePolicy.defaultHost, 'db.example.com');
  assert.equal(windowsService.databasePolicy.defaultDatabase, defaultProdPostgresDatabase);
  assert.equal(windowsService.databasePolicy.defaultUsername, defaultProdPostgresUsername);
  assert.equal(windowsService.databasePolicy.passwordFile.path, '%ProgramData%/sdkwork/router/database.secret');
  assert.equal(windowsService.redisPolicy.configSection, 'redis');
  assert.equal(windowsService.redisPolicy.enabledByDefault, true);
  assert.equal(windowsService.redisPolicy.required, true);
  assert.equal(windowsService.redisPolicy.runtimeRequired, true);
  assert.equal(windowsService.redisPolicy.requiredWhenEnabled.includes('host'), true);
  assert.equal(windowsService.redisPolicy.requiredWhenEnabled.includes('port'), true);
  assert.equal(windowsService.redisPolicy.requiredWhenEnabled.includes('database'), true);
  assert.equal(windowsService.redisPolicy.defaultHost, 'redis.example.com');
  assert.equal(windowsService.redisPolicy.defaultPort, 6379);
  assert.equal(windowsService.redisPolicy.defaultDatabase, 0);
  assert.equal(windowsService.redisPolicy.urlOverrideExample, 'redis://redis.example.com:6379/0');
  assert.equal(windowsService.redisPolicy.passwordFile.path, '%ProgramData%/sdkwork/router/redis.secret');
  assert.equal(windowsService.redisPolicy.envOverrides.includes('SDKWORK_CLAW_REDIS_HOST'), true);
  assert.equal(windowsService.redisPolicy.envOverrides.includes('SDKWORK_CLAW_REDIS_PORT'), true);
  assert.equal(windowsService.redisPolicy.envOverrides.includes('SDKWORK_CLAW_REDIS_DATABASE'), true);
  assert.equal(windowsService.redisPolicy.envOverrides.includes('SDKWORK_CLAW_REDIS_URL'), true);
  assert.equal(windowsService.redisPolicy.envOverrides.includes('SDKWORK_CLAW_REDIS_KEY_PREFIX'), true);
  assert.equal(windowsService.redisPolicy.envOverrides.includes('SDKWORK_CLAW_REDIS_TLS'), true);
  assert.equal(windowsService.redisPolicy.envOverrides.includes('SDKWORK_CLAW_REDIS_MAX_CONNECTIONS'), true);
  assert.equal(windowsService.redisPolicy.envOverrides.includes('SDKWORK_CLAW_REDIS_CONNECT_TIMEOUT_MILLIS'), true);
  assert.equal(windowsService.redisPolicy.envOverrides.includes('SDKWORK_CLAW_REDIS_COMMAND_TIMEOUT_MILLIS'), true);
  assert.equal(windowsService.redisPolicy.envOverrides.includes('SDKWORK_CLAW_REDIS_POOL_IDLE_TIMEOUT_SECONDS'), true);
  assert.equal(windowsService.redisPolicy.keyPrefix, 'clawrouter');
  assert.equal(windowsService.redisPolicy.maxConnections, 16);
  assert.equal(windowsService.redisPolicy.connectTimeoutMs, 2000);
  assert.equal(windowsService.redisPolicy.commandTimeoutMs, 1000);
  assert.ok(windowsService.artifacts.some((artifact) =>
    artifact.kind === 'runtime-config-template' && artifact.path === 'config/clawrouter.toml.example'
  ));
  assert.ok(windowsService.artifacts.some((artifact) =>
    artifact.kind === 'install-guide' && artifact.path === 'INSTALL.md'
  ));
  assert.equal(windowsService.security.noSecretsInPackage, true);
  assert.equal(windowsService.security.trustForwardedHeadersDefault, false);

  const linuxContainer = plan.packages.find((item) =>
    item.platform === 'linux' && item.architecture === 'arm64' && item.deploymentMode === 'container'
  );
  assert.ok(linuxContainer);
  assert.equal(linuxContainer.databasePolicy.defaultEngine, 'postgresql');
  assert.equal(linuxContainer.databasePolicy.requiresExternalDatabase, true);
  assert.equal(linuxContainer.databasePolicy.passwordFile.path, '/run/secrets/sdkwork/router/postgres-password');
  assert.equal(linuxContainer.redisPolicy.passwordFile.path, '/run/secrets/sdkwork/router/redis-password');
  assert.equal(linuxContainer.redisPolicy.enabledByDefault, true);
  assert.equal(linuxContainer.redisPolicy.required, true);
  assert.equal(linuxContainer.redisPolicy.runtimeRequired, true);
  assert.equal(linuxContainer.containerIntegration.kind, 'container-image');
  assert.equal(linuxContainer.containerIntegration.entrypoint, '/opt/sdkwork/router/bin/clawrouter');
  for (const packageItem of plan.packages.filter((item) => item.deploymentMode === 'container')) {
    assert.equal(
      packageItem.startCommand,
      packageItem.containerIntegration.entrypoint,
      `${packageItem.id} must use one canonical container entrypoint`,
    );
  }
  assert.ok(linuxContainer.initCommands.includes('./bin/clawrouterctl ensure'));
  assert.ok(!linuxContainer.initCommands.some((command) => command.includes('pnpm')));
  assert.ok(!linuxContainer.initCommands.some((command) => command.includes('pnpm dev')));
  assert.ok(!plan.packages.some((item) =>
    item.initCommands.some((command) => command.includes('smoke:dev') || command.includes('pnpm'))
  ));

  const windowsContainer = plan.packages.find((item) =>
    item.platform === 'windows' && item.architecture === 'x64' && item.deploymentMode === 'container'
  );
  assert.ok(windowsContainer);
  assert.equal(windowsContainer.containerIntegration.entrypoint, 'C:/sdkwork/router/bin/clawrouter.exe');
  assert.equal(windowsContainer.containerIntegration.workingDirectory, 'C:/sdkwork/router');
  assert.equal(windowsContainer.startCommand, windowsContainer.containerIntegration.entrypoint);
  assert.ok(windowsContainer.artifacts.some((artifact) =>
    artifact.kind === 'container-entrypoint' && artifact.path === 'container/entrypoint.ps1'
  ));

  const linuxArchive = plan.packages.find((item) =>
    item.platform === 'linux' && item.architecture === 'x64' && item.deploymentMode === 'archive'
  );
  assert.ok(linuxArchive);
  assert.equal(linuxArchive.runtimeProfile, 'server');
  assert.equal(linuxArchive.databasePolicy.defaultEngine, 'postgresql');
  assert.equal(linuxArchive.databasePolicy.requiresExternalDatabase, true);
  assert.equal(linuxArchive.databasePolicy.configFile.path, '/etc/sdkwork/router/clawrouter.toml');
  assert.equal(linuxArchive.databasePolicy.dataDirectory.path, '/var/lib/sdkwork/router');
  assert.equal(linuxArchive.databasePolicy.defaultHost, 'db.example.com');
  assert.equal(linuxArchive.databasePolicy.defaultPort, 5432);
  assert.equal(linuxArchive.databasePolicy.defaultDatabase, defaultProdPostgresDatabase);
  assert.equal(linuxArchive.databasePolicy.defaultUsername, defaultProdPostgresUsername);
  assert.equal(linuxArchive.databasePolicy.passwordFile.path, '/etc/sdkwork/router/database.secret');

  const macosDesktop = plan.packages.find((item) =>
    item.platform === 'macos' && item.architecture === 'arm64' && item.deploymentMode === 'desktop'
  );
  assert.ok(macosDesktop);
  assert.equal(macosDesktop.id, 'macos-arm64-desktop');
  assert.equal(macosDesktop.runtimeProfile, 'desktop');
  assert.equal(macosDesktop.packageKind, 'desktop-app-installer');
  assert.equal(macosDesktop.databasePolicy.defaultEngine, 'sqlite');
  assert.equal(macosDesktop.databasePolicy.requiresExternalDatabase, false);
  assert.equal(macosDesktop.databasePolicy.configFile.path, '~/.sdkwork/router/config/clawrouter.toml');
  assert.equal(macosDesktop.databasePolicy.dataDirectory.path, '~/.sdkwork/router/data');
  assert.equal(macosDesktop.databasePolicy.defaultSqlitePath, '~/.sdkwork/router/data/clawrouter.sqlite');
  assert.equal(macosDesktop.databasePolicy.defaultUrl, 'sqlite://~/.sdkwork/router/data/clawrouter.sqlite');
  assert.equal(macosDesktop.redisPolicy.enabledByDefault, false);
  assert.equal(macosDesktop.redisPolicy.required, false);
  assert.equal(macosDesktop.redisPolicy.passwordFile.path, '~/.sdkwork/router/data/redis.secret');
  assert.ok(macosDesktop.artifacts.some((artifact) =>
    artifact.kind === 'desktop-manifest' && artifact.path === 'desktop'
  ));

  const linuxDesktop = plan.packages.find((item) =>
    item.platform === 'linux' && item.architecture === 'x64' && item.deploymentMode === 'desktop'
  );
  assert.ok(linuxDesktop);
  assert.equal(linuxDesktop.databasePolicy.configFile.path, '~/.sdkwork/router/config/clawrouter.toml');
  assert.equal(linuxDesktop.databasePolicy.defaultSqlitePath, '~/.sdkwork/router/data/clawrouter.sqlite');

  assert.deepEqual(module.validateInstallPackagePlan(plan), []);
  const rendered = module.renderInstallPackagePlan(plan).join('\n');
  assert.ok(rendered.includes('[install-packages] supported platforms: windows, linux, macos'));
  assert.ok(rendered.includes('[install-packages] packages: 24'));
  assert.ok(rendered.includes('windows-x64-service'));
  assert.ok(rendered.includes('macos-arm64-desktop'));
  assert.ok(rendered.includes('database=sqlite'));
  assert.ok(!rendered.includes('secret'));
  assert.ok(!rendered.includes('.env.release'));
});

test('install package archive builder creates manifest-backed archives without local release secrets', async () => {
  const rootPackage = JSON.parse(
    readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'),
  );
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'build-claw-router-install-package.mjs')).href
  );

  assert.equal(
    rootPackage.scripts['install:package:build'],
    'node scripts/build-claw-router-install-package.mjs',
  );
  assert.equal(
    rootPackage.scripts['install:package:check'],
    'node scripts/build-claw-router-install-package.mjs --check --dry-run --all',
  );
  assert.deepEqual(module.parseInstallPackageBuildArgs(['--package-id', 'windows-x64-archive', '--check']), {
    all: false,
    check: true,
    dryRun: false,
    help: false,
    json: false,
    outputDir: null,
    packageId: 'windows-x64-archive',
    stagingRoot: null,
    version: '0.3.0',
  });
  assert.deepEqual(module.parseInstallPackageBuildArgs(['--all', '--check', '--dry-run']), {
    all: true,
    check: true,
    dryRun: true,
    help: false,
    json: false,
    outputDir: null,
    packageId: 'windows-x64-archive',
    stagingRoot: null,
    version: '0.3.0',
  });

  const fixtureRoot = path.join(workspaceRoot, '.tmp', 'install-package-builder-test');
  const stagingRoot = path.join(fixtureRoot, 'staging');
  const outputDir = path.join(fixtureRoot, 'out');
  rmSync(fixtureRoot, { recursive: true, force: true });
  mkdirSync(path.join(stagingRoot, 'bin'), { recursive: true });
  mkdirSync(path.join(stagingRoot, 'portal', 'dist', 'sdk-archives'), { recursive: true });
  writeFileSync(path.join(stagingRoot, 'bin', 'clawrouter.exe'), 'gateway-binary');
  writeFileSync(path.join(stagingRoot, 'bin', 'clawrouterctl.exe'), 'installer-binary');
  writeFileSync(path.join(stagingRoot, 'portal', 'dist', 'index.html'), '<!doctype html>');
  writeFileSync(path.join(stagingRoot, 'portal', 'dist', 'sdk-archives', 'sdk.zip'), 'sdk-archive');
  writeFileSync(path.join(stagingRoot, '.env.release.example'), 'PORTAL_PUBLIC_API_BASE_URL=/v1\n');
  writeFileSync(path.join(stagingRoot, '.env.release'), 'SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL=postgres://secret\n');

  try {
    const buildPlan = module.createInstallPackageBuildPlan({
      packageId: 'windows-x64-archive',
      stagingRoot,
      outputDir,
      version: '0.1.0',
    });
    assert.equal(buildPlan.package.id, 'windows-x64-archive');
    assert.equal(buildPlan.archivePath, path.join(outputDir, 'clawrouter-windows-x64-archive-0.1.0.zip'));
    assert.ok(buildPlan.entries.some((entry) => entry.archivePath === 'bin/clawrouter.exe'));
    assert.ok(buildPlan.entries.some((entry) => entry.archivePath === 'portal/dist/index.html'));
    assert.ok(buildPlan.entries.some((entry) => entry.archivePath === '.env.release.example'));
    assert.ok(buildPlan.entries.some((entry) => entry.archivePath === 'config/clawrouter.toml.example'));
    assert.ok(buildPlan.entries.some((entry) => entry.archivePath === 'INSTALL.md'));
    assert.ok(buildPlan.entries.some((entry) => entry.archivePath === 'install-manifest.json'));
    assert.ok(!buildPlan.entries.some((entry) => entry.archivePath === '.env.release'));
    assert.deepEqual(module.validateInstallPackageBuildPlan(buildPlan), []);

    const result = await module.buildInstallPackageArchive(buildPlan);
    assert.equal(result.archive.file, 'clawrouter-windows-x64-archive-0.1.0.zip');
    assert.equal(result.archive.version, '0.1.0');
    assert.equal(result.manifest.package.id, 'windows-x64-archive');
    assert.equal(result.manifest.package.version, '0.1.0');
    assert.equal(result.manifest.package.runtimeProfile, 'server');
    assert.equal(result.manifest.databasePolicy.defaultEngine, 'postgresql');
    assert.equal(
      result.manifest.installConfiguration.schemaVersion,
      '2026-05-16.install-configuration.v1',
    );
    assert.equal(result.manifest.installConfiguration.files.runtimeConfig, '%ProgramData%/sdkwork/router/clawrouter.toml');
    assert.equal(result.manifest.installConfiguration.files.passwordFile, '%ProgramData%/sdkwork/router/database.secret');
    assert.equal(result.manifest.installConfiguration.files.redisPasswordFile, '%ProgramData%/sdkwork/router/redis.secret');
    assert.equal(result.manifest.installConfiguration.database.engine, 'postgresql');
    assert.equal(result.manifest.installConfiguration.database.externalRequired, true);
    assert.ok(result.manifest.installConfiguration.database.requiredFields.includes('password_file or password'));
    assert.equal(result.manifest.installConfiguration.redis.configSection, 'redis');
    assert.equal(result.manifest.installConfiguration.redis.enabledByDefault, true);
    assert.equal(result.manifest.installConfiguration.redis.required, true);
    assert.equal(result.manifest.installConfiguration.redis.runtimeRequired, true);
    assert.deepEqual(result.manifest.installConfiguration.redis.requiredFieldsWhenEnabled, ['host', 'port', 'database']);
    assert.deepEqual(result.manifest.installConfiguration.redis.secretFields, ['password_file', 'password']);
    assert.equal(result.manifest.installConfiguration.redis.host, 'redis.example.com');
    assert.equal(result.manifest.installConfiguration.redis.port, 6379);
    assert.equal(result.manifest.installConfiguration.redis.database, 0);
    assert.equal(result.manifest.installConfiguration.redis.urlOverrideExample, 'redis://redis.example.com:6379/0');
    assert.equal(result.manifest.installConfiguration.redis.passwordFile, '%ProgramData%/sdkwork/router/redis.secret');
    assert.equal(result.manifest.installConfiguration.redis.keyPrefix, 'clawrouter');
    assert.equal(result.manifest.installConfiguration.redis.tls, false);
    assert.equal(result.manifest.installConfiguration.redis.maxConnections, 16);
    assert.equal(result.manifest.installConfiguration.redis.connectTimeoutMs, 2000);
    assert.equal(result.manifest.installConfiguration.redis.commandTimeoutMs, 1000);
    assert.equal(result.manifest.installConfiguration.redis.poolIdleTimeoutSeconds, 60);
    assert.equal(result.manifest.installConfiguration.edge.configSection, 'edge');
    assert.equal(result.manifest.installConfiguration.edge.enabledByDefault, true);
    assert.equal(result.manifest.installConfiguration.edge.upstreamRequestTimeoutMillis, 30000);
    assert.equal(result.manifest.installConfiguration.edge.upstreamReadyTimeoutMillis, 2000);
    assert.equal(result.manifest.installConfiguration.providerRelay.runtime.responseTimeoutMillis, 120000);
    assert.equal(result.manifest.installConfiguration.providerRelay.runtime.healthProbeTimeoutMillis, 10000);
    assert.equal(result.manifest.installConfiguration.providerRelay.retry.maxAttempts, 2);
    assert.deepEqual(result.manifest.installConfiguration.providerRelay.retry.retryableStatusCodes, [429, 500, 502, 503, 504]);
    assert.equal(result.manifest.installConfiguration.providerRelay.retry.backoffMillis, 0);
    assert.equal(result.manifest.installConfiguration.portal.staticConfigSection, 'portal.static');
    assert.equal(result.manifest.installConfiguration.portal.htmlCacheControl, 'no-store');
    assert.equal(result.manifest.installConfiguration.portal.assetCacheControl, 'public, max-age=31536000, immutable');
    assert.equal(result.manifest.installConfiguration.portal.toolApiMaxBodyBytes, 1048576);
    assert.ok(result.manifest.installConfiguration.nextSteps.some((step) =>
      step.includes('clawrouter.toml')
    ));
    assert.ok(result.manifest.installConfiguration.nextSteps.some((step) =>
      step.includes('password_file')
    ));
    assert.ok(result.manifest.installConfiguration.nextSteps.some((step) =>
      step.includes('[redis].enabled')
    ));
    assert.equal(result.manifest.generatedArtifacts.some((artifact) =>
      artifact.path === 'config/clawrouter.toml.example'
    ), true);
    assert.equal(result.manifest.generatedArtifacts.some((artifact) =>
      artifact.path === 'INSTALL.md'
    ), true);
    assert.equal(result.manifest.security.noSecretsInPackage, true);
    assert.equal(result.manifest.artifacts.some((artifact) => artifact.path === '.env.release'), false);
    assert.ok(result.archive.size > 0);
    assert.match(result.archive.sha256, /^[a-f0-9]{64}$/u);
    assert.ok(existsSync(result.archivePath));
    assert.ok(existsSync(result.manifestPath));
    assert.ok(existsSync(path.join(outputDir, 'install-packages-manifest.json')));

    const aggregateManifest = JSON.parse(readFileSync(path.join(outputDir, 'install-packages-manifest.json'), 'utf8'));
    assert.equal(aggregateManifest.archives.length, 1);
    assert.equal(aggregateManifest.archives[0].file, 'clawrouter-windows-x64-archive-0.1.0.zip');
    assert.equal(aggregateManifest.archives[0].packageId, 'windows-x64-archive');
    assert.equal(aggregateManifest.archives[0].version, '0.1.0');
    assert.match(aggregateManifest.archives[0].sha256, /^[a-f0-9]{64}$/u);

    const rendered = module.renderInstallPackageBuildPlan(buildPlan).join('\n');
    assert.ok(rendered.includes('[install-package-build] package: windows-x64-archive'));
    assert.ok(!/\]   \.env\.release$/m.test(rendered));
    assert.ok(!rendered.includes('secret'));
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('install package manifests distinguish schema version dates from generation timestamps', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'build-claw-router-install-package.mjs')).href
  );

  const explicitGeneratedAt = module.resolveManifestGeneratedAt({
    env: { SDKWORK_CLAW_RELEASE_GENERATED_AT: '2026-05-16T08:05:57Z' },
  });
  assert.equal(explicitGeneratedAt, '2026-05-16T08:05:57.000Z');
  assert.equal(
    module.resolveManifestGeneratedAt({ env: { SOURCE_DATE_EPOCH: '1710000000' } }),
    new Date(1710000000 * 1000).toISOString(),
  );
  assert.throws(
    () => module.resolveManifestGeneratedAt({ env: { SOURCE_DATE_EPOCH: 'not-a-number' } }),
    /SOURCE_DATE_EPOCH/u,
  );

  const packageItem = {
    id: 'linux-x64-service',
    version: '0.3.0',
    platform: 'linux',
    architecture: 'x64',
    deploymentMode: 'service',
    runtimeProfile: 'server',
    artifactId: 'linux-x64-server',
    archiveName: 'clawrouter-linux-x64-server-0.3.0.tar.gz',
    binaryName: 'clawrouter',
    installerBinaryName: 'clawrouterctl',
    startCommand: './bin/clawrouter',
    healthChecks: ['/healthz', '/readyz'],
    initCommands: ['./bin/clawrouterctl ensure'],
    databasePolicy: {
      configFile: { path: '/etc/sdkwork/router/clawrouter.toml' },
      dataDirectory: { path: '/var/lib/sdkwork/router' },
    },
    security: { noSecretsInPackage: true },
  };
  const buildPlan = {
    package: packageItem,
    aggregateManifestPath: path.join(workspaceRoot, '.tmp', 'missing-install-packages-manifest.json'),
  };
  const manifest = module.createPackageManifest(buildPlan, [], [], { generatedAt: explicitGeneratedAt });
  const aggregate = module.createAggregateManifest(
    buildPlan,
    {
      file: 'clawrouter-linux-x64-server-0.3.0.deb',
      packageId: packageItem.id,
      version: packageItem.version,
      size: 1,
      sha256: 'a'.repeat(64),
    },
    { generatedAt: explicitGeneratedAt },
  );

  assert.equal(manifest.schemaVersion, '2026-05-15.install-manifest.v1');
  assert.equal(aggregate.schemaVersion, '2026-05-15.install-packages-manifest.v1');
  assert.equal(manifest.generatedAt, explicitGeneratedAt);
  assert.equal(aggregate.generatedAt, explicitGeneratedAt);
  assert.notEqual(manifest.generatedAt, '2026-05-15T00:00:00.000Z');
});

test('install package builder emits service and container deployment packages from the shared plan', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'build-claw-router-install-package.mjs')).href
  );

  const fixtureRoot = path.join(workspaceRoot, '.tmp', 'install-package-deployment-modes-test');
  const stagingRoot = path.join(fixtureRoot, 'staging');
  const outputDir = path.join(fixtureRoot, 'out');
  rmSync(fixtureRoot, { recursive: true, force: true });
  mkdirSync(path.join(stagingRoot, 'bin'), { recursive: true });
  mkdirSync(path.join(stagingRoot, 'portal', 'dist', 'sdk-archives'), { recursive: true });
  writeFileSync(path.join(stagingRoot, 'bin', 'clawrouter'), 'gateway-binary');
  writeFileSync(path.join(stagingRoot, 'bin', 'clawrouterctl'), 'installer-binary');
  writeFileSync(path.join(stagingRoot, 'portal', 'dist', 'index.html'), '<!doctype html>');
  writeFileSync(path.join(stagingRoot, 'portal', 'dist', 'sdk-archives', 'sdk.zip'), 'sdk-archive');
  writeFileSync(path.join(stagingRoot, '.env.release.example'), 'PORTAL_PUBLIC_API_BASE_URL=/v1\n');

  try {
    const servicePlan = module.createInstallPackageBuildPlan({
      packageId: 'linux-x64-service',
      stagingRoot,
      outputDir,
      version: '0.1.0',
    });
    assert.equal(servicePlan.package.deploymentMode, 'service');
    assert.ok(servicePlan.entries.some((entry) =>
      entry.generated && entry.archivePath === 'service/linux/clawrouter.service'
    ));
    assert.deepEqual(module.validateInstallPackageBuildPlan(servicePlan), []);

    const serviceResult = await module.buildInstallPackageArchive(servicePlan);
    const serviceTar = readTarEntries(gunzipSync(readFileSync(serviceResult.archivePath)));
    assert.ok(serviceTar.has('service/linux/clawrouter.service'));
    assert.ok(serviceTar.has('config/clawrouter.toml.example'));
    assert.ok(serviceTar.has('INSTALL.md'));
    const serviceConfigTemplate = readTarEntryText(
      gunzipSync(readFileSync(serviceResult.archivePath)),
      'config/clawrouter.toml.example',
    );
    assert.ok(serviceConfigTemplate.includes('engine = "postgresql"'));
    assert.ok(serviceConfigTemplate.includes('host = "db.example.com"'));
    assert.ok(serviceConfigTemplate.includes(`database = "${defaultProdPostgresDatabase}"`));
    assert.ok(serviceConfigTemplate.includes(`username = "${defaultProdPostgresUsername}"`));
    assert.ok(serviceConfigTemplate.includes('password_file = "/etc/sdkwork/router/database.secret"'));
    assert.ok(serviceConfigTemplate.includes('[redis]'));
    assert.ok(serviceConfigTemplate.includes('enabled = true'));
    assert.ok(serviceConfigTemplate.includes('host = "redis.example.com"'));
    assert.ok(serviceConfigTemplate.includes('port = 6379'));
    assert.ok(serviceConfigTemplate.includes('database = 0'));
    assert.ok(serviceConfigTemplate.includes('# username = "default"'));
    assert.ok(serviceConfigTemplate.includes('# url = "redis://redis.example.com:6379/0"'));
    assert.ok(serviceConfigTemplate.includes('# password_file = "/etc/sdkwork/router/redis.secret"'));
    assert.ok(serviceConfigTemplate.includes('# password = "change-me"'));
    assert.ok(serviceConfigTemplate.includes('key_prefix = "clawrouter"'));
    assert.ok(serviceConfigTemplate.includes('tls = false'));
    assert.ok(serviceConfigTemplate.includes('connect_timeout_millis = 2000'));
    assert.ok(serviceConfigTemplate.includes('command_timeout_millis = 1000'));
    assert.ok(serviceConfigTemplate.includes('pool_idle_timeout_seconds = 60'));
    assert.ok(serviceConfigTemplate.includes('[observability]'));
    assert.ok(serviceConfigTemplate.includes('log_filter = "info"'));
    assert.ok(serviceConfigTemplate.includes('log_format = "compact"'));
    assert.ok(serviceConfigTemplate.includes('log_ansi = false'));
    assert.ok(serviceConfigTemplate.includes('log_target = true'));
    assert.ok(serviceConfigTemplate.includes('log_thread_names = false'));
    assert.ok(serviceConfigTemplate.includes('log_thread_ids = false'));
    assert.ok(serviceConfigTemplate.includes('[paths]'));
    assert.ok(serviceConfigTemplate.includes('data_directory = "/var/lib/sdkwork/router"'));
    assert.ok(serviceConfigTemplate.includes('[request_limits]'));
    assert.ok(serviceConfigTemplate.includes('admin_app_json_body_max_bytes = 131072'));
    assert.ok(serviceConfigTemplate.includes('admin_skill_json_body_max_bytes = 65536'));
    assert.ok(serviceConfigTemplate.includes('payment_callback_body_max_bytes = 65536'));
    assert.ok(serviceConfigTemplate.includes('gateway_invocation_body_max_bytes = 1048576'));
    assert.ok(serviceConfigTemplate.includes('# models_catalog_root = "/usr/lib/sdkwork/router/catalog"'));
    assert.ok(serviceConfigTemplate.includes('[services.gateway]'));
    assert.ok(serviceConfigTemplate.includes('[services.admin_api]'));
    assert.ok(serviceConfigTemplate.includes('[services.app_api]'));
    assert.ok(serviceConfigTemplate.includes('[server]'));
    assert.ok(serviceConfigTemplate.includes('bind = "0.0.0.0:3900"'));
    assert.ok(serviceConfigTemplate.includes('external_scheme = "http"'));
    assert.ok(serviceConfigTemplate.includes('trust_forwarded_headers = false'));
    assert.ok(serviceConfigTemplate.includes('[edge]'));
    assert.ok(serviceConfigTemplate.includes('gateway_base_url = "http://127.0.0.1:18080"'));
    assert.ok(serviceConfigTemplate.includes('backend_api_base_url = "http://127.0.0.1:18081"'));
    assert.ok(serviceConfigTemplate.includes('app_api_base_url = "http://127.0.0.1:18082"'));
    assert.ok(serviceConfigTemplate.includes('portal_static_dist = "/usr/lib/sdkwork/router/portal/dist"'));
    assert.ok(serviceConfigTemplate.includes('cors_allowed_origins = []'));
    assert.ok(serviceConfigTemplate.includes('upstream_request_timeout_millis = 30000'));
    assert.ok(serviceConfigTemplate.includes('upstream_ready_timeout_millis = 2000'));
    assert.ok(serviceConfigTemplate.includes('[portal.public]'));
    assert.ok(serviceConfigTemplate.includes('api_base_url = "/v1"'));
    assert.ok(serviceConfigTemplate.includes('backend_api_base_url = "/backend/v3/api"'));
    assert.ok(serviceConfigTemplate.includes('tool_api_enabled = false'));
    assert.ok(serviceConfigTemplate.includes('[portal.static]'));
    assert.ok(serviceConfigTemplate.includes('html_cache_control = "no-store"'));
    assert.ok(serviceConfigTemplate.includes('asset_cache_control = "public, max-age=31536000, immutable"'));
    assert.ok(serviceConfigTemplate.includes('[portal.security]'));
    assert.ok(serviceConfigTemplate.includes('hsts_enabled = false'));
    assert.ok(serviceConfigTemplate.includes('hsts_max_age_seconds = 31536000'));
    assert.ok(serviceConfigTemplate.includes('hsts_include_subdomains = true'));
    assert.ok(serviceConfigTemplate.includes('hsts_preload = false'));
    assert.ok(serviceConfigTemplate.includes('csp_frame_src = ["https://player.bilibili.com"]'));
    assert.ok(serviceConfigTemplate.includes('[portal.tools]'));
    assert.ok(serviceConfigTemplate.includes('rate_limit_requests = 120'));
    assert.ok(serviceConfigTemplate.includes('rate_limit_window_seconds = 60'));
    assert.ok(serviceConfigTemplate.includes('max_body_bytes = 1048576'));
    assert.ok(serviceConfigTemplate.includes('sdk_archive_root = "/usr/lib/sdkwork/router/portal/dist/sdk-archives"'));
    assert.ok(serviceConfigTemplate.includes('[security]'));
    assert.ok(serviceConfigTemplate.includes('api_key_pepper_file = "/etc/sdkwork/router/api-key-pepper.secret"'));
    assert.ok(serviceConfigTemplate.includes('trusted_subject_secret_file = "/etc/sdkwork/router/trusted-subject.secret"'));
    assert.ok(serviceConfigTemplate.includes('app_session_secret_file = "/etc/sdkwork/router/app-session.secret"'));
    assert.ok(serviceConfigTemplate.includes('payment_webhook_secret_file = "/etc/sdkwork/router/payment-webhook.secret"'));
    assert.ok(serviceConfigTemplate.includes('[provider_relay.openai]'));
    assert.ok(serviceConfigTemplate.includes('bearer_token_file = "/etc/sdkwork/router/openai-relay.secret"'));
    assert.ok(serviceConfigTemplate.includes('[provider_relay.runtime]'));
    assert.ok(serviceConfigTemplate.includes('response_timeout_millis = 120000'));
    assert.ok(serviceConfigTemplate.includes('health_probe_timeout_millis = 10000'));
    assert.ok(serviceConfigTemplate.includes('catalog_refresh_interval_millis = 5000'));
    assert.ok(serviceConfigTemplate.includes('circuit_breaker_recovery_window_millis = 60000'));
    assert.ok(serviceConfigTemplate.includes('failure_strategy = "failover"'));
    assert.ok(serviceConfigTemplate.includes('[provider_relay.retry]'));
    assert.ok(serviceConfigTemplate.includes('max_attempts = 2'));
    assert.ok(serviceConfigTemplate.includes('retryable_status_codes = [429, 500, 502, 503, 504]'));
    assert.ok(serviceConfigTemplate.includes('backoff_millis = 0'));
    assert.ok(serviceConfigTemplate.includes('[provider_secret_map]'));
    assert.ok(serviceConfigTemplate.includes('json_file = "/etc/sdkwork/router/provider-secrets.json"'));
    assert.ok(serviceConfigTemplate.includes('[usage_settlement]'));
    assert.ok(serviceConfigTemplate.includes('batch_size = 100'));
    assert.ok(serviceConfigTemplate.includes('[model_ranking]'));
    assert.ok(serviceConfigTemplate.includes('rank_scope = "global"'));
    assert.ok(serviceConfigTemplate.includes('run_on_startup = true'));
    assert.ok(serviceConfigTemplate.includes('[install]'));
    assert.ok(serviceConfigTemplate.includes('environment = "production"'));
    assert.ok(serviceConfigTemplate.includes('seed_profile = "commercial"'));
    assert.ok(serviceConfigTemplate.includes('startup_mode = "ensure"'));
    assert.ok(serviceConfigTemplate.includes('[bootstrap_admin]'));
    assert.ok(serviceConfigTemplate.includes('username = "admin"'));
    assert.ok(serviceConfigTemplate.includes('email = "admin@sdkwork.com"'));
    assert.ok(serviceConfigTemplate.includes('/etc/sdkwork/router/clawrouter.toml'));
    const serviceInstallGuide = readTarEntryText(
      gunzipSync(readFileSync(serviceResult.archivePath)),
      'INSTALL.md',
    );
    assert.ok(serviceInstallGuide.includes('configured for external PostgreSQL'));
    assert.ok(serviceInstallGuide.includes('Redis is enabled and required by default for server deployments'));
    assert.ok(serviceInstallGuide.includes('[redis].enabled = true'));
    assert.ok(serviceInstallGuide.includes('/etc/sdkwork/router/redis.secret'));
    assert.ok(serviceInstallGuide.includes('Request body limits are configured in [request_limits].'));
    assert.ok(serviceInstallGuide.includes('Admin app JSON defaults to 131072 bytes'));
    assert.ok(serviceInstallGuide.includes('Payment callback payloads default to 65536 bytes'));
    assert.ok(serviceInstallGuide.includes('Gateway invocation bodies default to 1048576 bytes'));
    assert.ok(serviceInstallGuide.includes('Version: 0.1.0'));
    assert.ok(serviceInstallGuide.includes('password_file'));
    assert.ok(serviceInstallGuide.includes('Linux service packages run initialization automatically from systemd'));
    assert.ok(serviceInstallGuide.includes('/usr/bin/clawrouterctl ensure'));
    assert.ok(serviceInstallGuide.includes('/etc/sdkwork/router/clawrouter.toml'));
    assert.ok(serviceInstallGuide.includes('Configuration Files'));
    assert.ok(serviceInstallGuide.includes('PostgreSQL password file: /etc/sdkwork/router/database.secret'));
    assert.ok(serviceInstallGuide.includes('First Start'));
    assert.ok(serviceInstallGuide.includes('sudo editor /etc/sdkwork/router/database.secret'));
    assert.ok(serviceInstallGuide.includes('sudo systemctl start clawrouter'));
    assert.ok(serviceInstallGuide.includes('sudo journalctl -u clawrouter -f'));
    assert.ok(!serviceInstallGuide.includes('.env.release must be packaged'));
    assert.equal(
      serviceResult.manifest.generatedArtifacts.some((artifact) =>
        artifact.path === 'service/linux/clawrouter.service'
      ),
      true,
    );
    assert.equal(serviceResult.manifest.runtimeConfig.dataDirectory, '/var/lib/sdkwork/router');
    assert.deepEqual(serviceResult.manifest.installConfiguration.requestLimits, {
      configSection: 'request_limits',
      adminAppJsonBodyMaxBytes: 131072,
      adminSkillJsonBodyMaxBytes: 65536,
      paymentCallbackBodyMaxBytes: 65536,
      gatewayInvocationBodyMaxBytes: 1048576,
      envOverrides: [
        'SDKWORK_CLAW_ADMIN_APP_JSON_BODY_MAX_BYTES',
        'SDKWORK_CLAW_ADMIN_SKILL_JSON_BODY_MAX_BYTES',
        'SDKWORK_CLAW_PAYMENT_CALLBACK_BODY_MAX_BYTES',
        'SDKWORK_CLAW_GATEWAY_INVOCATION_BODY_MAX_BYTES',
      ],
    });
    assert.equal(serviceResult.manifest.installConfiguration.observability.logFilter, 'info');
    assert.equal(serviceResult.manifest.installConfiguration.observability.logFormat, 'compact');
    assert.equal(serviceResult.manifest.installConfiguration.observability.logAnsi, false);
    assert.equal(serviceResult.manifest.installConfiguration.observability.logTarget, true);
    assert.equal(serviceResult.manifest.installConfiguration.observability.logThreadNames, false);
    assert.equal(serviceResult.manifest.installConfiguration.observability.logThreadIds, false);
    assert.equal(serviceResult.manifest.installConfiguration.observability.envOverride, 'RUST_LOG');
    assert.deepEqual(serviceResult.manifest.installConfiguration.edge.corsAllowedOriginsDefault, []);
    assert.equal(serviceResult.manifest.installConfiguration.edge.corsAllowedOriginsField, 'cors_allowed_origins');
    assert.deepEqual(serviceResult.manifest.installConfiguration.portal.security, {
      configSection: 'portal.security',
      hstsEnabled: false,
      hstsMaxAgeSeconds: 31536000,
      hstsIncludeSubdomains: true,
      hstsPreload: false,
      cspFrameSrc: ['https://player.bilibili.com'],
    });

    const containerPlan = module.createInstallPackageBuildPlan({
      packageId: 'linux-arm64-container',
      stagingRoot,
      outputDir,
      version: '0.1.0',
    });
    assert.equal(containerPlan.package.deploymentMode, 'container');
    assert.ok(containerPlan.entries.some((entry) =>
      entry.generated && entry.archivePath === 'container/entrypoint'
    ));
    assert.ok(containerPlan.entries.some((entry) =>
      entry.generated && entry.archivePath === 'container/Containerfile'
    ));
    assert.ok(containerPlan.entries.some((entry) =>
      entry.generated && entry.archivePath === 'container/metadata.json'
    ));
    assert.deepEqual(module.validateInstallPackageBuildPlan(containerPlan), []);

    const containerResult = await module.buildInstallPackageArchive(containerPlan);
    const containerTarBytes = gunzipSync(readFileSync(containerResult.archivePath));
    const containerTar = readTarEntries(containerTarBytes);
    assert.equal(containerTar.get('container/entrypoint')?.mode, 0o755);
    assert.equal(containerTar.get('container/Containerfile')?.mode, 0o644);
    const metadata = JSON.parse(readTarEntryText(containerTarBytes, 'container/metadata.json'));
    assert.equal(metadata.packageId, 'linux-arm64-container');
    assert.equal(metadata.version, '0.1.0');
    assert.equal(metadata.entrypoint, '/opt/sdkwork/router/bin/clawrouter');
    assert.equal(metadata.runtimeUser, 'sdkwork');
    assert.equal(metadata.database.defaultEngine, 'postgresql');
    assert.equal(metadata.redis.defaultHost, 'redis.example.com');
    assert.equal(metadata.redis.defaultPort, 6379);
    assert.equal(metadata.redis.defaultDatabase, 0);
    assert.equal(metadata.redis.urlOverrideExample, 'redis://redis.example.com:6379/0');
    assert.equal(metadata.redis.enabledByDefault, true);
    assert.equal(metadata.redis.required, true);
    assert.equal(metadata.redis.runtimeRequired, true);
    assert.equal(metadata.configFile, '/etc/sdkwork/router/clawrouter.toml');
    const containerInstallGuide = readTarEntryText(containerTarBytes, 'INSTALL.md');
    assert.ok(containerInstallGuide.includes('Configuration Files'));
    assert.ok(containerInstallGuide.includes('/run/secrets/sdkwork/router/postgres-password'));
    assert.ok(containerInstallGuide.includes('/run/secrets/sdkwork/router/redis-password'));
    assert.ok(containerInstallGuide.includes('Redis is enabled and required by default for server deployments'));
    assert.ok(containerInstallGuide.includes(':ro'));
    assert.ok(!containerInstallGuide.includes('--secret clawrouter-postgres-password'));
    assert.equal(
      containerResult.manifest.generatedArtifacts.some((artifact) =>
        artifact.path === 'container/Containerfile'
      ),
      true,
    );

    const windowsStagingRoot = path.join(fixtureRoot, 'windows-staging');
    mkdirSync(path.join(windowsStagingRoot, 'bin'), { recursive: true });
    mkdirSync(path.join(windowsStagingRoot, 'portal', 'dist', 'sdk-archives'), { recursive: true });
    writeFileSync(path.join(windowsStagingRoot, 'bin', 'clawrouter.exe'), 'gateway-binary');
    writeFileSync(path.join(windowsStagingRoot, 'bin', 'clawrouterctl.exe'), 'installer-binary');
    writeFileSync(path.join(windowsStagingRoot, 'portal', 'dist', 'index.html'), '<!doctype html>');
    writeFileSync(path.join(windowsStagingRoot, 'portal', 'dist', 'sdk-archives', 'sdk.zip'), 'sdk-archive');
    writeFileSync(path.join(windowsStagingRoot, '.env.release.example'), 'PORTAL_PUBLIC_API_BASE_URL=/v1\n');
    const windowsContainerPlan = module.createInstallPackageBuildPlan({
      packageId: 'windows-x64-container',
      stagingRoot: windowsStagingRoot,
      outputDir,
      version: '0.1.0',
    });
    assert.ok(windowsContainerPlan.entries.some((entry) =>
      entry.generated && entry.archivePath === 'container/entrypoint.ps1'
    ));
    assert.deepEqual(module.validateInstallPackageBuildPlan(windowsContainerPlan), []);
    const windowsContainerResult = await module.buildInstallPackageArchive(windowsContainerPlan);
    assert.equal(windowsContainerResult.archive.file, 'clawrouter-windows-x64-container-0.1.0.zip');
    assert.equal(
      windowsContainerResult.manifest.generatedArtifacts.some((artifact) =>
        artifact.path === 'container/entrypoint.ps1'
      ),
      true,
    );
    const aggregateManifest = JSON.parse(readFileSync(path.join(outputDir, 'install-packages-manifest.json'), 'utf8'));
    assert.deepEqual(
      aggregateManifest.archives.map((archive) => archive.packageId),
      ['linux-arm64-container', 'linux-x64-service', 'windows-x64-container'],
    );

    const desktopPlan = module.createInstallPackageBuildPlan({
      packageId: 'linux-x64-desktop',
      stagingRoot,
      outputDir,
      version: '0.1.0',
    });
    assert.equal(desktopPlan.package.runtimeProfile, 'desktop');
    assert.ok(desktopPlan.entries.some((entry) =>
      entry.generated && entry.archivePath === 'desktop/metadata.json'
    ));
    assert.deepEqual(module.validateInstallPackageBuildPlan(desktopPlan), []);
    const desktopResult = await module.buildInstallPackageArchive(desktopPlan);
    const desktopTarBytes = gunzipSync(readFileSync(desktopResult.archivePath));
    const desktopConfigTemplate = readTarEntryText(desktopTarBytes, 'config/clawrouter.toml.example');
    const desktopMetadata = JSON.parse(readTarEntryText(desktopTarBytes, 'desktop/metadata.json'));
    assert.ok(desktopConfigTemplate.includes('engine = "sqlite"'));
    assert.ok(desktopConfigTemplate.includes('[redis]'));
    assert.ok(desktopConfigTemplate.includes('enabled = false'));
    assert.ok(desktopConfigTemplate.includes('~/.sdkwork/router/config/clawrouter.toml'));
    assert.ok(desktopConfigTemplate.includes('~/.sdkwork/router/data/clawrouter.sqlite'));
    assert.ok(desktopConfigTemplate.includes('[request_limits]'));
    assert.ok(desktopConfigTemplate.includes('admin_app_json_body_max_bytes = 131072'));
    assert.ok(desktopConfigTemplate.includes('gateway_invocation_body_max_bytes = 1048576'));
    assert.equal(desktopMetadata.database.defaultEngine, 'sqlite');
    assert.equal(desktopMetadata.redis.enabledByDefault, false);
    assert.equal(desktopMetadata.requestLimits.paymentCallbackBodyMaxBytes, 65536);
    assert.equal(desktopMetadata.database.requiresExternalDatabase, false);
    const desktopInstallGuide = readTarEntryText(desktopTarBytes, 'INSTALL.md');
    assert.ok(desktopInstallGuide.includes('Desktop deployments default to SQLite.'));
    assert.ok(desktopInstallGuide.includes('Redis is optional and disabled by default'));
    assert.ok(desktopInstallGuide.includes('~/.sdkwork/router/config/clawrouter.toml'));
    assert.ok(desktopInstallGuide.includes('~/.sdkwork/router/data/clawrouter.sqlite'));
    assert.ok(desktopInstallGuide.includes('Configuration Files'));
    assert.ok(desktopInstallGuide.includes('Database: SQLite'));
    assert.ok(desktopInstallGuide.includes('First Start'));
    assert.ok(desktopInstallGuide.includes('Request body limits are configured in [request_limits].'));
    assert.ok(desktopInstallGuide.includes('/usr/bin/clawrouterctl ensure'));
    assert.ok(desktopInstallGuide.includes('/usr/bin/clawrouterctl refresh-catalog --force'));
    assert.ok(desktopInstallGuide.includes('/usr/bin/clawrouter'));
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('generated install guides use native desktop install paths across platforms', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'build-claw-router-install-package.mjs')).href
  );
  const planner = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'plan-claw-router-install-packages.mjs')).href
  );

  const plan = planner.createInstallPackagePlan({
    version: '0.1.0',
    platforms: ['windows', 'macos'],
    architectures: ['x64'],
    deploymentModes: ['desktop'],
  });
  const windowsDesktop = plan.packages.find((item) => item.id === 'windows-x64-desktop');
  const macosDesktop = plan.packages.find((item) => item.id === 'macos-x64-desktop');

  const windowsGuide = module.createInstallGuide(windowsDesktop);
  assert.ok(windowsGuide.includes('```powershell'));
  assert.ok(windowsGuide.includes('& "C:/Program Files/sdkwork/router/bin/clawrouterctl.exe" ensure'));
  assert.ok(windowsGuide.includes('& "C:/Program Files/sdkwork/router/bin/clawrouterctl.exe" refresh-catalog --force'));
  assert.ok(windowsGuide.includes('& "C:/Program Files/sdkwork/router/bin/clawrouter.exe"'));
  assert.ok(!windowsGuide.includes('.\\bin\\clawrouterctl.exe ensure'));

  const macosGuide = module.createInstallGuide(macosDesktop);
  assert.ok(macosGuide.includes('/opt/sdkwork/router/bin/clawrouterctl ensure'));
  assert.ok(macosGuide.includes('/opt/sdkwork/router/bin/clawrouterctl refresh-catalog --force'));
  assert.ok(macosGuide.includes('/opt/sdkwork/router/bin/clawrouter'));
  assert.ok(!macosGuide.includes('./bin/clawrouterctl ensure'));
});

test('macOS service packages run initialization through a launchd runner', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'build-claw-router-install-package.mjs')).href
  );

  const fixtureRoot = path.join(workspaceRoot, '.tmp', 'install-package-macos-service-runner-test');
  const stagingRoot = path.join(fixtureRoot, 'staging');
  const outputDir = path.join(fixtureRoot, 'out');
  rmSync(fixtureRoot, { recursive: true, force: true });
  mkdirSync(path.join(stagingRoot, 'bin'), { recursive: true });
  mkdirSync(path.join(stagingRoot, 'portal', 'dist', 'sdk-archives'), { recursive: true });
  writeFileSync(path.join(stagingRoot, 'bin', 'clawrouter'), 'gateway-binary');
  writeFileSync(path.join(stagingRoot, 'bin', 'clawrouterctl'), 'installer-binary');
  writeFileSync(path.join(stagingRoot, 'portal', 'dist', 'index.html'), '<!doctype html>');
  writeFileSync(path.join(stagingRoot, 'portal', 'dist', 'sdk-archives', 'sdk.zip'), 'sdk-archive');
  writeFileSync(path.join(stagingRoot, '.env.release.example'), 'PORTAL_PUBLIC_API_BASE_URL=/v1\n');

  try {
    const servicePlan = module.createInstallPackageBuildPlan({
      packageId: 'macos-x64-service',
      stagingRoot,
      outputDir,
      version: '0.1.0',
    });
    assert.ok(servicePlan.entries.some((entry) =>
      entry.archivePath === 'service/macos/clawrouter-service-runner'
      && entry.generated
      && entry.generatedKind === 'service-runner'
      && entry.mode === 0o755
    ));
    assert.deepEqual(module.validateInstallPackageBuildPlan(servicePlan), []);

    const serviceResult = await module.buildInstallPackageArchive(servicePlan);
    const tarBytes = gunzipSync(readFileSync(serviceResult.archivePath));
    const tarEntries = readTarEntries(tarBytes);
    assert.equal(tarEntries.get('service/macos/clawrouter-service-runner')?.mode, 0o755);
    const runnerText = readTarEntryText(tarBytes, 'service/macos/clawrouter-service-runner');
    assert.ok(runnerText.includes('/Library/Application Support/sdkwork/router/bin/clawrouterctl ensure'));
    assert.ok(runnerText.includes('/Library/Application Support/sdkwork/router/bin/clawrouterctl refresh-catalog --force'));
    assert.ok(runnerText.includes('exec /Library/Application Support/sdkwork/router/bin/clawrouter "$@"'));

    const plistText = readTarEntryText(tarBytes, 'service/macos/com.sdkwork.clawrouter.plist');
    assert.ok(plistText.includes('/Library/Application Support/sdkwork/router/service/macos/clawrouter-service-runner'));
    assert.ok(!plistText.includes('/Library/Application Support/sdkwork/router/bin/clawrouter</string>'));
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('install package archive builder emits tar.gz bytes for non-Windows packages', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'build-claw-router-install-package.mjs')).href
  );

  const fixtureRoot = path.join(workspaceRoot, '.tmp', 'install-package-targz-test');
  const stagingRoot = path.join(fixtureRoot, 'staging');
  const outputDir = path.join(fixtureRoot, 'out');
  rmSync(fixtureRoot, { recursive: true, force: true });
  mkdirSync(path.join(stagingRoot, 'bin'), { recursive: true });
  mkdirSync(path.join(stagingRoot, 'portal', 'dist', 'sdk-archives'), { recursive: true });
  writeFileSync(path.join(stagingRoot, 'bin', 'clawrouter'), 'gateway-binary');
  writeFileSync(path.join(stagingRoot, 'bin', 'clawrouterctl'), 'installer-binary');
  writeFileSync(path.join(stagingRoot, 'portal', 'dist', 'index.html'), '<!doctype html>');
  writeFileSync(path.join(stagingRoot, 'portal', 'dist', 'sdk-archives', 'sdk.zip'), 'sdk-archive');
  writeFileSync(path.join(stagingRoot, '.env.release.example'), 'PORTAL_PUBLIC_API_BASE_URL=/v1\n');

  try {
    const buildPlan = module.createInstallPackageBuildPlan({
      packageId: 'linux-arm64-archive',
      stagingRoot,
      outputDir,
      version: '0.1.0',
    });
    const result = await module.buildInstallPackageArchive(buildPlan);
    const archiveBytes = readFileSync(result.archivePath);
    assert.equal(result.archive.file, 'clawrouter-linux-arm64-archive-0.1.0.tar.gz');
    assert.equal(archiveBytes[0], 0x1f);
    assert.equal(archiveBytes[1], 0x8b);
    const tarBytes = gunzipSync(archiveBytes);
    const tarEntries = readTarEntries(tarBytes);
    assert.equal(tarEntries.get('bin/clawrouter')?.mode, 0o755);
    assert.equal(tarEntries.get('bin/clawrouterctl')?.mode, 0o755);
    assert.equal(tarEntries.get('portal/dist/index.html')?.mode, 0o644);
    assert.match(result.archive.sha256, /^[a-f0-9]{64}$/u);
    assert.equal(result.manifest.package.id, 'linux-arm64-archive');
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('native installer builder emits apt-installable Debian packages for Linux service mode', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'build-claw-router-native-installer.mjs')).href
  );

  assert.deepEqual(module.parseNativeInstallerBuildArgs(['--package-id', 'linux-x64-service', '--check']), {
    all: false,
    check: true,
    dryRun: false,
    help: false,
    json: false,
    outputDir: null,
    packageId: 'linux-x64-service',
    stagingRoot: null,
    version: '0.3.0',
  });

  const fixtureRoot = path.join(workspaceRoot, '.tmp', 'native-installer-deb-test');
  const stagingRoot = path.join(fixtureRoot, 'staging');
  const outputDir = path.join(fixtureRoot, 'out');
  rmSync(fixtureRoot, { recursive: true, force: true });
  mkdirSync(path.join(stagingRoot, 'bin'), { recursive: true });
  mkdirSync(path.join(stagingRoot, 'portal', 'dist', 'sdk-archives'), { recursive: true });
  writeFileSync(path.join(stagingRoot, 'bin', 'clawrouter'), 'gateway-binary');
  writeFileSync(path.join(stagingRoot, 'bin', 'clawrouterctl'), 'installer-binary');
  writeFileSync(path.join(stagingRoot, 'portal', 'dist', 'index.html'), '<!doctype html>');
  writeFileSync(path.join(stagingRoot, 'portal', 'dist', 'sdk-archives', 'sdk.zip'), 'sdk-archive');
  writeFileSync(path.join(stagingRoot, '.env.release.example'), 'PORTAL_PUBLIC_API_BASE_URL=/v1\n');

  try {
    const plan = module.createNativeInstallerBuildPlan({
      packageId: 'linux-x64-service',
      stagingRoot,
      outputDir,
      version: '0.1.0',
    });
    assert.equal(plan.nativeFormat, 'deb');
    assert.equal(plan.buildTool, 'internal-deb');
    assert.equal(plan.installerName, 'clawrouter-linux-x64-server-0.1.0.deb');
    assert.deepEqual(module.validateNativeInstallerBuildPlan(plan), []);

    const result = await module.buildNativeInstaller(plan);
    assert.equal(result.installer.file, 'clawrouter-linux-x64-server-0.1.0.deb');
    assert.equal(result.installer.format, 'deb');
    assert.equal(result.installer.kind, 'native-installer');
    assert.match(result.installer.sha256, /^[a-f0-9]{64}$/u);
    assert.equal(result.manifest.nativeInstall.schemaVersion, '2026-05-16.native-install-layout.v1');
    assert.equal(result.manifest.nativeInstall.format, 'deb');
    assert.equal(result.manifest.nativeInstall.installRoot, '/usr/lib/sdkwork/router');
    assert.equal(result.manifest.nativeInstall.files.binary, '/usr/bin/clawrouter');
    assert.equal(result.manifest.nativeInstall.files.installer, '/usr/bin/clawrouterctl');
    assert.equal(result.manifest.nativeInstall.files.privateBinary, '/usr/lib/sdkwork/router/bin/clawrouter');
    assert.equal(result.manifest.nativeInstall.files.privateInstaller, '/usr/lib/sdkwork/router/bin/clawrouterctl');
    assert.equal(result.manifest.nativeInstall.files.portal, '/usr/lib/sdkwork/router/portal/dist');
    assert.equal(result.manifest.nativeInstall.files.runtimeConfig, '/etc/sdkwork/router/clawrouter.toml');
    assert.equal(result.manifest.nativeInstall.files.runtimeConfigTemplate, '/etc/sdkwork/router/clawrouter.toml.example');
    assert.equal(result.manifest.nativeInstall.files.serviceEnvironment, '/etc/sdkwork/router/clawrouter.env');
    assert.equal(result.manifest.nativeInstall.files.passwordFile, '/etc/sdkwork/router/database.secret');
    assert.equal(result.manifest.nativeInstall.files.redisPasswordFile, '/etc/sdkwork/router/redis.secret');
    assert.equal(result.manifest.nativeInstall.files.installManifest, '/usr/share/sdkwork/router/install-manifest.json');
    assert.equal(result.manifest.nativeInstall.files.releaseEnvTemplate, '/etc/sdkwork/router/.env.release.example');
    assert.equal(result.manifest.nativeInstall.service.manager, 'systemd');
    assert.equal(result.manifest.nativeInstall.service.name, 'clawrouter.service');
    assert.equal(result.manifest.nativeInstall.service.enabledOnInstall, true);
    assert.equal(result.manifest.nativeInstall.service.startedOnInstall, false);
    assert.ok(result.manifest.nativeInstall.permissions.some((item) =>
      item.path === '/usr/lib/sdkwork/router'
      && item.owner === 'root'
      && item.group === 'root'
      && item.mode === '0755'
    ));
    assert.ok(result.manifest.nativeInstall.permissions.some((item) =>
      item.path === '/usr/lib/sdkwork/router/bin'
      && item.owner === 'root'
      && item.group === 'root'
      && item.mode === '0755'
    ));
    assert.ok(result.manifest.nativeInstall.permissions.some((item) =>
      item.path === '/usr/bin/clawrouter'
      && item.owner === 'root'
      && item.group === 'root'
      && item.mode === '0755'
    ));
    assert.ok(result.manifest.nativeInstall.permissions.some((item) =>
      item.path === '/etc/sdkwork/router'
      && item.owner === 'root'
      && item.group === 'sdkwork'
      && item.mode === '0750'
    ));
    assert.ok(result.manifest.nativeInstall.permissions.some((item) =>
      item.path === '/etc/sdkwork/router/clawrouter.toml.example'
      && item.owner === 'root'
      && item.group === 'sdkwork'
      && item.mode === '0640'
    ));
    assert.ok(result.manifest.nativeInstall.permissions.some((item) =>
      item.path === '/etc/sdkwork/router/.env.release.example'
      && item.owner === 'root'
      && item.group === 'sdkwork'
      && item.mode === '0640'
    ));
    assert.ok(result.manifest.nativeInstall.permissions.some((item) =>
      item.path === '/etc/sdkwork/router/database.secret'
      && item.owner === 'root'
      && item.group === 'sdkwork'
      && item.mode === '0640'
    ));
    assert.ok(result.manifest.nativeInstall.permissions.some((item) =>
      item.path === '/etc/sdkwork/router/redis.secret'
      && item.owner === 'root'
      && item.group === 'sdkwork'
      && item.mode === '0640'
    ));
    assert.equal(result.manifest.nativeInstall.commands.configure[0], 'sudo editor /etc/sdkwork/router/clawrouter.toml');
    assert.equal(result.manifest.nativeInstall.commands.start, 'sudo systemctl start clawrouter');

    const arEntries = readArEntries(readFileSync(result.installerPath));
    assert.ok(arEntries.has('debian-binary'));
    assert.ok(arEntries.has('control.tar.gz'));
    assert.ok(arEntries.has('data.tar.gz'));
    assert.equal(arEntries.get('debian-binary').toString('utf8'), '2.0\n');

    const controlTar = gunzipSync(arEntries.get('control.tar.gz'));
    const controlText = readTarEntryText(controlTar, './control');
    assert.ok(controlText.includes('Package: clawrouter'));
    assert.ok(controlText.includes('Architecture: amd64'));
    const postinstText = readTarEntryText(controlTar, './postinst');
    assert.ok(postinstText.includes('/etc/sdkwork/router/clawrouter.env'));
    assert.ok(postinstText.includes('/etc/sdkwork/router/database.secret'));
    assert.ok(postinstText.includes('/etc/sdkwork/router/redis.secret'));
    assert.ok(postinstText.includes('chown root:root /usr/lib/sdkwork/router /usr/lib/sdkwork/router/bin /usr/bin/clawrouter /usr/bin/clawrouterctl'));
    assert.ok(postinstText.includes('chmod 0755 /usr/lib/sdkwork/router /usr/lib/sdkwork/router/bin /usr/bin/clawrouter /usr/bin/clawrouterctl'));
    assert.ok(postinstText.includes('chown root:sdkwork /etc/sdkwork/router'));
    assert.ok(postinstText.includes('chmod 0750 /etc/sdkwork/router'));
    assert.ok(postinstText.includes('chown root:sdkwork /etc/sdkwork/router/clawrouter.toml.example'));
    assert.ok(postinstText.includes('chmod 0640 /etc/sdkwork/router/clawrouter.toml.example'));
    assert.ok(postinstText.includes('chown root:sdkwork /etc/sdkwork/router/.env.release.example'));
    assert.ok(postinstText.includes('chmod 0640 /etc/sdkwork/router/.env.release.example'));
    assert.ok(postinstText.includes('SDKWORK_CLAW_DEPLOYMENT_MODE=server'));
    assert.ok(postinstText.includes('ClawRouter installation summary'));
    assert.ok(postinstText.includes('Runtime TOML: /etc/sdkwork/router/clawrouter.toml'));
    assert.ok(postinstText.includes('Service environment: /etc/sdkwork/router/clawrouter.env'));
    assert.ok(postinstText.includes('PostgreSQL password file: /etc/sdkwork/router/database.secret'));
    assert.ok(postinstText.includes('Redis password file: /etc/sdkwork/router/redis.secret'));
    assert.ok(postinstText.includes('Redis is enabled and required by default for server deployments; configure [redis] before first startup.'));
    assert.ok(postinstText.includes('sudo editor /etc/sdkwork/router/clawrouter.toml'));
    assert.ok(postinstText.includes('sudo editor /etc/sdkwork/router/database.secret'));
    assert.ok(postinstText.includes('sudo systemctl start clawrouter'));
    assert.ok(postinstText.includes('systemctl daemon-reload'));
    assert.ok(postinstText.includes('systemctl enable clawrouter.service'));
    assert.ok(!postinstText.includes('systemctl enable --now clawrouter.service'));

    const dataTar = gunzipSync(arEntries.get('data.tar.gz'));
    const dataEntries = readTarEntries(dataTar);
    const dataEntryNames = [...dataEntries.keys()];
    assert.equal(dataEntries.get('./usr/bin')?.type, 'directory');
    assert.equal(dataEntries.get('./usr/lib/sdkwork/router')?.type, 'directory');
    assert.equal(dataEntries.get('./usr/lib/sdkwork/router/bin')?.type, 'directory');
    assert.equal(dataEntries.get('./etc/sdkwork/router')?.type, 'directory');
    assert.ok(!dataEntryNames.some((entry) => entry.startsWith('./opt/sdkwork/router')));
    assertTarParentBeforeChild(dataEntryNames, './etc/sdkwork/router', './etc/sdkwork/router/.env.release.example');
    assertTarParentBeforeChild(dataEntryNames, './usr/bin', './usr/bin/clawrouter');
    assertTarParentBeforeChild(dataEntryNames, './usr/lib/sdkwork/router', './usr/lib/sdkwork/router/bin/clawrouter');
    assertTarParentBeforeChild(dataEntryNames, './etc/sdkwork/router', './etc/sdkwork/router/clawrouter.toml.example');
    assert.equal(dataEntries.get('./usr/bin/clawrouter')?.mode, 0o755);
    assert.equal(dataEntries.get('./usr/bin/clawrouterctl')?.mode, 0o755);
    assert.equal(dataEntries.get('./usr/lib/sdkwork/router/bin/clawrouter')?.mode, 0o755);
    assert.equal(dataEntries.get('./usr/lib/sdkwork/router/bin/clawrouterctl')?.mode, 0o755);
    assert.ok(dataEntries.has('./usr/lib/sdkwork/router/portal/dist/index.html'));
    assert.equal(dataEntries.get('./etc/sdkwork/router/.env.release.example')?.mode, 0o640);
    assert.equal(dataEntries.get('./etc/sdkwork/router/clawrouter.toml.example')?.mode, 0o640);
    assert.ok(!dataEntries.has('./usr/lib/sdkwork/router/.env.release.example'));
    assert.ok(dataEntries.has('./etc/sdkwork/router/clawrouter.toml.example'));
    assert.ok(dataEntries.has('./lib/systemd/system/clawrouter.service'));
    assert.ok(dataEntries.has('./usr/share/sdkwork/router/install-manifest.json'));
    const systemdText = readTarEntryText(dataTar, './lib/systemd/system/clawrouter.service');
    assert.ok(systemdText.includes('EnvironmentFile=-/etc/sdkwork/router/clawrouter.env'));
    assert.ok(systemdText.includes('ExecStartPre=/usr/bin/clawrouterctl ensure'));
    assert.ok(systemdText.includes('ExecStartPre=/usr/bin/clawrouterctl refresh-catalog --force'));
    assert.ok(systemdText.includes('UMask=0027'));
    assert.ok(systemdText.includes('StateDirectory=sdkwork/router'));
    assert.ok(systemdText.includes('StateDirectoryMode=0750'));
    assert.ok(systemdText.includes('LogsDirectory=sdkwork/router'));
    assert.ok(systemdText.includes('LogsDirectoryMode=0750'));
    assert.ok(systemdText.includes('ConfigurationDirectory=sdkwork/router'));
    assert.ok(systemdText.includes('ConfigurationDirectoryMode=0750'));
    assert.ok(systemdText.includes('ProtectKernelTunables=true'));
    assert.ok(systemdText.includes('ProtectKernelModules=true'));
    assert.ok(systemdText.includes('ProtectControlGroups=true'));
    assert.ok(systemdText.includes('RestrictSUIDSGID=true'));
    assert.ok(systemdText.includes('SystemCallArchitectures=native'));
    assert.ok(systemdText.includes('LimitNOFILE=65535'));
    assert.ok(systemdText.includes('ReadWritePaths=/var/lib/sdkwork/router /var/log/sdkwork/router'));
    assert.ok(systemdText.includes('ReadOnlyPaths=/usr/lib/sdkwork/router /etc/sdkwork/router'));
    assert.ok(!systemdText.includes('ReadWritePaths=/var/lib/sdkwork/router /var/log/sdkwork/router /etc/sdkwork/router'));

    const aggregateManifest = JSON.parse(readFileSync(path.join(outputDir, 'install-packages-manifest.json'), 'utf8'));
    assert.deepEqual(aggregateManifest.archives.map((archive) => archive.file), [
      'clawrouter-linux-x64-server-0.1.0.deb',
    ]);

    const { stdout, stderr } = await execFileAsync(process.execPath, [
      path.join(workspaceRoot, 'scripts', 'validate-claw-router-install-artifacts.mjs'),
      '--package-id',
      'linux-x64-service',
      '--artifact-path',
      result.installerPath,
      '--version',
      '0.1.0',
      '--json',
    ], {
      cwd: workspaceRoot,
      maxBuffer: 1024 * 1024 * 4,
    });
    assert.equal(stderr, '');
    const validation = JSON.parse(stdout);
    assert.equal(validation.ok, true);
    assert.deepEqual(validation.issues, []);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('native installer builder keeps Linux desktop packages user-scoped and self-describing', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'build-claw-router-native-installer.mjs')).href
  );

  const fixtureRoot = path.join(workspaceRoot, '.tmp', 'native-installer-linux-desktop-test');
  const stagingRoot = path.join(fixtureRoot, 'staging');
  const outputDir = path.join(fixtureRoot, 'out');
  rmSync(fixtureRoot, { recursive: true, force: true });
  mkdirSync(path.join(stagingRoot, 'bin'), { recursive: true });
  mkdirSync(path.join(stagingRoot, 'portal', 'dist', 'sdk-archives'), { recursive: true });
  writeFileSync(path.join(stagingRoot, 'bin', 'clawrouter'), 'gateway-binary');
  writeFileSync(path.join(stagingRoot, 'bin', 'clawrouterctl'), 'installer-binary');
  writeFileSync(path.join(stagingRoot, 'portal', 'dist', 'index.html'), '<!doctype html>');
  writeFileSync(path.join(stagingRoot, 'portal', 'dist', 'sdk-archives', 'sdk.zip'), 'sdk-archive');
  writeFileSync(path.join(stagingRoot, '.env.release.example'), 'PORTAL_PUBLIC_API_BASE_URL=/v1\n');

  try {
    const plan = module.createNativeInstallerBuildPlan({
      packageId: 'linux-x64-desktop',
      stagingRoot,
      outputDir,
      version: '0.1.0',
    });
    assert.equal(plan.nativeFormat, 'deb');
    assert.deepEqual(module.validateNativeInstallerBuildPlan(plan), []);

    const result = await module.buildNativeInstaller(plan);
    assert.equal(result.installer.file, 'clawrouter-linux-x64-desktop-0.1.0.deb');
    assert.equal(result.manifest.installConfiguration.database.engine, 'sqlite');
    assert.equal(result.manifest.installConfiguration.database.externalRequired, false);
    assert.equal(result.manifest.installConfiguration.redis.enabledByDefault, false);
    assert.equal(result.manifest.installConfiguration.redis.required, false);
    assert.equal(result.manifest.nativeInstall.schemaVersion, '2026-05-16.native-install-layout.v1');
    assert.equal(result.manifest.nativeInstall.format, 'deb');
    assert.equal(result.manifest.nativeInstall.files.runtimeConfigTemplate, '/usr/share/sdkwork/router/config/clawrouter.toml.example');
    assert.equal(result.manifest.nativeInstall.files.releaseEnvTemplate, '~/.sdkwork/router/config/.env.release.example');
    assert.equal(result.manifest.nativeInstall.files.binary, '/usr/bin/clawrouter');
    assert.equal(result.manifest.nativeInstall.files.privateBinary, '/usr/lib/sdkwork/router/bin/clawrouter');
    assert.equal(result.manifest.nativeInstall.files.portal, '/usr/lib/sdkwork/router/portal/dist');
    assert.equal(result.manifest.nativeInstall.files.runtimeConfig, '~/.sdkwork/router/config/clawrouter.toml');
    assert.equal(result.manifest.nativeInstall.files.installManifest, '/usr/share/sdkwork/router/install-manifest.json');
    assert.equal(result.manifest.nativeInstall.service, null);
    assert.ok(result.manifest.nativeInstall.permissions.some((item) =>
      item.path === '/usr/lib/sdkwork/router'
      && item.owner === 'root'
      && item.group === 'root'
      && item.mode === '0755'
    ));
    assert.ok(result.manifest.nativeInstall.permissions.some((item) =>
      item.path === '/usr/share/sdkwork/router'
      && item.owner === 'root'
      && item.group === 'root'
      && item.mode === '0755'
    ));
    assert.ok(result.manifest.nativeInstall.permissions.some((item) =>
      item.path === '/usr/bin/clawrouter'
      && item.owner === 'root'
      && item.group === 'root'
      && item.mode === '0755'
    ));
    assert.equal(
      result.manifest.installConfiguration.files.runtimeConfig,
      '~/.sdkwork/router/config/clawrouter.toml',
    );

    const arEntries = readArEntries(readFileSync(result.installerPath));
    const controlTar = gunzipSync(arEntries.get('control.tar.gz'));
    const postinstText = readTarEntryText(controlTar, './postinst');
    assert.ok(postinstText.includes('ClawRouter installation summary'));
    assert.ok(postinstText.includes('Desktop config file: ~/.sdkwork/router/config/clawrouter.toml'));
    assert.ok(postinstText.includes('Database: SQLite'));
    assert.ok(postinstText.includes('chmod 0755 /usr/lib/sdkwork/router /usr/lib/sdkwork/router/bin /usr/bin/clawrouter /usr/bin/clawrouterctl'));
    assert.ok(!postinstText.includes('/etc/sdkwork/router/database.secret'));
    assert.ok(!postinstText.includes('SDKWORK_CLAW_DEPLOYMENT_MODE=server'));
    assert.ok(!postinstText.includes('systemctl enable clawrouter.service'));

    const dataTar = gunzipSync(arEntries.get('data.tar.gz'));
    const dataEntries = readTarEntries(dataTar);
    const dataEntryNames = [...dataEntries.keys()];
    assert.equal(dataEntries.get('./usr/lib/sdkwork/router')?.type, 'directory');
    assert.equal(dataEntries.get('./usr/share/sdkwork/router/config')?.type, 'directory');
    assert.ok(!dataEntryNames.some((entry) => entry.startsWith('./opt/sdkwork/router')));
    assertTarParentBeforeChild(dataEntryNames, './usr/share/sdkwork/router/config', './usr/share/sdkwork/router/config/clawrouter.toml.example');
    assert.ok(![...dataEntries.keys()].some((entry) => entry.endsWith('/.env.release.example')));
    assert.ok(!dataEntries.has('./usr/lib/sdkwork/router/.env.release.example'));
    assert.ok(dataEntries.has('./usr/share/sdkwork/router/config/clawrouter.toml.example'));
    assert.ok(!dataEntries.has('./etc/sdkwork/router/clawrouter.toml.example'));
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('native installer builder CLI validates cross-platform service and desktop installers in dry-run mode', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'build-claw-router-native-installer.mjs')).href
  );
  const validator = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'validate-claw-router-install-artifacts.mjs')).href
  );
  const { stdout, stderr } = await execFileAsync(process.execPath, [
    path.join(workspaceRoot, 'scripts', 'build-claw-router-native-installer.mjs'),
    '--all',
    '--check',
    '--dry-run',
    '--json',
  ], {
    cwd: workspaceRoot,
    maxBuffer: 1024 * 1024 * 4,
  });
  const payload = JSON.parse(stdout);
  assert.equal(stderr, '');
  assert.equal(payload.ok, true);
  assert.equal(payload.plans.length, 12);
  assert.deepEqual(payload.issues, []);
  assert.ok(payload.plans.some((plan) => plan.installerName === 'clawrouter-linux-x64-server-0.3.0.deb'));
  assert.ok(payload.plans.some((plan) => plan.installerName === 'clawrouter-windows-arm64-desktop-0.3.0.msi'));
  assert.ok(payload.plans.some((plan) => plan.installerName === 'clawrouter-macos-x64-server-0.3.0.pkg'));
  const linuxService = payload.plans.find((plan) => plan.package.id === 'linux-x64-service');
  assert.equal(linuxService.nativeInstallLayout.schemaVersion, '2026-05-16.native-install-layout.v1');
  assert.equal(linuxService.nativeInstallLayout.files.runtimeConfig, '/etc/sdkwork/router/clawrouter.toml');
  assert.equal(linuxService.nativeInstallLayout.files.releaseEnvTemplate, '/etc/sdkwork/router/.env.release.example');
  assert.equal(linuxService.nativeInstallLayout.files.binary, '/usr/bin/clawrouter');
  assert.equal(linuxService.nativeInstallLayout.files.privateBinary, '/usr/lib/sdkwork/router/bin/clawrouter');
  assert.equal(linuxService.nativeInstallLayout.service.name, 'clawrouter.service');
  assert.equal(linuxService.nativeInstallLayout.commands.start, 'sudo systemctl start clawrouter');
  const windowsService = payload.plans.find((plan) => plan.package.id === 'windows-x64-service');
  assert.equal(windowsService.nativeInstallLayout.format, 'msi');
  assert.equal(windowsService.nativeInstallLayout.installRoot, '%ProgramFiles%/sdkwork/router');
  assert.equal(windowsService.nativeInstallLayout.files.binary, '%ProgramFiles%/sdkwork/router/bin/clawrouter.exe');
  assert.equal(windowsService.nativeInstallLayout.files.runtimeConfigTemplate, '%ProgramData%/sdkwork/router/clawrouter.toml.example');
  assert.equal(windowsService.nativeInstallLayout.files.releaseEnvTemplate, '%ProgramData%/sdkwork/router/.env.release.example');
  assert.equal(windowsService.nativeInstallLayout.commands.installService, '%ProgramFiles%/sdkwork/router/bin/clawrouterctl.exe ensure');
  assertNativePermission(windowsService.nativeInstallLayout.permissions, {
    path: '%ProgramData%/sdkwork/router',
    owner: 'SYSTEM',
    group: 'Administrators',
    mode: 'inherited-programdata-acl',
  });
  assertNativePermission(windowsService.nativeInstallLayout.permissions, {
    path: '%ProgramData%/sdkwork/router/.env.release.example',
    owner: 'SYSTEM',
    group: 'Administrators',
    mode: 'inherited-programdata-acl',
  });
  assert.equal(
    module.windowsPayloadPathForArchivePath(windowsService, '.env.release.example'),
    'ProgramData/sdkwork/router/.env.release.example',
  );
  assert.equal(
    module.windowsPayloadPathForArchivePath(windowsService, 'config/clawrouter.toml.example'),
    'ProgramData/sdkwork/router/clawrouter.toml.example',
  );
  const serviceWix = module.createWixSource(windowsService, 'C:/payload', [
    { relativePath: '.env.release.example', data: Buffer.from('env') },
    { relativePath: 'config/clawrouter.toml.example', data: Buffer.from('toml') },
    { relativePath: 'bin/clawrouter.exe', data: Buffer.from('exe') },
  ]);
  assert.ok(serviceWix.includes('<StandardDirectory Id="ProgramFiles64Folder">'));
  assert.ok(serviceWix.includes('<StandardDirectory Id="CommonAppDataFolder">'));
  assert.ok(!serviceWix.includes('<StandardDirectory Id="AppDataFolder">'));
  assert.equal((serviceWix.match(/Name="sdkwork"/g) ?? []).length, 2);
  assert.ok(serviceWix.includes('Name="router"'));
  const windowsDesktop = payload.plans.find((plan) => plan.package.id === 'windows-x64-desktop');
  assert.equal(windowsDesktop.nativeInstallLayout.files.runtimeConfigTemplate, '%ProgramData%/sdkwork/router/clawrouter.toml.example');
  assert.equal(windowsDesktop.nativeInstallLayout.files.releaseEnvTemplate, '%ProgramData%/sdkwork/router/.env.release.example');
  assertNativePermission(windowsDesktop.nativeInstallLayout.permissions, {
    path: '%ProgramData%/sdkwork/router',
    owner: 'SYSTEM',
    group: 'Administrators',
    mode: 'inherited-programdata-acl',
  });
  assert.equal(
    module.windowsPayloadPathForArchivePath(windowsDesktop, '.env.release.example'),
    'ProgramData/sdkwork/router/.env.release.example',
  );
  assert.equal(
    module.windowsPayloadPathForArchivePath(windowsDesktop, 'config/clawrouter.toml.example'),
    'ProgramData/sdkwork/router/clawrouter.toml.example',
  );
  const desktopWix = module.createWixSource(windowsDesktop, 'C:/payload', [
    { relativePath: '.env.release.example', data: Buffer.from('env') },
    { relativePath: 'config/clawrouter.toml.example', data: Buffer.from('toml') },
    { relativePath: 'bin/clawrouter.exe', data: Buffer.from('exe') },
  ]);
  assert.ok(desktopWix.includes('<StandardDirectory Id="ProgramFiles64Folder">'));
  assert.ok(desktopWix.includes('<StandardDirectory Id="CommonAppDataFolder">'));
  assert.ok(!desktopWix.includes('<StandardDirectory Id="AppDataFolder">'));
  assert.equal((desktopWix.match(/Name="sdkwork"/g) ?? []).length, 2);
  const macosDesktop = payload.plans.find((plan) => plan.package.id === 'macos-arm64-desktop');
  assert.equal(macosDesktop.nativeInstallLayout.format, 'pkg');
  assert.equal(macosDesktop.nativeInstallLayout.service, null);
  assert.equal(
    macosDesktop.nativeInstallLayout.files.runtimeConfigTemplate,
    '/usr/local/share/sdkwork/router/config/clawrouter.toml.example',
  );
  assert.equal(
    macosDesktop.nativeInstallLayout.files.releaseEnvTemplate,
    '~/.sdkwork/router/config/.env.release.example',
  );
  assert.equal(
    macosDesktop.nativeInstallLayout.files.runtimeConfig,
    '~/.sdkwork/router/config/clawrouter.toml',
  );
  assertNativePermission(macosDesktop.nativeInstallLayout.permissions, {
    path: '/opt/sdkwork/router',
    owner: 'root',
    group: 'wheel',
    mode: '0755',
  });
  assertNativePermission(macosDesktop.nativeInstallLayout.permissions, {
    path: '/usr/local/share/sdkwork/router/config',
    owner: 'root',
    group: 'wheel',
    mode: '0755',
  });
  const macosService = payload.plans.find((plan) => plan.package.id === 'macos-x64-service');
  assert.equal(macosService.nativeInstallLayout.service.manager, 'launchd');
  assert.equal(
    macosService.nativeInstallLayout.files.serviceRunner,
    '/Library/Application Support/sdkwork/router/service/macos/clawrouter-service-runner',
  );
  assertNativePermission(macosService.nativeInstallLayout.permissions, {
    path: '/Library/Application Support/sdkwork/router',
    owner: 'root',
    group: 'wheel',
    mode: '0750',
  });
  assertNativePermission(macosService.nativeInstallLayout.permissions, {
    path: '/Library/Application Support/sdkwork/router/.env.release.example',
    owner: 'root',
    group: 'wheel',
    mode: '0640',
  });
  assertNativePermission(macosService.nativeInstallLayout.permissions, {
    path: '/Library/Application Support/sdkwork/router/clawrouter.toml.example',
    owner: 'root',
    group: 'wheel',
    mode: '0640',
  });
  assertNativePermission(macosService.nativeInstallLayout.permissions, {
    path: '/var/log/sdkwork/router',
    owner: 'root',
    group: 'wheel',
    mode: '0750',
  });
  const macosServicePostinstall = module.createMacosPostinstall(macosService);
  assert.ok(macosServicePostinstall.includes('chown root:wheel "/Library/Application Support/sdkwork/router"'));
  assert.ok(macosServicePostinstall.includes('chmod 0750 "/Library/Application Support/sdkwork/router"'));
  assert.ok(macosServicePostinstall.includes('chmod 0640 "/Library/Application Support/sdkwork/router/.env.release.example"'));
  assert.ok(macosServicePostinstall.includes('chmod 0640 "/Library/Application Support/sdkwork/router/clawrouter.toml.example"'));
  assert.ok(macosServicePostinstall.includes('chown root:wheel /var/log/sdkwork/router'));
  assert.ok(macosServicePostinstall.includes('chmod 0750 /var/log/sdkwork/router'));
  assert.deepEqual(
    validator.validateWindowsNativeManifest(windowsService.package, { nativeInstall: windowsService.nativeInstallLayout }),
    [],
  );
  assert.deepEqual(
    validator.validateMacosNativeManifest(macosService.package, { nativeInstall: macosService.nativeInstallLayout }),
    [],
  );
});

test('sdkwork workflow validates native installer payload layouts before upload', () => {
  const workflow = JSON.parse(readFileSync(path.join(workspaceRoot, 'sdkwork.workflow.json'), 'utf8'));
  const validateSource = JSON.stringify(workflow.lifecycle?.validate ?? []);
  assert.ok(validateSource.includes('Validate selected install package'));
  assert.ok(validateSource.includes('node scripts/validate-claw-router-install-artifacts.mjs'));
  assert.ok(validateSource.includes('--package-id $legacyPackageId'));
  assert.ok(validateSource.includes('--artifact-path $file.FullName'));
});

test('sdkwork workflow can opt into CDN download links without making CDN mandatory', () => {
  const workflow = JSON.parse(readFileSync(path.join(workspaceRoot, 'sdkwork.workflow.json'), 'utf8'));
  const buildSource = JSON.stringify(workflow.lifecycle?.build ?? []);
  assert.ok(buildSource.includes('CLAWROUTER_DOWNLOAD_CDN_BASE_URL'));
  assert.ok(buildSource.includes('if ($env:CLAWROUTER_DOWNLOAD_CDN_BASE_URL)'));
  assert.ok(buildSource.includes('--cdn-base-url'));
  assert.ok(buildSource.includes('node scripts/update-claw-router-downloads.mjs @downloadArgs'));
});

test('install package tar writer supports long production asset paths', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'build-claw-router-install-package.mjs')).href
  );
  const longPath = 'portal/dist/assets/admin/operations/runtime/chunks/sdkwork-clawrouter-pc-admin-operations-runtime-production-entrypoint-bundle-abcdef1234567890.js';
  assert.ok(longPath.length > 100);
  const tarBytes = module.createTar([
    {
      relativePath: longPath,
      data: Buffer.from('asset'),
      mode: 0o644,
    },
  ]);
  const tarEntries = readTarEntries(tarBytes);
  assert.equal(tarEntries.get(longPath)?.size, 5);
  assert.equal(tarEntries.get(longPath)?.mode, 0o644);
});

test('install package archive builder CLI emits pure JSON when requested', async () => {
  const fixtureRoot = path.join(workspaceRoot, '.tmp', 'install-package-json-cli-test');
  const stagingRoot = path.join(fixtureRoot, 'staging');
  const outputDir = path.join(fixtureRoot, 'out');
  rmSync(fixtureRoot, { recursive: true, force: true });
  mkdirSync(path.join(stagingRoot, 'bin'), { recursive: true });
  mkdirSync(path.join(stagingRoot, 'portal', 'dist', 'sdk-archives'), { recursive: true });
  writeFileSync(path.join(stagingRoot, 'bin', 'clawrouter.exe'), 'gateway-binary');
  writeFileSync(path.join(stagingRoot, 'bin', 'clawrouterctl.exe'), 'installer-binary');
  writeFileSync(path.join(stagingRoot, 'portal', 'dist', 'index.html'), '<!doctype html>');
  writeFileSync(path.join(stagingRoot, 'portal', 'dist', 'sdk-archives', 'sdk.zip'), 'sdk-archive');
  writeFileSync(path.join(stagingRoot, '.env.release.example'), 'PORTAL_PUBLIC_API_BASE_URL=/v1\n');

  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      path.join(workspaceRoot, 'scripts', 'build-claw-router-install-package.mjs'),
      '--package-id',
      'windows-x64-archive',
      '--staging-root',
      stagingRoot,
      '--output-dir',
      outputDir,
      '--json',
    ], {
      cwd: workspaceRoot,
      maxBuffer: 1024 * 1024 * 4,
    });
    const payload = JSON.parse(stdout);
    assert.equal(stderr, '');
    assert.equal(payload.ok, true);
    assert.equal(payload.archive.packageId, 'windows-x64-archive');
    assert.match(payload.archive.sha256, /^[a-f0-9]{64}$/u);
    assert.ok(!stdout.includes('[install-package-build] package:'));
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('install package builder CLI checks the full package matrix in dry-run mode', async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [
    path.join(workspaceRoot, 'scripts', 'build-claw-router-install-package.mjs'),
    '--all',
    '--check',
    '--dry-run',
    '--json',
  ], {
    cwd: workspaceRoot,
    maxBuffer: 1024 * 1024 * 4,
  });
  const payload = JSON.parse(stdout);
  assert.equal(stderr, '');
  assert.equal(payload.ok, true);
  assert.equal(payload.plans.length, 24);
  assert.deepEqual(payload.issues, []);
  assert.ok(payload.plans.some((plan) => plan.package.id === 'windows-x64-service'));
  assert.ok(payload.plans.some((plan) => plan.package.id === 'linux-arm64-container'));
  assert.ok(payload.plans.some((plan) => plan.package.id === 'macos-arm64-desktop'));
  assert.ok(payload.plans.every((plan) =>
    plan.entries.some((entry) => entry.archivePath === 'install-manifest.json')
  ));
});

test('install init smoke validates fast initialization without starting dev services', async () => {
  const rootPackage = JSON.parse(
    readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'),
  );
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'smoke-install-package-init.mjs')).href
  );

  assert.equal(
    rootPackage.scripts['install:init:smoke'],
    'node scripts/smoke-install-package-init.mjs --check --dry-run',
  );
  assert.deepEqual(module.parseInstallInitSmokeArgs(['--check', '--dry-run', '--json']), {
    check: true,
    dryRun: true,
    help: false,
    installerBin: null,
    json: true,
    keepTmp: false,
    packageId: 'windows-x64-archive',
    packageRoot: null,
    tmpRoot: null,
    version: '0.3.0',
  });

  const fixtureRoot = path.join(workspaceRoot, '.tmp', 'install-init-smoke-test');
  rmSync(fixtureRoot, { recursive: true, force: true });
  try {
    const smokePlan = module.createInstallInitSmokePlan({
      packageId: 'linux-x64-archive',
      tmpRoot: fixtureRoot,
      version: '0.1.0',
      requireInstaller: false,
    });
    assert.equal(smokePlan.package.id, 'linux-x64-archive');
    assert.equal(smokePlan.mode, 'contract-dry-run');
    assert.equal(smokePlan.databaseEngine, 'postgresql');
    assert.equal(smokePlan.deploymentMode, 'server');
    assert.equal(smokePlan.databaseUrl, 'postgresql://release-smoke.invalid:5432/sdkwork_claw_router');
    assert.equal(smokePlan.databasePath, null);
    assert.ok(smokePlan.databasePasswordPath.endsWith('database.secret'));
    assert.equal(smokePlan.releaseEnvPath, path.join(fixtureRoot, '.env.release'));
    assert.equal(smokePlan.runtimeConfigPath, path.join(fixtureRoot, 'clawrouter.toml'));
    assert.deepEqual(smokePlan.healthChecks, ['/healthz', '/readyz']);
    assert.ok(smokePlan.steps.some((step) =>
      step.id === 'release-env-write' && step.command.includes('write-release-env.mjs')
    ));
    assert.ok(smokePlan.steps.some((step) =>
      step.id === 'database-ensure' && step.command === './bin/clawrouterctl ensure'
    ));
    assert.ok(smokePlan.steps.some((step) =>
      step.id === 'catalog-refresh' && step.command === './bin/clawrouterctl refresh-catalog --force'
    ));
    assert.ok(!smokePlan.steps.some((step) =>
      step.command.includes('pnpm dev') || step.command.includes('smoke:dev')
    ));
    assert.deepEqual(module.validateInstallInitSmokePlan(smokePlan), []);

    const result = await module.runInstallInitSmoke(smokePlan, { dryRun: true });
    assert.equal(result.ok, true);
    assert.equal(result.executedInstaller, false);
    assert.equal(result.releaseEnv.written, true);
    assert.equal(result.releaseEnv.containsLocalDatabaseUrl, false);
    assert.equal(result.releaseEnv.containsConfigFile, true);
    assert.equal(result.releaseEnv.containsHostSecret, false);
    assert.equal(existsSync(smokePlan.releaseEnvPath), true);
    const writtenEnv = readFileSync(smokePlan.releaseEnvPath, 'utf8');
    assert.ok(writtenEnv.includes('SDKWORK_CLAW_CONFIG_FILE='));
    assert.ok(!writtenEnv.includes('SDKWORK_CLAW_DATABASE_URL="sqlite://'));
    assert.ok(writtenEnv.includes('SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL="postgres://release-smoke.invalid:5432/sdkwork_claw_router"'));
    const writtenConfig = readFileSync(smokePlan.runtimeConfigPath, 'utf8');
    assert.ok(writtenConfig.includes('engine = "postgresql"'));
    assert.ok(writtenConfig.includes('host = "release-smoke.invalid"'));
    assert.ok(writtenConfig.includes('username = "release_smoke"'));
    assert.ok(writtenConfig.includes('password_file = "'));
    assert.ok(writtenConfig.includes('deployment_mode = "server"'));
    assert.ok(!writtenEnv.includes('SDKWORK_SECRET'));

    const desktopSmokePlan = module.createInstallInitSmokePlan({
      packageId: 'linux-x64-desktop',
      tmpRoot: path.join(fixtureRoot, 'desktop'),
      version: '0.1.0',
      requireInstaller: false,
    });
    assert.equal(desktopSmokePlan.databaseEngine, 'sqlite');
    assert.equal(desktopSmokePlan.databaseUrl, `sqlite://${path.join(fixtureRoot, 'desktop', 'clawrouter-install-init.sqlite').replaceAll('\\', '/')}`);
    assert.ok(desktopSmokePlan.databasePath.endsWith('clawrouter-install-init.sqlite'));
    assert.deepEqual(module.validateInstallInitSmokePlan(desktopSmokePlan), []);

    const rendered = module.renderInstallInitSmokePlan(smokePlan).join('\n');
    assert.ok(rendered.includes('[install-init-smoke] package: linux-x64-archive'));
    assert.ok(rendered.includes('[install-init-smoke] mode: contract-dry-run'));
    assert.ok(rendered.includes('[install-init-smoke] database: postgresql'));
    assert.ok(!rendered.includes('pnpm dev'));
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('install init smoke CLI emits pure JSON for CI dry-run checks', async () => {
  const fixtureRoot = path.join(workspaceRoot, '.tmp', 'install-init-smoke-json-test');
  rmSync(fixtureRoot, { recursive: true, force: true });
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      path.join(workspaceRoot, 'scripts', 'smoke-install-package-init.mjs'),
      '--package-id',
      'linux-arm64-container',
      '--tmp-root',
      fixtureRoot,
      '--check',
      '--dry-run',
      '--json',
    ], {
      cwd: workspaceRoot,
      maxBuffer: 1024 * 1024 * 4,
    });
    const payload = JSON.parse(stdout);
    assert.equal(stderr, '');
    assert.equal(payload.ok, true);
    assert.equal(payload.plan.package.id, 'linux-arm64-container');
    assert.equal(payload.result.executedInstaller, false);
    assert.equal(payload.result.releaseEnv.containsLocalDatabaseUrl, false);
    assert.equal(payload.result.releaseEnv.containsConfigFile, true);
    assert.equal(payload.plan.deploymentMode, 'server');
    assert.equal(payload.result.database.engine, 'postgresql');
    assert.equal(payload.result.database.passwordFileExists, true);
    assert.ok(!stdout.includes('[install-init-smoke] package:'));
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('install init smoke resolves installer binaries from package root and rejects missing package roots', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'smoke-install-package-init.mjs')).href
  );

  const fixtureRoot = path.join(workspaceRoot, '.tmp', 'install-init-smoke-package-root-test');
  const packageRoot = path.join(fixtureRoot, 'package');
  rmSync(fixtureRoot, { recursive: true, force: true });
  mkdirSync(path.join(packageRoot, 'bin'), { recursive: true });
  writeFileSync(path.join(packageRoot, 'bin', 'clawrouterctl'), 'installer-binary');

  try {
    const smokePlan = module.createInstallInitSmokePlan({
      packageId: 'linux-x64-archive',
      packageRoot,
      tmpRoot: path.join(fixtureRoot, 'tmp'),
      installerBin: 'bin/clawrouterctl',
      requireInstaller: true,
    });
    assert.equal(smokePlan.packageRoot, packageRoot);
    assert.equal(smokePlan.installerBin, path.join(packageRoot, 'bin', 'clawrouterctl'));
    assert.deepEqual(module.validateInstallInitSmokePlan(smokePlan), []);

    const missingRootPlan = module.createInstallInitSmokePlan({
      packageId: 'linux-x64-archive',
      packageRoot: path.join(fixtureRoot, 'missing-package'),
      tmpRoot: path.join(fixtureRoot, 'tmp-missing'),
      installerBin: 'bin/clawrouterctl',
      requireInstaller: true,
    });
    assert.ok(
      module.validateInstallInitSmokePlan(missingRootPlan)
        .some((issue) => issue.includes('packageRoot must exist when provided')),
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('production SDK archiver creates deterministic ZIP artifacts for generated SDKs', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'archive-claw-router-sdks.mjs')).href
  );

  assert.deepEqual(module.parseSdkArchiveArgs(['--dry-run']), {
    dryRun: true,
    help: false,
    outputDir: null,
  });
  assert.equal(
    module.defaultSdkArchiveRoot(workspaceRoot),
    path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'dist', 'sdk-archives'),
  );
  assert.deepEqual(module.defaultSdkArchiveSpecs().map((spec) => spec.archiveName), [
    'sdkwork-clawrouter-app-sdk-typescript-0.1.0.zip',
    'sdkwork-clawrouter-backend-sdk-typescript-0.1.0.zip',
    'sdkwork-clawrouter-open-sdk-typescript-0.1.0.zip',
  ]);
  assert.ok(module.defaultSdkArchiveSpecs().every((spec) => spec.language === 'typescript'));
  assert.ok(module.defaultSdkArchiveSpecs().every((spec) => spec.sourceDir.startsWith('sdks/')));

  const manifest = module.buildSdkArchiveManifest(
    module.defaultSdkArchiveSpecs(),
    new Map([
      ['sdkwork-clawrouter-app-sdk-typescript-0.1.0.zip', { size: 1200, sha256: 'a'.repeat(64) }],
      ['sdkwork-clawrouter-backend-sdk-typescript-0.1.0.zip', { size: 2200, sha256: 'b'.repeat(64) }],
      ['sdkwork-clawrouter-open-sdk-typescript-0.1.0.zip', { size: 3200, sha256: 'c'.repeat(64) }],
    ]),
  );
  assert.deepEqual(manifest.archives.map((archive) => archive.file), [
    'sdkwork-clawrouter-app-sdk-typescript-0.1.0.zip',
    'sdkwork-clawrouter-backend-sdk-typescript-0.1.0.zip',
    'sdkwork-clawrouter-open-sdk-typescript-0.1.0.zip',
  ]);
  assert.equal(manifest.archives[0].packageName, '@sdkwork/clawrouter-app-sdk');
  assert.equal(manifest.archives[1].packageName, '@sdkwork/clawrouter-backend-sdk');
  assert.equal(manifest.archives[2].packageName, '@sdkwork/clawrouter-open-sdk');
  assert.match(JSON.stringify(manifest), /generatedAt/);
});

test('Rust edge SDK archive tool API is constrained to generated SDK packages', () => {
  const edgeServerSource = readFileSync(
    path.join(workspaceRoot, 'crates', 'sdkwork-clawrouter-cloud-gateway', 'src', 'edge_server.rs'),
    'utf8',
  );
  const edgeServerTestSource = readFileSync(
    path.join(workspaceRoot, 'crates', 'sdkwork-clawrouter-cloud-gateway', 'tests', 'edge_server.rs'),
    'utf8',
  );

  assert.ok(edgeServerSource.includes('sdkwork-clawrouter-app-sdk-typescript-0.1.0.zip'));
  assert.ok(edgeServerSource.includes('sdkwork-clawrouter-backend-sdk-typescript-0.1.0.zip'));
  assert.ok(edgeServerSource.includes('@sdkwork/clawrouter-app-sdk'));
  assert.ok(edgeServerSource.includes('@sdkwork/clawrouter-backend-sdk'));
  assert.ok(edgeServerSource.includes('SdkworkAppClient'));
  assert.ok(edgeServerSource.includes('unsupported_sdk_archive'));
  assert.ok(!edgeServerSource.includes('ClawRouterSDK'));
  assert.ok(!edgeServerSource.includes('sdkwork-clawrouter-sdk'));
  assert.ok(!edgeServerSource.includes('"sdkwork-clawrouter-sdk"'));
  assert.ok(!edgeServerSource.includes('sdkwork-clawrouter-sdk-typescript-1.0.0.zip'));
  assert.ok(!edgeServerTestSource.includes('ClawRouterSDK'));
  assert.ok(!edgeServerTestSource.includes('@sdkwork/clawrouter-sdk'));
  assert.ok(!edgeServerTestSource.includes('sdkwork-clawrouter-sdk-typescript-1.0.0.zip'));
});

test('API router product chain is covered from portal services through SDK and Rust edge', () => {
  const modelServiceSource = readFileSync(
    path.join(
      workspaceRoot,
      'apps',
      'sdkwork-clawrouter-pc',
      'packages',
      'sdkwork-clawrouter-pc-models',
      'src',
      'modelService.ts',
    ),
    'utf8',
  );
  const playgroundServiceSource = readFileSync(
    path.join(
      workspaceRoot,
      'apps',
      'sdkwork-clawrouter-pc',
      'packages',
      'sdkwork-clawrouter-pc-playground',
      'src',
      'playgroundService.ts',
    ),
    'utf8',
  );
  const appRuntimeApiOperationsSource = readFileSync(
    path.join(
      workspaceRoot,
      'apps',
      'sdkwork-clawrouter-pc',
      'packages',
      'sdkwork-clawrouter-pc-playground',
      'src',
      'appRuntimeApiOperations.ts',
    ),
    'utf8',
  );
  const appSdkRouterSource = readFileSync(
    path.join(
      workspaceRoot,
      'sdks',
      'clawrouter-app-sdk',
      'clawrouter-app-sdk-typescript',
      'src',
      'api',
      'ai.ts',
    ),
    'utf8',
  );
  const modelsAppSdkRouterSource = readFileSync(
    path.join(
      workspaceRoot,
      'data',
      'sdkwork-models',
      'sdks',
      'sdkwork-models-app-sdk',
      'sdkwork-models-app-sdk-typescript',
      'generated',
      'server-openapi',
      'src',
      'api',
      'ai.ts',
    ),
    'utf8',
  );
  const generationsAppSdkRouterSource = readFileSync(
    path.join(
      workspaceRoot,
      '..',
      'sdkwork-generations',
      'sdks',
      'sdkwork-generations-app-sdk',
      'sdkwork-generations-app-sdk-typescript',
      'generated',
      'server-openapi',
      'src',
      'api',
      'generations.ts',
    ),
    'utf8',
  );
  const manifest = JSON.parse(
    readFileSync(path.join(workspaceRoot, 'generated', 'api', 'api-contract-manifest.json'), 'utf8'),
  );
  const openapi = JSON.parse(
    readFileSync(path.join(workspaceRoot, 'generated', 'openapi', 'clawrouter-app-openapi.json'), 'utf8'),
  );
  const appApiSource = readFileSync(
    path.join(workspaceRoot, 'crates', 'sdkwork-routes-clawrouter-app-api', 'src', 'routes.rs'),
    'utf8',
  );
  const appRoutingReadSource = readFileSync(
    path.join(workspaceRoot, 'services', 'sdkwork-clawrouter-router-service', 'src', 'api', 'app_routing.rs'),
    'utf8',
  );
  const appRoutingCommandSource = readFileSync(
    path.join(workspaceRoot, 'services', 'sdkwork-clawrouter-router-service', 'src', 'api', 'app_routing_channel_command.rs'),
    'utf8',
  );
  const appRoutingStrategySource = readFileSync(
    path.join(workspaceRoot, 'services', 'sdkwork-clawrouter-router-service', 'src', 'api', 'app_routing_strategy.rs'),
    'utf8',
  );
  const appModelsSource = readFileSync(
    path.join(
      workspaceRoot,
      'data',
      'sdkwork-models',
      'crates',
      'sdkwork-models-catalog-service',
      'src',
      'api',
      'app_models.rs',
    ),
    'utf8',
  );
  const appGenerationHistorySource = readFileSync(
    path.join(
      workspaceRoot,
      'services',
      'sdkwork-clawrouter-router-service',
      'src',
      'api',
      'app_generation_history.rs',
    ),
    'utf8',
  );
  const appDatabaseTestSource = readFileSync(
    path.join(workspaceRoot, 'services', 'sdkwork-clawrouter-standalone-gateway', 'tests', 'database_config_router.rs'),
    'utf8',
  );
  const edgeSmokeSource = readFileSync(
    path.join(workspaceRoot, 'crates', 'sdkwork-clawrouter-cloud-gateway', 'tests', 'edge_server_sqlite_smoke.rs'),
    'utf8',
  );
  const gatewayRuntimeSource = readFileSync(
    path.join(workspaceRoot, 'crates', 'sdkwork-clawrouter-cloud-gateway', 'src', 'runtime.rs'),
    'utf8',
  );
  const openaiChatSource = readFileSync(
    path.join(workspaceRoot, 'services', 'sdkwork-clawrouter-router-service', 'src', 'api', 'openai_chat.rs'),
    'utf8',
  );
  const openaiChatTestSource = readFileSync(
    path.join(workspaceRoot, 'crates', 'sdkwork-clawrouter-cloud-gateway', 'tests', 'openai_chat_route.rs'),
    'utf8',
  );
  const appAiServiceSurface = `${modelServiceSource}\n${playgroundServiceSource}\n${appRuntimeApiOperationsSource}`;

  const requiredAppRouterOperations = [
    {
      operation: 'fetchModels',
      method: 'GET',
      manifestPath: '/app/v3/api/ai/models',
      sdkPath: '/ai/models',
      frontendService: 'ModelService',
      rustSource: appModelsSource,
      rustRoutePath: '/app/v3/api/ai/models',
      edgeSmokePath: '/app/v3/api/ai/models',
    },
    {
      operation: 'fetchGenerationHistory',
      method: 'GET',
      manifestPath: '/app/v3/api/ai/generations',
      sdkPath: '/generations',
      frontendService: 'PlaygroundService',
      rustSource: appGenerationHistorySource,
      rustRoutePath: '/app/v3/api/ai/generations',
      edgeSmokePath: '/app/v3/api/ai/generations',
      sdkAuthority: 'generations',
      skipOpenApiCheck: true,
      skipRustRouteCheck: true,
      skipEdgeSmokeCheck: true,
    },
    {
      operation: 'fetchChannels',
      method: 'GET',
      manifestPath: '/app/v3/api/ai/routing/channels',
      sdkPath: '/ai/routing/channels',
      frontendService: 'RoutingService',
      rustSource: appRoutingReadSource,
      rustRoutePath: '/app/v3/api/ai/routing/channels',
      edgeSmokePath: '/app/v3/api/ai/routing/channels',
    },
    {
      operation: 'createChannel',
      method: 'POST',
      manifestPath: '/app/v3/api/ai/routing/channels',
      sdkPath: '/ai/routing/channels',
      frontendService: 'RoutingService',
      rustSource: appRoutingCommandSource,
      rustRoutePath: '/app/v3/api/ai/routing/channels',
      edgeSmokePath: '/app/v3/api/ai/routing/channels',
    },
    {
      operation: 'updateChannel',
      method: 'PUT',
      manifestPath: '/app/v3/api/ai/routing/channels/{channelId}',
      sdkPath: '/ai/routing/channels/${channelId}',
      frontendService: 'RoutingService',
      rustSource: appRoutingCommandSource,
      rustRoutePath: '/app/v3/api/ai/routing/channels/{channel_id}',
      edgeSmokePath: '/app/v3/api/ai/routing/channels/{created_channel_id}',
    },
    {
      operation: 'deleteChannel',
      method: 'DELETE',
      manifestPath: '/app/v3/api/ai/routing/channels/{channelId}',
      sdkPath: '/ai/routing/channels/${channelId}',
      frontendService: 'RoutingService',
      rustSource: appRoutingCommandSource,
      rustRoutePath: '/app/v3/api/ai/routing/channels/{channel_id}',
      edgeSmokePath: '/app/v3/api/ai/routing/channels/{created_channel_id}',
    },
    {
      operation: 'setChannelStatus',
      method: 'PUT',
      manifestPath: '/app/v3/api/ai/routing/channels/{channelId}/status',
      sdkPath: '/ai/routing/channels/${channelId}/status',
      frontendService: 'RoutingService',
      rustSource: appRoutingCommandSource,
      rustRoutePath: '/app/v3/api/ai/routing/channels/{channel_id}/status',
      edgeSmokePath: '/app/v3/api/ai/routing/channels/{created_channel_id}/status',
    },
    {
      operation: 'testChannel',
      method: 'POST',
      manifestPath: '/app/v3/api/ai/routing/channels/{channelId}/verify',
      sdkPath: '/ai/routing/channels/${channelId}/verify',
      frontendService: 'RoutingService',
      rustSource: appRoutingCommandSource,
      rustRoutePath: '/app/v3/api/ai/routing/channels/{channel_id}/verify',
      edgeSmokePath: '/app/v3/api/ai/routing/channels/{created_channel_id}/verify',
    },
    {
      operation: 'fetchApiKeys',
      method: 'GET',
      manifestPath: '/app/v3/api/ai/routing/api_keys',
      sdkPath: '/ai/routing/api_keys',
      frontendService: 'RoutingService',
      rustSource: appRoutingReadSource,
      rustRoutePath: '/app/v3/api/ai/routing/api_keys',
      edgeSmokePath: '/app/v3/api/ai/routing/api_keys',
    },
    {
      operation: 'fetchRequestTraces',
      method: 'GET',
      manifestPath: '/app/v3/api/ai/routing/request_traces',
      sdkPath: '/ai/routing/request_traces',
      frontendService: 'RoutingService',
      rustSource: appRoutingReadSource,
      rustRoutePath: '/app/v3/api/ai/routing/request_traces',
      edgeSmokePath: '/app/v3/api/ai/routing/request_traces',
    },
    {
      operation: 'fetchStrategy',
      method: 'GET',
      manifestPath: '/app/v3/api/ai/routing/strategy',
      sdkPath: '/ai/routing/strategy',
      frontendService: 'RoutingService',
      rustSource: appRoutingStrategySource,
      rustRoutePath: '/app/v3/api/ai/routing/strategy',
      edgeSmokePath: '/app/v3/api/ai/routing/strategy',
    },
    {
      operation: 'updateStrategy',
      method: 'PUT',
      manifestPath: '/app/v3/api/ai/routing/strategy',
      sdkPath: '/ai/routing/strategy',
      frontendService: 'RoutingService',
      rustSource: appRoutingStrategySource,
      rustRoutePath: '/app/v3/api/ai/routing/strategy',
      edgeSmokePath: '/app/v3/api/ai/routing/strategy',
    },
    {
      operation: 'fetchUsageData',
      method: 'GET',
      manifestPath: '/app/v3/api/ai/routing/usage',
      sdkPath: '/ai/routing/usage',
      frontendService: 'RoutingService',
      rustSource: appRoutingReadSource,
      rustRoutePath: '/app/v3/api/ai/routing/usage',
      edgeSmokePath: '/app/v3/api/ai/routing/usage',
    },
  ];

  const sdkServiceCallByOperation = {
    fetchModels: 'getModelsAppSdkClient().ai.models.list(',
    fetchGenerationHistory: 'fetchPlaygroundGenerationHistoryFromService(',
    fetchChannels: 'getClawRouterAppSdkClient().ai.routing.channels.list()',
    createChannel: 'getClawRouterAppSdkClient().ai.routing.channels.create(',
    updateChannel: 'getClawRouterAppSdkClient().ai.routing.channels.update(',
    deleteChannel: 'getClawRouterAppSdkClient().ai.routing.channels.delete(',
    setChannelStatus: 'getClawRouterAppSdkClient().ai.routing.channels.status.update(',
    testChannel: 'getClawRouterAppSdkClient().ai.routing.channels.verify(',
    fetchApiKeys: 'getClawRouterAppSdkClient().ai.routing.apiKeys.list()',
    fetchRequestTraces: 'getClawRouterAppSdkClient().ai.routing.requestTraces.list()',
    fetchStrategy: 'getClawRouterAppSdkClient().ai.routing.strategy.list()',
    updateStrategy: 'getClawRouterAppSdkClient().ai.routing.strategy.update(',
    fetchUsageData: 'getClawRouterAppSdkClient().ai.routing.usage.list()',
  };

  const sdkMethodByOperation = {
    fetchModels: 'async list(',
    fetchGenerationHistory: 'async list(',
    fetchChannels: 'async list(',
    createChannel: 'async create(',
    updateChannel: 'async update(',
    deleteChannel: 'async delete(',
    setChannelStatus: 'async update(',
    testChannel: 'async verify(',
    fetchApiKeys: 'async list(',
    fetchRequestTraces: 'async list(',
    fetchStrategy: 'async list(',
    updateStrategy: 'async update(',
    fetchUsageData: 'async list(',
  };

  const sdkOperationIdByOperation = {
    fetchModels: 'models.list',
    fetchGenerationHistory: 'generations.list',
    fetchChannels: 'routing.channels.list',
    createChannel: 'routing.channels.create',
    updateChannel: 'routing.channels.update',
    deleteChannel: 'routing.channels.delete',
    setChannelStatus: 'routing.channels.status.update',
    testChannel: 'routing.channels.verify',
    fetchApiKeys: 'routing.apiKeys.list',
    fetchRequestTraces: 'routing.requestTraces.list',
    fetchStrategy: 'routing.strategy.list',
    updateStrategy: 'routing.strategy.update',
    fetchUsageData: 'routing.usage.list',
  };

  const sdkRouterSourceByOperation = {
    fetchModels: modelsAppSdkRouterSource,
    fetchGenerationHistory: generationsAppSdkRouterSource,
  };

  const assertGeneratedSdkPath = (operation) => {
    const sdkRouterSource = sdkRouterSourceByOperation[operation.operation] ?? appSdkRouterSource;
    if (!operation.sdkPath.includes('${')) {
      assert.ok(
        sdkRouterSource.includes(`appApiPath(\`${operation.sdkPath}\`)`),
        `${operation.operation} must use the generated app SDK path ${operation.sdkPath}`,
      );
      return;
    }

    const staticFragments = operation.sdkPath
      .split(/\$\{[^}]+\}/u)
      .filter(Boolean);
    for (const fragment of staticFragments) {
      assert.ok(
        sdkRouterSource.includes(fragment),
        `${operation.operation} must include generated app SDK path fragment ${fragment}`,
      );
    }
    for (const paramName of operation.sdkPath.matchAll(/\$\{([^}]+)\}/gu)) {
      assert.ok(
        sdkRouterSource.includes(`serializePathParameter(${paramName[1]}`),
        `${operation.operation} must serialize SDK path parameter ${paramName[1]}`,
      );
    }
  };

  const requiredPortalAppRouterOperations = requiredAppRouterOperations.filter(
    (operation) => operation.frontendService !== 'RoutingService',
  );

  for (const operation of requiredPortalAppRouterOperations) {
    const manifestOperation = manifest.operations.find((entry) =>
      entry.source === (
        operation.operation === 'fetchModels'
          ? 'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/modelService.ts'
          : 'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/playgroundService.ts'
      )
      && entry.operation === operation.operation
      && entry.api_path === operation.manifestPath
      && entry.api_method === operation.method
      && entry.sdk_client === 'SdkworkAppClient'
      && entry.sdk_family === 'clawrouter-app-sdk',
    );
    assert.ok(manifestOperation, `${operation.operation} must be declared in the app manifest`);
    assert.equal(
      manifestOperation.route,
      operation.operation === 'fetchModels'
        ? '/models'
        : '/playground',
    );
    assert.equal(manifestOperation.sdk_api_prefix, '/app/v3/api');
    assert.ok(
      appAiServiceSurface.includes(sdkServiceCallByOperation[operation.operation]),
      `${operation.operation} must call the generated app SDK from the portal service boundary`,
    );
    assert.ok(
      (sdkRouterSourceByOperation[operation.operation] ?? appSdkRouterSource).includes(
        sdkMethodByOperation[operation.operation],
      ),
      `${operation.operation} must be exposed by the generated app SDK`,
    );
    assertGeneratedSdkPath(operation);
    if (!operation.skipOpenApiCheck) {
      assert.equal(
        openapi.paths[operation.manifestPath]?.[operation.method.toLowerCase()]?.operationId,
        sdkOperationIdByOperation[operation.operation],
        `${operation.operation} must be present in generated OpenAPI at ${operation.method} ${operation.manifestPath}`,
      );
    }
    if (!operation.skipRustRouteCheck) {
      assert.ok(
        operation.rustSource.includes(operation.rustRoutePath),
        `${operation.operation} must be implemented by the Rust app API router`,
      );
    }
    if (!operation.skipEdgeSmokeCheck) {
      assert.ok(
        edgeSmokeSource.includes(operation.edgeSmokePath),
        `${operation.operation} must be exercised through the unified Rust edge server smoke test`,
      );
    }
  }

  const playgroundModelGroupsOperation = manifest.operations.find((entry) =>
    entry.source === 'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-playground/src/playgroundService.ts'
    && entry.operation === 'fetchModelGroups',
  );
  assert.ok(
    playgroundModelGroupsOperation,
    'fetchModelGroups must remain tracked as a local Playground view over the standard app model catalog',
  );
  assert.equal(playgroundModelGroupsOperation.api_path, '/app/v3/api/ai/models');
  assert.equal(playgroundModelGroupsOperation.api_method, 'GET');
  assert.equal(playgroundModelGroupsOperation.sdk_client, 'SdkworkAppClient');
  assert.equal(playgroundModelGroupsOperation.sdk_family, 'clawrouter-app-sdk');
  assert.equal(playgroundModelGroupsOperation.openapi_exposed, false);
  assert.equal(playgroundModelGroupsOperation.operation_id, 'playground.models.grouped');
  assert.ok(
    appAiServiceSurface.includes('getModelsAppSdkClient().ai.models.list('),
    'fetchModelGroups must reuse the generated app SDK model catalog method',
  );
  assert.ok(
    !appAiServiceSurface.includes(`getClawRouterAppSdkClient().ai.${['playground', 'models'].join('.')}.list(`),
    'fetchModelGroups must not call a Playground-specific SDK model catalog method',
  );
  assert.ok(
    !appSdkRouterSource.includes(['playground', 'models', 'list'].join('.')),
    'the generated app SDK must not expose a Playground-specific model catalog operation',
  );
  const removedPlaygroundModelsPath = [
    '/app/v3/api/ai/playground',
    '/models',
  ].join('');
  assert.equal(openapi.paths[removedPlaygroundModelsPath], undefined);
  assert.equal(openapi.paths['/app/v3/api/ai/models']?.get?.operationId, 'models.list');
  assert.ok(appModelsSource.includes('/app/v3/api/ai/models'));
  assert.ok(!appModelsSource.includes(removedPlaygroundModelsPath));

  assert.ok(appApiSource.includes('app_routing_router_with_read_store'));
  assert.ok(appApiSource.includes('app_routing_strategy_router_with_store'));
  assert.ok(appApiSource.includes('app_routing_channel_command_router_with_store'));
  assert.ok(appApiSource.includes('app_model_catalog_router'));
  assert.ok(appDatabaseTestSource.includes('database_config_app_routing_routes_require_session_scope_and_redact_sensitive_data'));
  assert.ok(appDatabaseTestSource.includes('database_config_app_routing_channel_commands_persist_and_scope_without_secret_leakage'));
  assert.ok(appDatabaseTestSource.includes('/app/v3/api/ai/routing/strategy'));
  assert.ok(appDatabaseTestSource.includes('/app/v3/api/ai/routing/channels'));

  assert.ok(gatewayRuntimeSource.includes('router_with_openai_runtime_routes'));
  assert.ok(gatewayRuntimeSource.includes('openai_chat_completions_router_with_relays_usage_recorder_plugins_and_runtime_config'));
  assert.ok(openaiChatSource.includes('/v1/chat/completions'));
  assert.ok(openaiChatSource.includes('GatewayUsageRecorder'));
  assert.ok(openaiChatSource.includes('build_usage_record_command'));
  assert.ok(openaiChatSource.includes('record_gateway_usage(command)'));
  assert.ok(openaiChatSource.includes('provider_usage_record_failed'));
  assert.ok(openaiChatSource.includes('StreamingUsageRecordingBody'));
  assert.ok(openaiChatTestSource.includes('gateway_mounts_openai_chat_completions_boundary_without_fake_success'));
});

test('portal SDK reference uses real generated SDK package metadata for downloads', () => {
  const sdkReferenceSource = readFileSync(
    path.join(documentsSdkReferenceRoot, 'src', 'pages', 'SdkReference.tsx'),
    'utf8',
  );
  const sdkDataSource = readFileSync(
    path.join(documentsSdkReferenceRoot, 'src', 'data', 'sdkData.ts'),
    'utf8',
  );
  const sdkClientBoundarySource = readFileSync(
    path.join(
      workspaceRoot,
      'apps',
      'sdkwork-clawrouter-pc',
      'packages',
      'sdkwork-clawroutes-pc-commons',
      'src',
      'sdk-clients.ts',
    ),
    'utf8',
  );
  const documentsReferenceAdapterSource = readFileSync(
    path.join(
      workspaceRoot,
      'apps',
      'sdkwork-clawrouter-pc',
      'packages',
      'sdkwork-clawroutes-pc-commons',
      'src',
      'documents-reference-runtime-adapter.ts',
    ),
    'utf8',
  );
  const appSdkPackage = JSON.parse(
    readFileSync(
      path.join(
        workspaceRoot,
        'sdks',
        'clawrouter-app-sdk',
        'clawrouter-app-sdk-typescript',
        'package.json',
      ),
      'utf8',
    ),
  );
  const backendSdkPackage = JSON.parse(
    readFileSync(
      path.join(
        workspaceRoot,
        'sdks',
        'clawrouter-backend-sdk',
        'clawrouter-backend-sdk-typescript',
        'package.json',
      ),
      'utf8',
    ),
  );
  const referenceSurface = `${sdkReferenceSource}\n${sdkDataSource}`;
  const sdkMetadataSurface = `${referenceSurface}\n${sdkClientBoundarySource}\n${documentsReferenceAdapterSource}`;

  assert.ok(sdkDataSource.includes('getSdkSystemConfig'));
  assert.ok(sdkDataSource.includes('getGeneratedSdkMetadataForSystem'));
  assert.ok(sdkClientBoundarySource.includes('CLAWROUTER_APP_SDK_REFERENCE_METADATA'));
  assert.ok(sdkClientBoundarySource.includes('CLAWROUTER_BACKEND_SDK_REFERENCE_METADATA'));
  assert.ok(documentsReferenceAdapterSource.includes('SDK_SYSTEM_CONFIG'));
  assert.ok(documentsReferenceAdapterSource.includes('clawRouterDocumentsReferenceRuntime'));
  assert.ok(sdkMetadataSurface.includes(appSdkPackage.name));
  assert.ok(sdkMetadataSurface.includes(appSdkPackage.version));
  assert.ok(sdkMetadataSurface.includes(backendSdkPackage.name));
  assert.ok(sdkMetadataSurface.includes(backendSdkPackage.version));
  assert.ok(sdkMetadataSurface.includes('SdkworkAppClient'));
  assert.ok(sdkMetadataSurface.includes('SdkworkBackendClient'));
  assert.ok(sdkMetadataSurface.includes('/app/v3/api'));
  assert.ok(sdkMetadataSurface.includes('/backend/v3/api'));
  assert.ok(sdkMetadataSurface.includes('sdkwork-clawrouter-app-sdk-typescript-0.1.0.zip'));
  assert.ok(sdkMetadataSurface.includes('sdkwork-clawrouter-backend-sdk-typescript-0.1.0.zip'));
  assert.ok(referenceSurface.includes('isGeneratedSdkArchiveLanguage'));
  assert.ok(referenceSurface.includes('localToolApiEnabled && isGeneratedSdkArchiveLanguage(activeSdk.id)'));
  assert.ok(!referenceSurface.includes('@sdkwork/clawrouter-sdk'));
  assert.ok(!referenceSurface.includes('@sdkwork/clawrouter-management-sdk'));
  assert.ok(!referenceSurface.includes('@sdkwork/clawrouter-portal-sdk'));
  assert.ok(!sdkReferenceSource.includes("version: '1.0.0'"));
  assert.ok(!sdkReferenceSource.includes('systemNameSlug'));
});

test('portal model catalog API examples use the generated app SDK package', () => {
  const modelCatalogSource = readFileSync(
    path.join(
      workspaceRoot,
      'apps',
      'sdkwork-clawrouter-pc',
      'packages',
      'sdkwork-clawrouter-pc-models',
      'src',
      'modelCatalog.ts',
    ),
    'utf8',
  );
  const sdkClientBoundarySource = readFileSync(
    path.join(
      workspaceRoot,
      'apps',
      'sdkwork-clawrouter-pc',
      'packages',
      'sdkwork-clawroutes-pc-commons',
      'src',
      'sdk-clients.ts',
    ),
    'utf8',
  );

  assert.ok(modelCatalogSource.includes('createClawRouterAppSdkModelExample'));
  assert.ok(sdkClientBoundarySource.includes("@sdkwork/clawrouter-app-sdk"));
  assert.ok(sdkClientBoundarySource.includes('SdkworkAppClient'));
  assert.ok(sdkClientBoundarySource.includes('/app/v3/api'));
  assert.ok(!modelCatalogSource.includes("@sdkwork/clawrouter-sdk"));
  assert.ok(!modelCatalogSource.includes('ClawRouterClient'));
});

test('postgres integration runner exposes optional and required execution modes', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'run-postgres-integration.mjs')).href
  );

  assert.deepEqual(module.parseArgs(['--require-database', '--', '--nocapture']), {
    withDocker: false,
    keepDocker: false,
    requireDatabase: true,
    dryRun: false,
    help: false,
    extraArgs: ['--nocapture'],
  });
  assert.deepEqual(module.postgresIntegrationCargoArgs(['--nocapture']), [
    'test',
    '-p',
    'sdkwork-clawrouter-router-service',
    '--test',
    'postgres_transaction_integration',
    '--',
    '--nocapture',
  ]);
  assert.equal(
    module.hasPostgresDatabaseUrl({
      SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL: 'postgres://example',
    }),
    true,
  );
  assert.equal(module.hasPostgresDatabaseUrl({}), false);
});

test('postgres integration runner can plan an ephemeral Docker database', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'run-postgres-integration.mjs')).href
  );

  assert.deepEqual(module.parseArgs(['--with-docker', '--keep-docker', '--', '--nocapture']), {
    withDocker: true,
    keepDocker: true,
    requireDatabase: false,
    dryRun: false,
    help: false,
    extraArgs: ['--nocapture'],
  });

  const plan = module.createPostgresIntegrationPlan(
    {
      withDocker: true,
      keepDocker: false,
      requireDatabase: false,
      dryRun: false,
      help: false,
      extraArgs: ['--nocapture'],
    },
    { SDKWORK_CLAW_POSTGRES_TEST_PORT: '15439' },
    workspaceRoot,
  );

  assert.deepEqual(plan.steps.map((step) => step.label), [
    'docker availability check',
    'postgres docker up',
    'postgres transaction integration',
    'postgres docker down',
  ]);
  assert.deepEqual(plan.steps[0].args, ['version', '--format', '{{.Server.Version}}']);
  assert.equal(plan.steps[0].quiet, true);
  assert.deepEqual(plan.steps[1].args, [
    'compose',
    '-p',
    'sdkwork-clawrouter-postgres-test',
    '-f',
    path.join(workspaceRoot, 'docker-compose.postgres-test.yml'),
    'up',
    '-d',
    '--wait',
  ]);
  assert.equal(
    plan.steps[2].env.SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL,
    'postgres://sdkwork_claw_test:sdkwork_claw_test_password@127.0.0.1:15439/sdkwork_claw_test',
  );
  assert.deepEqual(plan.steps[3].args.slice(-2), ['--volumes', '--remove-orphans']);
});

test('postgres integration runner handles package-manager argument separators', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'run-postgres-integration.mjs')).href
  );

  assert.deepEqual(module.parseArgs(['--with-docker', '--', '--dry-run']), {
    withDocker: true,
    keepDocker: false,
    requireDatabase: false,
    dryRun: true,
    help: false,
    extraArgs: [],
  });
  assert.deepEqual(module.parseArgs(['--with-docker', '--', '--nocapture']).extraArgs, [
    '--nocapture',
  ]);
  assert.deepEqual(module.postgresIntegrationCargoArgs(['--nocapture']), [
    'test',
    '-p',
    'sdkwork-clawrouter-router-service',
    '--test',
    'postgres_transaction_integration',
    '--',
    '--nocapture',
  ]);
  assert.deepEqual(module.postgresIntegrationCargoArgs(['postgres_gateway_usage_recorder']), [
    'test',
    '-p',
    'sdkwork-clawrouter-router-service',
    '--test',
    'postgres_transaction_integration',
    '--',
    'postgres_gateway_usage_recorder',
  ]);
  assert.deepEqual(
    module.postgresIntegrationCargoArgs(['postgres_gateway_usage_recorder', '--nocapture']),
    [
      'test',
      '-p',
      'sdkwork-clawrouter-router-service',
      '--test',
      'postgres_transaction_integration',
      '--',
      'postgres_gateway_usage_recorder',
      '--nocapture',
    ],
  );
});

test('verification plan treats Rust warnings as compile failures', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );

  const plan = module.buildVerificationPlan(
    { skipRustTests: true, skipPythonTests: true, skipSchemaGate: true },
    { RUSTFLAGS: '-C debuginfo=0' },
  );
  const rustCheck = plan.find((step) => step.label === 'rust compile warnings gate');

  assert.equal(rustCheck.env.RUSTFLAGS, '-C debuginfo=0 -D warnings');
});

test('verification plan clears inherited single-job Cargo settings by default', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );

  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: true, skipSchemaGate: true },
    { CARGO_BUILD_JOBS: '1' },
  );
  const rustCheck = plan.find((step) => step.label === 'rust compile warnings gate');
  const rustWorkspaceTests = plan.find((step) => step.label === 'rust workspace tests');

  assert.equal('CARGO_BUILD_JOBS' in rustCheck.env, false);
  assert.equal('CARGO_BUILD_JOBS' in rustWorkspaceTests.env, false);
});

test('verification plan constrains Cargo artifact size for full workspace gates', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );

  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: true, skipSchemaGate: true },
    { CARGO_INCREMENTAL: '1', CARGO_PROFILE_TEST_DEBUG: '2' },
  );
  const rustCheck = plan.find((step) => step.label === 'rust compile warnings gate');
  const rustWorkspaceTests = plan.find((step) => step.label === 'rust workspace tests');

  assert.equal(rustCheck.env.CARGO_INCREMENTAL, '0');
  assert.equal(rustWorkspaceTests.env.CARGO_INCREMENTAL, '0');
  assert.equal(rustCheck.env.CARGO_PROFILE_DEV_DEBUG, '0');
  assert.equal(rustWorkspaceTests.env.CARGO_PROFILE_TEST_DEBUG, '0');
  assert.equal(rustWorkspaceTests.env.CARGO_PROFILE_TEST_INCREMENTAL, 'false');
});

test('verification plan runs full Rust tests through the scoped Rust test runner', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );

  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: true, skipSchemaGate: true },
    {},
  );
  const rustWorkspaceTests = plan.find((step) => step.label === 'rust workspace tests');

  assert.equal(rustWorkspaceTests.command, 'node');
  assert.deepEqual(rustWorkspaceTests.args, [
    'scripts/run-claw-router-rust-tests.mjs',
    'full',
    '--target-dir',
    'target-verify',
    '--test-threads',
    '1',
  ]);
});

test('verification plan supports explicit Cargo build job overrides', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );

  const parsed = module.parseArgs(['--build-jobs', '6']);
  assert.equal(parsed.buildJobs, '6');

  const plan = module.buildVerificationPlan(
    {
      buildJobs: '6',
      skipRustTests: false,
      skipPythonTests: true,
      skipSchemaGate: true,
    },
    { CARGO_BUILD_JOBS: '1' },
  );
  const rustCheck = plan.find((step) => step.label === 'rust compile warnings gate');
  const rustWorkspaceTests = plan.find((step) => step.label === 'rust workspace tests');

  assert.equal(rustCheck.env.CARGO_BUILD_JOBS, '6');
  assert.equal(rustWorkspaceTests.env.CARGO_BUILD_JOBS, '6');
});

test('verification plan isolates cargo check and test targets from shared debug artifacts', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );

  const plan = module.buildVerificationPlan(
    {
      withEdgeDevSmoke: true,
      skipRustTests: false,
      skipPythonTests: true,
      skipSchemaGate: true,
    },
    {},
  );
  const rustCheck = plan.find((step) => step.label === 'rust compile warnings gate');
  const productionBuild = plan.find((step) => step.label === 'production artifact build');
  const edgeDevSmoke = plan.find((step) => step.label === 'edge dev server smoke');
  const edgeSmoke = plan.find((step) => step.label === 'portal production edge smoke');
  const browserSmoke = plan.find((step) => step.label === 'portal production browser DOM smoke');
  const rustWorkspaceTests = plan.find((step) => step.label === 'rust workspace tests');

  assert.equal(rustCheck.env.CARGO_TARGET_DIR, 'target-verify');
  assert.equal(edgeDevSmoke.env.CARGO_TARGET_DIR, 'target-verify');
  assert.equal(edgeSmoke.env.CARGO_TARGET_DIR, 'target-verify');
  assert.equal(browserSmoke.env.CARGO_TARGET_DIR, 'target-verify');
  assert.equal(rustWorkspaceTests.env.CARGO_TARGET_DIR, 'target-verify');
  assert.equal(productionBuild.env.CARGO_TARGET_DIR, undefined);
});

test('verification runner handles package-manager argument separators', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );

  assert.deepEqual(module.parseArgs(['--', '--dry-run']), {
    buildJobs: null,
    fast: false,
    withEdgeDevSmoke: false,
    skipEdgeDevSmoke: false,
    skipRustTests: false,
    skipPythonTests: false,
    skipSchemaGate: false,
    skipContractGuardians: false,
    precommit: false,
    ci: false,
    parallel: false,
    concurrency: 4,
    dryRun: true,
    help: false,
  });
  assert.deepEqual(module.parseArgs(['--', '--with-edge-dev-smoke']).withEdgeDevSmoke, true);
  assert.deepEqual(module.parseArgs(['--', '--skip-edge-dev-smoke']).skipEdgeDevSmoke, true);
  assert.deepEqual(module.parseArgs(['--', '--skip-contract-guardians']).skipContractGuardians, true);
  assert.deepEqual(module.parseArgs(['--precommit']).precommit, true);
  assert.deepEqual(module.parseArgs(['--parallel']).parallel, true);
  assert.deepEqual(module.parseArgs(['--parallel', '--concurrency', '6']).concurrency, 6);
  assert.deepEqual(module.parseArgs(['--fast']), {
    buildJobs: null,
    fast: true,
    withEdgeDevSmoke: false,
    skipEdgeDevSmoke: false,
    skipRustTests: false,
    skipPythonTests: false,
    skipSchemaGate: false,
    skipContractGuardians: false,
    precommit: false,
    ci: false,
    parallel: false,
    concurrency: 4,
    dryRun: false,
    help: false,
  });
});

test('precommit verification plan keeps commit-time checks lightweight and staged-aware', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );

  const plan = module.buildVerificationPlan({ precommit: true }, {});
  const labels = plan.map((step) => step.label);
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);

  assert.deepEqual(labels, [
    'sdkwork-models catalog check',
    'claw router download catalog check',
    'app store seed check',
    'skills seed check',
    'repository delivery guard',
    'agent workflow standard check',
    'pnpm script standard check',
    'api contract materialization check',
    'application env standard check',
    'gateway request identity check',
    'database framework standard check',
    'topology spec validate',
    'topology contract tests',
    'app-topology core tests',
    'IAM embedded bootstrap workspace audit',
    'tooling contract tests',
    'app SDK runtime build',
    'backend SDK runtime build',
    'open SDK runtime build',
    'frontend source hygiene tests',
    'admin route registry runtime tests',
    'admin file platform storage runtime tests',
    'admin file platform drive runtime tests',
    'admin agents runtime tests',
    'admin skill runtime tests',
    'staged Rust auto tests',
  ]);
  assert.deepEqual(commandLines.at(-1), 'node scripts/run-claw-router-rust-tests.mjs auto --staged');
  assert.ok(!labels.includes('portal frontend typecheck'));
  assert.ok(!labels.includes('production artifact build'));
  assert.ok(!labels.includes('portal production browser DOM smoke'));
  assert.ok(!labels.includes('rust compile warnings gate'));
  assert.ok(!labels.includes('rust workspace tests'));
  assert.ok(!labels.includes('python standard tests'));
  assert.ok(!labels.includes('schema quality gate'));
});

test('ci verification plan extends precommit with rust format and admin api integration gates', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );

  const plan = module.buildVerificationPlan({ ci: true }, {});
  const labels = plan.map((step) => step.label);
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);

  assert.ok(labels.includes('admin agents runtime tests'));
  assert.ok(labels.includes('admin skill runtime tests'));
  assert.ok(labels.includes('rust format for frequently touched packages'));
  assert.ok(labels.includes('admin api sqlite integration tests'));
  assert.ok(labels.indexOf('rust format for frequently touched packages') > labels.indexOf('staged Rust auto tests'));
  assert.ok(labels.indexOf('admin api sqlite integration tests') > labels.indexOf('rust format for frequently touched packages'));
  assert.equal(
    commandLines.at(-1),
    `${module.pnpmCommand()} --dir apps/sdkwork-clawrouter-pc typecheck`,
  );
  assert.ok(labels.includes('portal frontend typecheck'));
  assert.ok(!labels.includes('production artifact build'));
  assert.ok(!labels.includes('schema quality gate'));
});

test('parallel verification execution plan groups only dependency-safe expensive checks', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );

  const settings = {
    parallel: true,
    concurrency: 3,
    skipRustTests: false,
    skipPythonTests: false,
    skipSchemaGate: false,
  };
  const executionPlan = module.buildVerificationExecutionPlan(settings, {});
  const groupedLabels = executionPlan.groups.map((group) => group.steps.map((step) => step.label));
  const flatLabels = groupedLabels.flat();

  assert.equal(executionPlan.parallel, true);
  assert.equal(executionPlan.concurrency, 3);
  assert.deepEqual(flatLabels, module.buildVerificationPlan(settings, {}).map((step) => step.label));
  assert.ok(groupedLabels.some((labels) =>
    labels.includes('app SDK runtime build')
      && labels.includes('backend SDK runtime build')
      && labels.includes('open SDK runtime build'),
  ));
  assert.ok(groupedLabels.some((labels) =>
    labels.includes('portal admin group runtime tests')
      && labels.includes('portal admin channel runtime tests')
      && labels.includes('portal admin user runtime tests'),
  ));
  for (const labels of groupedLabels) {
    assert.ok(!labels.includes('rust compile warnings gate') || labels.length === 1);
    assert.ok(!labels.includes('rust workspace tests') || labels.length === 1);
    assert.ok(!labels.includes('portal production browser DOM smoke') || labels.length === 1);
  }
});

test('fast verification plan refreshes SDK dist before low-cost Codex iteration checks', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );

  const plan = module.buildVerificationPlan({ fast: true }, {});
  const labels = plan.map((step) => step.label);
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);

  assert.deepEqual(labels, [
    'sdkwork-models catalog check',
    'claw router download catalog check',
    'app store seed check',
    'skills seed check',
    'repository delivery guard',
    'agent workflow standard check',
    'pnpm script standard check',
    'api contract materialization check',
    'application env standard check',
    'topology spec validate',
    'topology contract tests',
    'app-topology core tests',
    'IAM embedded bootstrap workspace audit',
    'tooling contract tests',
    'app SDK runtime build',
    'backend SDK runtime build',
    'open SDK runtime build',
    'portal auth runtime tests',
    'frontend source hygiene tests',
  ]);
  assert.deepEqual(commandLines, [
    'pnpm.cmd models:check',
    'pnpm.cmd downloads:check',
    'pnpm.cmd app-store:seed:check',
    'pnpm.cmd skills:seed:check',
    'python -B -m tools.repository_delivery_guardian',
    'pnpm.cmd check:agent-workflow-standard',
    'pnpm.cmd check:pnpm-script-standard',
    'pnpm.cmd api:materialize:check',
    'pnpm.cmd check:application-env',
    'node ../sdkwork-app-topology/scripts/sdkwork-topology.mjs validate --root . --spec specs/topology.spec.json',
    'node --test --experimental-test-isolation=none scripts/verify-claw-router-topology.test.mjs',
    'node --test --experimental-test-isolation=none ../sdkwork-app-topology/tests/topology-core.test.mjs',
    'node ../sdkwork-specs/tools/audit-iam-embedded-bootstrap-workspace.mjs',
    'node scripts/run-claw-router-application.test.mjs',
    'pnpm.cmd --dir sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi build',
    'pnpm.cmd --dir sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi build',
    'pnpm.cmd --dir sdks/clawrouter-open-sdk/clawrouter-open-sdk-typescript/generated/server-openapi build',
    'pnpm.cmd --dir apps/sdkwork-clawrouter-pc exec tsx auth-runtime.test.ts',
    'python -B -m unittest tests.test_frontend_source_hygiene_standard',
  ]);
  assert.ok(!labels.includes('rust compile warnings gate'));
  assert.ok(!labels.includes('clawrouter generated SDK guard'));
  assert.ok(!labels.includes('portal vite config runtime tests'));
  assert.ok(!labels.includes('portal frontend typecheck'));
  assert.ok(!labels.includes('portal production build'));
  assert.ok(!labels.includes('portal production browser DOM smoke'));
  assert.ok(!labels.includes('edge dev server smoke'));
  assert.ok(!labels.includes('rust workspace tests'));
  assert.ok(!labels.includes('python standard tests'));
  assert.ok(!labels.includes('schema quality gate'));
});

test('verification plan skips edge dev server smoke by default', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: true, skipPythonTests: true, skipSchemaGate: true },
    {},
  );
  assert.ok(!plan.some((step) => step.label === 'edge dev server smoke'));
});

test('verification plan does not treat CI as implicit edge dev smoke opt-in', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: true, skipPythonTests: true, skipSchemaGate: true },
    { CI: 'true' },
  );
  assert.ok(!plan.some((step) => step.label === 'edge dev server smoke'));
});

test('verification plan can include edge dev server smoke through explicit environment opt-in', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: true, skipPythonTests: true, skipSchemaGate: true },
    { CLAWROUTER_VERIFY_EDGE_DEV_SMOKE: '1' },
  );
  assert.ok(plan.some((step) => step.label === 'edge dev server smoke'));
});

test('verification plan can include edge dev server smoke when explicitly requested', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    {
      withEdgeDevSmoke: true,
      skipRustTests: true,
      skipPythonTests: true,
      skipSchemaGate: true,
    },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const toolingIndex = plan.findIndex((step) => step.label === 'tooling contract tests');
  const viteConfigRuntimeIndex = plan.findIndex((step) => step.label === 'portal vite config runtime tests');
  const smokeIndex = plan.findIndex((step) => step.label === 'edge dev server smoke');
  const typecheckIndex = plan.findIndex((step) => step.label === 'portal frontend typecheck');
  const smokeSource = readFileSync(
    path.join(workspaceRoot, 'scripts', 'smoke-edge-dev-server.mjs'),
    'utf8',
  );
  const rootReadme = readFileSync(path.join(workspaceRoot, 'README.md'), 'utf8');
  const portalReadme = readFileSync(
    path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'README.md'),
    'utf8',
  );

  assert.ok(smokeIndex > toolingIndex, 'edge dev smoke must run after launch-contract tests');
  assert.ok(smokeIndex > viteConfigRuntimeIndex, 'edge dev smoke must run after portal Vite config runtime tests');
  assert.ok(smokeIndex < typecheckIndex, 'edge dev smoke must run before artifact-only frontend checks');
  assert.ok(commandLines.includes(
    'node --experimental-strip-types apps/sdkwork-clawrouter-pc/vite-config-runtime.test.ts',
  ));
  assert.ok(commandLines.includes('node scripts/smoke-edge-dev-server.mjs'));
  assert.ok(smokeSource.includes('pnpm dev:server'));
  assert.ok(smokeSource.includes('/healthz'));
  assert.ok(smokeSource.includes('/readyz'));
  assert.ok(smokeSource.includes('/openapi.json'));
  assert.ok(smokeSource.includes('/backend/v3/api/openapi.json'));
  assert.ok(smokeSource.includes('/app/v3/api/openapi.json'));
  assert.ok(smokeSource.includes('/runtime-env.js'));
  assert.ok(smokeSource.includes("label: 'direct portal gateway OpenAPI proxy'"));
  assert.ok(smokeSource.includes("label: 'direct portal backend OpenAPI proxy'"));
  assert.ok(smokeSource.includes("label: 'direct portal app OpenAPI proxy'"));
  assert.ok(smokeSource.includes('PORTAL_PUBLIC_API_BASE_URL=/v1'));
  assert.ok(smokeSource.includes('PORTAL_PUBLIC_OPEN_API_BASE_URL=/v1'));
  assert.ok(smokeSource.includes('PORTAL_PUBLIC_BACKEND_API_BASE_URL=/backend/v3/api'));
  assert.ok(smokeSource.includes('PORTAL_PUBLIC_APP_API_BASE_URL=/app/v3/api'));
  assert.ok(
    smokeSource.includes("process.env.CLAWROUTER_EDGE_DEV_SMOKE_TIMEOUT_MS ?? '900000'"),
    'edge dev smoke default timeout must allow full seed install and explicit product server services to start on Windows',
  );
  assert.ok(smokeSource.includes('CLAWROUTER_EDGE_DEV_SMOKE_REQUIRED'));
  assert.ok(smokeSource.includes('[edge-dev-smoke] skipped: ${diagnostic}'));
  assert.ok(smokeSource.includes('requires this smoke to launch real processes'));
  assert.ok(smokeSource.includes('local shell or CI runner that permits Node child_process.spawn'));
  assert.ok(smokeSource.includes('isProcessSpawnPermissionError(exit.error)'));
  assert.match(smokeSource, /taskkill/u);
  assert.match(smokeSource, /killProcessTree/u);
  assert.ok(rootReadme.includes('pnpm.cmd smoke:dev'));
  assert.ok(rootReadme.includes('Direct Portal Gateway API Proxy'));
  assert.ok(rootReadme.includes('Direct Portal App API OpenAPI Proxy'));
  assert.ok(rootReadme.includes('CLAWROUTER_EDGE_DEV_SMOKE_REQUIRED="1"'));
  assert.ok(rootReadme.includes('--with-edge-dev-smoke'));
  assert.ok(portalReadme.includes('pnpm.cmd smoke:dev'));
  assert.ok(portalReadme.includes('Direct Portal Gateway API Proxy'));
  assert.ok(portalReadme.includes('Direct Portal App API OpenAPI Proxy'));
  assert.ok(portalReadme.includes('CLAWROUTER_EDGE_DEV_SMOKE_REQUIRED="1"'));
});

test('edge dev smoke validates the current gateway and surface OpenAPI contract shapes', () => {
  const smokeSource = readFileSync(
    path.join(workspaceRoot, 'scripts', 'smoke-edge-dev-server.mjs'),
    'utf8',
  );
  const gatewayOpenApi = JSON.parse(
    readFileSync(path.join(portalRoot, 'public', 'openapi.json'), 'utf8'),
  );
  const backendOpenApi = JSON.parse(
    readFileSync(path.join(workspaceRoot, 'generated', 'openapi', 'clawrouter-backend-openapi.json'), 'utf8'),
  );
  const appOpenApi = JSON.parse(
    readFileSync(path.join(workspaceRoot, 'generated', 'openapi', 'clawrouter-app-openapi.json'), 'utf8'),
  );

  assert.equal(gatewayOpenApi.openapi, '3.0.3');
  assert.equal(gatewayOpenApi.info?.title, 'Claw Router Open API');
  assert.equal(gatewayOpenApi['x-api-prefix'], '/v1');
  for (const apiPath of [
    '/v1/models',
    '/v1/chat/completions',
    '/v1/responses',
    '/google/v1beta/models/{model}:generateContent',
  ]) {
    assert.ok(gatewayOpenApi.paths?.[apiPath], `gateway OpenAPI must expose ${apiPath}`);
    assert.ok(
      smokeSource.includes(`payload.paths?.['${apiPath}']`),
      `edge dev smoke must validate ${apiPath}`,
    );
  }
  assert.ok(smokeSource.includes("payload.openapi !== '3.0.3'"));
  assert.ok(smokeSource.includes("payload.info?.title !== 'Claw Router Open API'"));
  assert.ok(smokeSource.includes("payload['x-api-prefix'] !== '/v1'"));

  const surfaceAssertionStart = smokeSource.indexOf('function assertSurfaceOpenApi');
  const surfaceAssertionEnd = smokeSource.indexOf('function assertPortalHtml');
  assert.ok(surfaceAssertionStart >= 0, 'edge dev smoke must define surface OpenAPI validation');
  assert.ok(surfaceAssertionEnd > surfaceAssertionStart, 'surface OpenAPI validation must stay isolated');
  const surfaceAssertionSource = smokeSource.slice(surfaceAssertionStart, surfaceAssertionEnd);
  assert.ok(
    !surfaceAssertionSource.includes('x-api-prefix'),
    'app/backend SDK surface validation must not use URL prefix as SDK ownership signal',
  );
  assert.ok(
    !surfaceAssertionSource.includes("payload.openapi !== '3.0.3'"),
    'app/backend SDK surface validation must accept current OpenAPI 3.x contracts',
  );
  assert.ok(surfaceAssertionSource.includes('expectedTitle'));
  assert.ok(surfaceAssertionSource.includes('requiredPaths'));

  for (const contract of [
    {
      openApi: backendOpenApi,
      expectedTitle: 'SDKWork Claw Router Backend API',
      requiredPaths: [
        '/backend/v3/api/ai/model_vendors',
        '/backend/v3/api/recharges/packages',
      ],
    },
    {
      openApi: appOpenApi,
      expectedTitle: 'SDKWork Claw Router App API',
      requiredPaths: [
        '/app/v3/api/ai/models',
        '/app/v3/api/recharges/packages',
      ],
    },
  ]) {
    assert.match(String(contract.openApi.openapi ?? ''), /^3\./u);
    assert.equal(contract.openApi.info?.title, contract.expectedTitle);
    assert.ok(
      smokeSource.includes(`expectedTitle: '${contract.expectedTitle}'`),
      `edge dev smoke must validate ${contract.expectedTitle}`,
    );
    for (const apiPath of contract.requiredPaths) {
      assert.ok(contract.openApi.paths?.[apiPath], `${contract.expectedTitle} must expose ${apiPath}`);
      assert.ok(
        smokeSource.includes(`'${apiPath}'`),
        `edge dev smoke must validate ${apiPath}`,
      );
    }
  }
});

test('edge dev smoke isolates SQLite and validates public app model browse data', () => {
  const smokeSource = readFileSync(
    path.join(workspaceRoot, 'scripts', 'smoke-edge-dev-server.mjs'),
    'utf8',
  );

  assert.ok(smokeSource.includes('isolatedSmokeDatabaseUrl()'));
  assert.ok(smokeSource.includes("'--database-url'"));
  assert.match(smokeSource, /path\.join\(\s*'target',\s*'dev-smoke',/u);
  assert.ok(smokeSource.includes('/app/v3/api/ai/models?page=1&page_size=6'));
  assert.ok(smokeSource.includes('assertPublicBrowseEnvelope'));
  assert.ok(smokeSource.includes('SDKWork Claw Router'));
  assert.ok(smokeSource.includes('must not require authorization'));
});

test('verification plan can skip edge dev server smoke for constrained environments', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    {
      skipEdgeDevSmoke: true,
      skipRustTests: true,
      skipPythonTests: true,
      skipSchemaGate: true,
    },
    {},
  );

  assert.ok(!plan.some((step) => step.label === 'edge dev server smoke'));
});

test('workspace cleanup plan defaults to rebuildable local artifacts only', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'clean-claw-router-workspace.mjs')).href
  );

  assert.deepEqual(module.parseArgs(['--dry-run', '--rust-target', '--node-modules']), {
    dryRun: true,
    rustTarget: true,
    nodeModules: true,
    help: false,
  });

  const plan = module.buildCleanPlan({ workspaceRoot });
  const relativePaths = plan.map((entry) => entry.relativePath);

  assert.ok(relativePaths.includes('.tmp'));
  assert.ok(relativePaths.includes('.pytest_cache'));
  assert.ok(relativePaths.includes('.mypy_cache'));
  assert.ok(relativePaths.includes('.ruff_cache'));
  assert.ok(relativePaths.includes(path.join('apps', 'sdkwork-clawrouter-pc', '.turbo')));
  assert.ok(relativePaths.includes(path.join('apps', 'sdkwork-clawrouter-pc', 'dist')));
  assert.ok(!relativePaths.includes('target'));
  assert.ok(!relativePaths.includes(path.join('apps', 'sdkwork-clawrouter-pc', 'node_modules')));

  const deepPlan = module.buildCleanPlan({
    workspaceRoot,
    rustTarget: true,
    nodeModules: true,
  });
  const deepRelativePaths = deepPlan.map((entry) => entry.relativePath);

  assert.ok(deepRelativePaths.includes('target'));
  assert.ok(deepRelativePaths.includes('target-rust-tests'));
  assert.ok(deepRelativePaths.includes('target-verify'));
  assert.ok(deepRelativePaths.includes('target-verify2'));
  assert.ok(deepRelativePaths.includes('target-verify-split'));
  assert.ok(deepRelativePaths.includes('target-test-fixtures'));
  assert.deepEqual(deepRelativePaths.slice(0, 6), [
    'target',
    'target-rust-tests',
    'target-verify',
    'target-verify2',
    'target-verify-split',
    'target-test-fixtures',
  ]);
  assert.ok(deepRelativePaths.includes(path.join('apps', 'sdkwork-clawrouter-pc', 'node_modules')));
});

test('workspace cleanup continues after a single artifact removal fails', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'clean-claw-router-workspace.mjs')).href
  );

  const attempted = [];
  const failures = await module.removeEntries(
    [
      { relativePath: 'locked-artifact', absolutePath: path.join(workspaceRoot, 'locked-artifact') },
      { relativePath: 'rebuildable-artifact', absolutePath: path.join(workspaceRoot, 'rebuildable-artifact') },
    ],
    {
      removeEntry: async (entry) => {
        attempted.push(entry.relativePath);
        if (entry.relativePath === 'locked-artifact') {
          throw new Error('file is locked');
        }
      },
      logWarning: () => {},
    },
  );

  assert.deepEqual(attempted, ['locked-artifact', 'rebuildable-artifact']);
  assert.deepEqual(failures.map((failure) => failure.relativePath), ['locked-artifact']);
});

test('release preflight parser supports strict, json, dry-run, and root cleanliness options', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'release-preflight.mjs')).href
  );

  assert.deepEqual(module.parseArgs([
    '--strict',
    '--json',
    '--dry-run',
    '--strict-root-clean',
    '--env-file',
    '.env.release',
  ]), {
    strict: true,
    json: true,
    dryRun: true,
    strictRootClean: true,
    envFile: '.env.release',
    help: false,
  });
  assert.deepEqual(module.parseArgs(['--', '--json']), {
    strict: false,
    json: true,
    dryRun: false,
    strictRootClean: false,
    envFile: '',
    help: false,
  });
});

test('release preflight publishes a single release environment contract', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'release-preflight.mjs')).href
  );

  assert.equal(module.RELEASE_ENVIRONMENT_CONTRACT.version, 4);
  assert.deepEqual(module.RELEASE_ENVIRONMENT_CONTRACT.requiredReleaseEnv, [
    'SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL',
  ]);
  assert.deepEqual(module.RELEASE_ENVIRONMENT_CONTRACT.requiredPortalPublicEnv, [
    'PORTAL_PUBLIC_API_BASE_URL',
    'PORTAL_PUBLIC_APP_API_BASE_URL',
    'PORTAL_PUBLIC_BACKEND_API_BASE_URL',
    'PORTAL_PUBLIC_TOOL_API_ENABLED',
  ]);
  assert.ok(module.RELEASE_ENVIRONMENT_CONTRACT.optionalEdgePrivateEnv.includes(
    'SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC',
  ));
  assert.ok(module.RELEASE_ENVIRONMENT_CONTRACT.optionalEdgePrivateEnv.includes(
    'SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS',
  ));
  assert.equal(module.RELEASE_ENVIRONMENT_CONTRACT.exampleFile, '.env.release.example');
  assert.equal(module.RELEASE_ENVIRONMENT_CONTRACT.profileFile, '.env.release');
});

test('release preflight env-file values satisfy strict release environment checks', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'release-preflight.mjs')).href
  );
  const envFile = [
    'SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL="postgres://release.example"',
    'PORTAL_PUBLIC_API_BASE_URL=https://tenant.example.com/v1',
    'PORTAL_PUBLIC_OPEN_API_BASE_URL=https://open.tenant.example.com/v1',
    'PORTAL_PUBLIC_APP_API_BASE_URL=/app/v3/api',
    'PORTAL_PUBLIC_BACKEND_API_BASE_URL=/backend/v3/api',
    'PORTAL_PUBLIC_TOOL_API_ENABLED=false',
  ].join('\n');

  const result = module.buildReleasePreflightReport({
    settings: module.parseArgs(['--strict', '--env-file', '.env.release']),
    platform: 'linux',
    env: module.mergeEnvWithEnvFile({}, envFile),
    probes: {
      branch: 'main',
      mainOriginCounts: { behind: 0, ahead: 0 },
      appStatusLines: [],
      rootStatusLines: [],
      commandVersions: {
        git: 'git version 2.51.0',
        node: 'v24.11.1',
        pnpm: '10.33.0',
        cargo: 'cargo 1.92.0',
        python: 'Python 3.13.7',
      },
      codexSessionStats: { count: 0, totalBytes: 0 },
      gitObjectHealth: { count: 0, size: '0 bytes', inPack: 1, sizePack: '1 MiB' },
      gitLfsVersion: 'git-lfs/3.7.1',
      runtimeSkillSeedFiles: [{ path: 'data/skills/skills.json', validJson: true, pointer: false }],
    },
  });
  const byId = Object.fromEntries(result.checks.map((check) => [check.id, check]));

  assert.equal(result.exitCode, 0);
  assert.equal(byId['env.releaseContract'].status, 'PASS');
  assert.equal(byId['env.postgres'].status, 'PASS');
  assert.equal(byId['env.portalPublic'].status, 'PASS');
  assert.ok(byId['env.releaseContract'].details.includes('.env.release'));
});

test('release preflight CLI reads env-file values before building the report', async () => {
  const { stdout } = await execFileAsync('node', [
    'scripts/release-preflight.mjs',
    '--dry-run',
    '--env-file',
    '.env.release.example',
    '--json',
  ], {
    cwd: workspaceRoot,
    windowsHide: true,
  });
  const parsed = JSON.parse(stdout);
  const byId = Object.fromEntries(parsed.checks.map((check) => [check.id, check]));

  assert.equal(parsed.exitCode, 0);
  assert.equal(byId['env.releaseContract'].status, 'PASS');
  assert.equal(byId['env.postgres'].status, 'PASS');
  assert.equal(byId['env.portalPublic'].status, 'PASS');
  assert.ok(byId['env.releaseContract'].details.includes('.env.release.example'));
  assert.ok(byId['env.releaseContract'].recommendation.includes('pnpm.cmd release:env:write -- --check'));
  assert.ok(byId['env.releaseContract'].recommendation.includes('pnpm.cmd release:env:write'));
  assert.ok(!byId['env.releaseContract'].recommendation.includes('Copy .env.release.example'));
});

test('release env writer creates a dotenv file from the executable contract without leaking values', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'write-release-env.mjs')).href
  );

  const plan = module.buildReleaseEnvFilePlan({
    env: validReleaseEnv,
    outputPath: '.env.release',
    overwrite: false,
    existingFile: false,
  });

  assert.equal(plan.outputPath, '.env.release');
  assert.equal(plan.safeSummary, 'release env file would be written with 19 release profile variables');
  assert.ok(plan.content.includes('SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL="postgres://release:secret@db.example.com:5432/claw"'));
  assert.ok(plan.content.includes('PORTAL_PUBLIC_OPEN_API_BASE_URL="https://open.tenant.example.com/v1"'));
  assert.ok(plan.content.includes('PORTAL_PUBLIC_TOOL_API_ENABLED="false"'));
  assert.match(plan.content, /SDKWORK_ACCESS_TOKEN="v2\./u);
  assert.ok(!plan.safeSummary.includes('secret'));
});

test('release env writer refuses unsafe overwrite and invalid values', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'write-release-env.mjs')).href
  );

  assert.throws(
    () => module.buildReleaseEnvFilePlan({
      env: {
        ...validReleaseEnv,
        PORTAL_PUBLIC_API_BASE_URL: '/v1',
      },
      outputPath: '.env.release',
      overwrite: false,
      existingFile: true,
    }),
    /\.env\.release already exists/u,
  );

  assert.throws(
    () => module.buildReleaseEnvFilePlan({
      env: {
        ...validReleaseEnv,
        PORTAL_PUBLIC_API_BASE_URL: 'javascript:alert(1)',
      },
      outputPath: '.env.release',
      overwrite: true,
      existingFile: false,
    }),
    /PORTAL_PUBLIC_API_BASE_URL/,
  );
});

test('release env writer refuses to write secrets into the checked-in example template', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'write-release-env.mjs')).href
  );

  assert.throws(
    () => module.buildReleaseEnvFilePlan({
      env: validReleaseEnv,
      outputPath: '.env.release.example',
      overwrite: true,
      existingFile: true,
    }),
    /\.env\.release\.example is a checked-in template and cannot be used as release env writer output/,
  );

  assert.throws(
    () => module.buildReleaseEnvFilePlan({
      env: validReleaseEnv,
      outputPath: path.join(workspaceRoot, '.env.release.example'),
      overwrite: true,
      existingFile: true,
    }),
    /\.env\.release\.example is a checked-in template and cannot be used as release env writer output/,
  );
});

test('release env writer CLI check prints only a safe summary', async () => {
  const { stdout } = await execFileAsync('node', [
    'scripts/write-release-env.mjs',
    '--check',
    '--output',
    '.env.release',
  ], {
    cwd: workspaceRoot,
    windowsHide: true,
    env: {
      ...process.env,
      ...validReleaseEnv,
    },
  });

  assert.ok(stdout.includes('[release-env] validated: .env.release'));
  assert.ok(stdout.includes('release env file would be written with 19 release profile variables'));
  assert.ok(!stdout.includes('secret'));
  assert.ok(!stdout.includes('tenant.example.com'));
});

test('release env writer CLI writes a local dotenv file without leaking values', async () => {
  const outputPath = path.join('.tmp', 'release-env-writer-test', '.env.release');
  const absoluteOutputPath = path.join(workspaceRoot, outputPath);
  rmSync(path.dirname(absoluteOutputPath), { recursive: true, force: true });

  try {
    const { stdout } = await execFileAsync('node', [
      'scripts/write-release-env.mjs',
      '--output',
      outputPath,
    ], {
      cwd: workspaceRoot,
      windowsHide: true,
      env: {
        ...process.env,
        ...validReleaseEnv,
      },
    });

    const written = readFileSync(absoluteOutputPath, 'utf8');
    assert.ok(stdout.includes(`[release-env] written: ${outputPath}`));
    assert.ok(stdout.includes('release env file would be written with 19 release profile variables'));
    assert.ok(!stdout.includes('secret'));
    assert.ok(!stdout.includes('tenant.example.com'));
    assert.ok(written.includes('# Generated by node scripts/write-release-env.mjs. Do not commit this file.'));
    assert.ok(written.includes('SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL="postgres://release:secret@db.example.com:5432/claw"'));
    assert.ok(written.includes('PORTAL_PUBLIC_API_BASE_URL="https://tenant.example.com/v1"'));
    assert.ok(written.includes('PORTAL_PUBLIC_OPEN_API_BASE_URL="https://open.tenant.example.com/v1"'));

    await assert.rejects(
      () => execFileAsync('node', [
        'scripts/write-release-env.mjs',
        '--output',
        outputPath,
      ], {
        cwd: workspaceRoot,
        windowsHide: true,
        env: {
          ...process.env,
          ...validReleaseEnv,
        },
      }),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stderr, /already exists; pass --force to overwrite it/);
        assert.ok(!error.stderr.includes('secret'));
        assert.ok(!error.stderr.includes('tenant.example.com'));
        return true;
      },
    );
  } finally {
    rmSync(path.dirname(absoluteOutputPath), { recursive: true, force: true });
  }
});

test('release env writer CLI check is idempotent when the output file already exists', async () => {
  const outputPath = path.join('.tmp', 'release-env-writer-check-test', '.env.release');
  const absoluteOutputPath = path.join(workspaceRoot, outputPath);
  rmSync(path.dirname(absoluteOutputPath), { recursive: true, force: true });

  try {
    mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
    writeFileSync(absoluteOutputPath, 'already generated\n', { encoding: 'utf8' });

    const { stdout } = await execFileAsync('node', [
      'scripts/write-release-env.mjs',
      '--check',
      '--output',
      outputPath,
    ], {
      cwd: workspaceRoot,
      windowsHide: true,
      env: {
        ...process.env,
        ...validReleaseEnv,
      },
    });

    assert.ok(stdout.includes(`[release-env] validated: ${outputPath}`));
    assert.ok(stdout.includes('release env file would be written with 19 release profile variables'));
    assert.equal(readFileSync(absoluteOutputPath, 'utf8'), 'already generated\n');
    assert.ok(!stdout.includes('secret'));
    assert.ok(!stdout.includes('tenant.example.com'));
  } finally {
    rmSync(path.dirname(absoluteOutputPath), { recursive: true, force: true });
  }
});

test('release preflight rejects malformed release environment values in strict mode', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'release-preflight.mjs')).href
  );

  const result = module.buildReleasePreflightReport({
    settings: module.parseArgs(['--strict', '--env-file', '.env.release']),
    platform: 'linux',
    env: {
      SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL: 'not-a-postgres-url',
      PORTAL_PUBLIC_API_BASE_URL: 'javascript:alert(1)',
      PORTAL_PUBLIC_OPEN_API_BASE_URL: 'ftp://open.example.com/v1',
      PORTAL_PUBLIC_APP_API_BASE_URL: '//evil.example.com/app',
      PORTAL_PUBLIC_BACKEND_API_BASE_URL: '/backend/v3/api#fragment',
      PORTAL_PUBLIC_TOOL_API_ENABLED: 'yes',
    },
    probes: {
      branch: 'main',
      mainOriginCounts: { behind: 0, ahead: 0 },
      appStatusLines: [],
      rootStatusLines: [],
      commandVersions: {
        git: 'git version 2.51.0',
        node: 'v24.11.1',
        pnpm: '10.33.0',
        cargo: 'cargo 1.92.0',
        python: 'Python 3.13.7',
      },
      codexSessionStats: { count: 0, totalBytes: 0 },
      gitObjectHealth: { count: 0, size: '0 bytes', inPack: 1, sizePack: '1 MiB' },
      gitLfsVersion: 'git-lfs/3.7.1',
      runtimeSkillSeedFiles: [{ path: 'data/skills/skills.json', validJson: true, pointer: false }],
    },
  });
  const byId = Object.fromEntries(result.checks.map((check) => [check.id, check]));

  assert.equal(result.exitCode, 1);
  assert.equal(byId['env.releaseContract'].status, 'FAIL');
  assert.ok(byId['env.releaseContract'].details.includes('SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL'));
  assert.ok(byId['env.releaseContract'].details.includes('PORTAL_PUBLIC_API_BASE_URL'));
  assert.ok(byId['env.releaseContract'].details.includes('PORTAL_PUBLIC_OPEN_API_BASE_URL'));
  assert.ok(byId['env.releaseContract'].details.includes('PORTAL_PUBLIC_TOOL_API_ENABLED'));
  assert.ok(byId['env.releaseContract'].details.includes('run pnpm.cmd release:env:write'));
  assert.ok(byId['env.releaseContract'].recommendation.includes('pnpm.cmd release:env:write -- --check'));
  assert.ok(!byId['env.releaseContract'].recommendation.includes('Copy .env.release.example'));
});

test('release environment documentation stays aligned with the executable contract', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'release-preflight.mjs')).href
  );
  const rootReadme = readFileSync(path.join(workspaceRoot, 'README.md'), 'utf8');
  const exampleEnv = readFileSync(path.join(workspaceRoot, '.env.release.example'), 'utf8');
  const ignored = readFileSync(path.join(workspaceRoot, '.gitignore'), 'utf8');
  const requiredNames = [
    ...module.RELEASE_ENVIRONMENT_CONTRACT.requiredReleaseEnv,
    ...module.RELEASE_ENVIRONMENT_CONTRACT.requiredPortalPublicEnv,
  ];

  assert.ok(rootReadme.includes('## Release Environment Contract'));
  assert.ok(rootReadme.includes('pnpm.cmd release:preflight -- --strict --env-file .env.release'));
  assert.ok(ignored.includes('.env.release'));
  assert.ok(!ignored.includes('.env.release.example'));
  for (const name of requiredNames) {
    assert.ok(rootReadme.includes(name), `README.md must document ${name}`);
    assert.ok(exampleEnv.includes(`${name}=`), `.env.release.example must declare ${name}`);
  }
});

test('global and application environment contracts document Claw Router runtime config standards', () => {
  const specsRoot = resolveClawRouterBusinessSpecsRoot(workspaceRoot);
  const environmentSpec = readFileSync(path.join(specsRoot, 'ENVIRONMENT_SPEC.md'), 'utf8');
  const deploymentSpec = readFileSync(path.join(specsRoot, 'DEPLOYMENT_SPEC.md'), 'utf8');
  const applicationEnvStandard = readFileSync(
    path.join(workspaceRoot, 'specs', 'application-env-standard.md'),
    'utf8',
  );

  for (const key of [
    'SDKWORK_CLAW_ROUTER_CONFIG_PROFILE',
    'SDKWORK_CLAW_ROUTER_ENVIRONMENT',
    'SDKWORK_CLAW_ROUTER_DEPLOYMENT_PROFILE',
    'SDKWORK_CLAW_ROUTER_RUNTIME_TARGET',
  ]) {
    assert.ok(applicationEnvStandard.includes(key));
  }

  for (const content of [environmentSpec, deploymentSpec]) {
    assert.ok(content.includes('SdkWork Claw Router'));
    assert.ok(content.includes('SDKWORK_CLAW_CONFIG_FILE'));
    assert.ok(content.includes('SDKWORK_<APP>_DATABASE_ENGINE'));
    assert.ok(content.includes('SDKWORK_<APP>_DATABASE_SSL_MODE'));
    assert.ok(content.includes('SDKWORK_CLAW_DATABASE_URL'));
    assert.ok(content.includes('SDKWORK_CLAW_REDIS_HOST'));
    assert.ok(content.includes('SDKWORK_CLAW_REDIS_PORT'));
    assert.ok(content.includes('SDKWORK_CLAW_REDIS_DATABASE'));
    assert.ok(content.includes('SDKWORK_CLAW_REDIS_URL'));
    assert.ok(content.includes('SDKWORK_CLAW_REDIS_KEY_PREFIX'));
    assert.ok(content.includes('SDKWORK_CLAW_REDIS_TLS'));
    assert.ok(content.includes('SDKWORK_CLAW_REDIS_MAX_CONNECTIONS'));
    assert.ok(content.includes('SDKWORK_CLAW_REDIS_CONNECT_TIMEOUT_MILLIS'));
    assert.ok(content.includes('SDKWORK_CLAW_REDIS_COMMAND_TIMEOUT_MILLIS'));
    assert.ok(content.includes('SDKWORK_CLAW_REDIS_POOL_IDLE_TIMEOUT_SECONDS'));
    assert.ok(content.includes('PORTAL_PUBLIC_BACKEND_API_BASE_URL'));
    assert.ok(content.includes('PORTAL_PUBLIC_APP_API_BASE_URL'));
    assert.ok(content.includes('/etc/sdkwork/router/clawrouter.toml'));
    assert.ok(content.includes('%ProgramData%/sdkwork/router/clawrouter.toml'));
    assert.ok(content.includes('~/.sdkwork/router/config/clawrouter.toml'));
  }
  assert.ok(environmentSpec.includes('| `standalone` | `server` | PostgreSQL |'));
  assert.ok(environmentSpec.includes('| `standalone` | `container` | PostgreSQL |'));
  assert.ok(environmentSpec.includes('.env.postgres.example'));
  assert.ok(environmentSpec.includes('SDKWORK_CLAW_DATABASE_ENGINE=postgresql'));
  assert.ok(environmentSpec.includes('SDKWORK_CLAW_DATABASE_SCHEMA=sdkwork_ai_dev'));
  assert.ok(environmentSpec.includes('SDKWORK_CLAW_DATABASE_SSL_MODE=disable'));
  assert.ok(environmentSpec.includes('SDKWORK_CLAW_DATABASE_ADMIN_SSL_MODE=disable'));
  assert.ok(environmentSpec.includes('`DATABASE_PROVIDER` and `DATABASE_SSLMODE` are not standard names'));
  assert.ok(environmentSpec.includes('password_file = "/etc/sdkwork/router/database.secret"'));
  assert.ok(environmentSpec.includes('[redis]'));
  assert.ok(environmentSpec.includes('enabled = true'));
  assert.ok(environmentSpec.includes('host = "redis.example.com"'));
  assert.ok(environmentSpec.includes('port = 6379'));
  assert.ok(environmentSpec.includes('database = 0'));
  assert.ok(environmentSpec.includes('password_file = "/etc/sdkwork/router/redis.secret"'));
  assert.ok(environmentSpec.includes('Desktop runtime targets default to SQLite.'));
  assert.ok(environmentSpec.includes('`pnpm dev:browser` and'));
  assert.ok(environmentSpec.includes('`pnpm dev:desktop` default to PostgreSQL, `unified-process`, and standalone'));
  assert.ok(environmentSpec.includes('`pnpm dev:desktop:sqlite`'));
  assert.ok(deploymentSpec.includes('Redis is enabled and required by default for cloud deployments and standalone'));
  assert.ok(deploymentSpec.includes('server/container packages that declare shared runtime state.'));
  assert.ok(deploymentSpec.includes('Desktop runtime targets keep Redis optional and disabled by default.'));
  assert.ok(deploymentSpec.includes('Desktop packages must keep local user data on SQLite by default.'));
  assert.ok(deploymentSpec.includes('belongs to dev orchestration and any launched backend service runtime;'));
  assert.ok(deploymentSpec.includes('it must not change the installed desktop package default or the desktop user'));
  const desktopArchitectureSpec = readFileSync(path.join(specsRoot, 'DESKTOP_APP_ARCHITECTURE_SPEC.md'), 'utf8');
  assert.ok(desktopArchitectureSpec.includes('Desktop local user data | SQLite'));
  assert.ok(desktopArchitectureSpec.includes('Explicit service/backend runtime started by desktop development commands | PostgreSQL'));
  assert.ok(desktopArchitectureSpec.includes('Desktop/Tauri development commands that start the product service runtime'));
  assert.ok(desktopArchitectureSpec.includes('must keep product server startup on'));
  const observabilitySpec = readFileSync(path.join(specsRoot, 'OBSERVABILITY_SPEC.md'), 'utf8');
  assert.ok(observabilitySpec.includes('Metric naming:'));
  assert.ok(observabilitySpec.includes('Labels `MUST` be low-cardinality and bounded.'));
  assert.ok(observabilitySpec.includes('Desktop-started backend service metrics must use the backend service runtime'));
  assert.ok(observabilitySpec.includes('Dashboard metric snapshots are rebuildable projections'));
  assert.ok(deploymentSpec.includes('clawrouterctl ensure'));
  assert.ok(deploymentSpec.includes('clawrouterctl refresh-catalog --force'));
});

test('release preflight parses main origin counts as local ahead then remote ahead', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'release-preflight.mjs')).href
  );

  assert.deepEqual(module.parseMainOriginCounts('2\t3'), {
    ahead: 2,
    behind: 3,
  });
});

test('release preflight documents child process probe requirements', () => {
  const rootReadme = readFileSync(path.join(workspaceRoot, 'README.md'), 'utf8');
  const releasePreflightSection = rootReadme.slice(
    rootReadme.indexOf('## Release Preflight'),
    rootReadme.indexOf('## Production Browser Smoke'),
  );
  const normalizedSection = releasePreflightSection.replace(/\s+/g, ' ');

  assert.ok(releasePreflightSection.includes('`runtime.childProcess`'));
  assert.ok(releasePreflightSection.includes('child_process.spawn'));
  assert.ok(releasePreflightSection.includes('spawn EPERM'));
  assert.ok(normalizedSection.includes('local shell or CI runner'));
  assert.ok(normalizedSection.includes('Git, tool availability, and Git object IO footprint checks are downgraded to warnings'));
});

test('release preflight dry-run reports plan-only probes without factual cleanliness claims', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'release-preflight.mjs')).href
  );

  const result = module.buildReleasePreflightReport({
    settings: module.parseArgs(['--dry-run']),
    platform: 'win32',
    env: {},
    probes: module.buildDryRunProbes('win32'),
  });
  const byId = Object.fromEntries(result.checks.map((check) => [check.id, check]));

  assert.equal(result.exitCode, 0);
  assert.equal(byId['runtime.childProcess'].status, 'WARN');
  assert.ok(byId['runtime.childProcess'].details.includes('dry-run: child process execution was not probed'));
  assert.equal(byId['git.branch'].status, 'WARN');
  assert.equal(byId['git.sync'].status, 'WARN');
  assert.equal(byId['git.appClean'].status, 'WARN');
  assert.equal(byId['git.rootClean'].status, 'WARN');
  assert.ok(byId['git.branch'].details.includes('dry-run: current branch was not probed'));
  assert.ok(byId['git.appClean'].details.includes('dry-run: application worktree was not probed'));
  assert.equal(byId['tools.git'].status, 'WARN');
  assert.equal(byId['tools.node'].status, 'WARN');
  assert.equal(byId['tools.pnpm'].status, 'WARN');
  assert.equal(byId['tools.cargo'].status, 'WARN');
  assert.equal(byId['tools.python'].status, 'WARN');
  assert.ok(byId['tools.pnpm'].details.includes('dry-run: would run pnpm.cmd --version'));
  assert.equal(byId['io.codexSessions'].status, 'WARN');
  assert.equal(byId['io.gitObjects'].status, 'WARN');
  assert.ok(byId['io.gitObjects'].details.includes('dry-run: Git object IO footprint was not probed'));
  assert.equal(byId['tools.gitLfs'].status, 'WARN');
  assert.ok(byId['tools.gitLfs'].details.includes('dry-run: would run git lfs version'));
  assert.equal(byId['data.runtimeSkillSeeds'].status, 'WARN');
  assert.ok(byId['data.runtimeSkillSeeds'].details.includes('dry-run: runtime skill seed JSON was not probed'));
});

test('release preflight dry-run probe collector reuses plan-only semantics', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'release-preflight.mjs')).href
  );

  const probes = await module.collectReleasePreflightProbes({
    workspaceRoot,
    platform: 'win32',
    dryRun: true,
  });

  assert.deepEqual(probes, module.buildDryRunProbes('win32'));
  assert.equal(probes.childProcessProbe.status, 'DRY_RUN');
  assert.equal(probes.commandVersions.pnpm, 'dry-run: would run pnpm.cmd --version');
});

test('release preflight defaults missing staging environment to warnings', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'release-preflight.mjs')).href
  );

  const result = module.buildReleasePreflightReport({
    settings: module.parseArgs([]),
    platform: 'win32',
    env: {},
    probes: {
      branch: 'main',
      mainOriginCounts: { behind: 0, ahead: 0 },
      appStatusLines: [],
      rootStatusLines: [' M spring-ai-plus-business/apps/other-app'],
      commandVersions: {
        git: 'git version 2.51.0',
        node: 'v24.11.1',
        pnpm: '10.33.0',
        cargo: 'cargo 1.92.0',
        python: 'Python 3.13.7',
      },
      codexSessionStats: { count: 8, totalBytes: 349 * 1024 * 1024 },
      gitObjectHealth: { count: 0, size: '0 bytes', inPack: 100, sizePack: '20 MiB' },
      gitLfsVersion: 'git-lfs/3.7.1',
      runtimeSkillSeedFiles: [{ path: 'data/skills/skills.json', validJson: true, pointer: false }],
    },
  });

  const byId = Object.fromEntries(result.checks.map((check) => [check.id, check]));

  assert.equal(result.exitCode, 0);
  assert.equal(byId['git.branch'].status, 'PASS');
  assert.equal(byId['git.sync'].status, 'PASS');
  assert.equal(byId['git.appClean'].status, 'PASS');
  assert.equal(byId['git.rootClean'].status, 'WARN');
  assert.equal(byId['env.postgres'].status, 'WARN');
  assert.equal(byId['env.portalPublic'].status, 'WARN');
  assert.equal(byId['io.codexSessions'].status, 'PASS');
  assert.equal(byId['io.gitObjects'].status, 'PASS');
  assert.equal(byId['tools.gitLfs'].status, 'PASS');
  assert.equal(byId['data.runtimeSkillSeeds'].status, 'PASS');
  assert.deepEqual(result.recommendedCommands, [
    'pnpm.cmd models:check',
    'pnpm.cmd verify',
    'pnpm.cmd test:postgres:required',
    'pnpm.cmd topology:plan:server',
    'pnpm.cmd clean:fast -- --dry-run',
  ]);
});

test('release preflight strict mode fails missing release environment and app dirty state', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'release-preflight.mjs')).href
  );

  const result = module.buildReleasePreflightReport({
    settings: module.parseArgs(['--strict']),
    platform: 'linux',
    env: {
      PORTAL_PUBLIC_API_BASE_URL: 'https://api.example.com',
      PORTAL_PUBLIC_APP_API_BASE_URL: 'https://api.example.com/app/v3/api',
    },
    probes: {
      branch: 'feature/preflight',
      mainOriginCounts: { behind: 1, ahead: 0 },
      appStatusLines: [' M scripts/release-preflight.mjs'],
      rootStatusLines: [' M spring-ai-plus-business/apps/sdkwork-clawrouter/scripts/release-preflight.mjs'],
      commandVersions: {
        git: 'git version 2.51.0',
        node: 'v24.11.1',
        pnpm: '10.33.0',
        cargo: '',
        python: 'Python 3.13.7',
      },
      codexSessionStats: { count: 18, totalBytes: 2_200 * 1024 * 1024 },
      gitObjectHealth: { count: 5000, size: '950 MiB', inPack: 100, sizePack: '3 GiB' },
      gitLfsVersion: '',
      runtimeSkillSeedFiles: [
        { path: 'data/skills/skills.json', validJson: true, pointer: false },
        { path: 'data/skills/artifacts.json', validJson: false, pointer: true },
      ],
    },
  });

  const byId = Object.fromEntries(result.checks.map((check) => [check.id, check]));

  assert.equal(result.exitCode, 1);
  assert.equal(byId['git.branch'].status, 'FAIL');
  assert.equal(byId['git.sync'].status, 'FAIL');
  assert.equal(byId['git.appClean'].status, 'FAIL');
  assert.equal(byId['tools.cargo'].status, 'FAIL');
  assert.equal(byId['tools.gitLfs'].status, 'WARN');
  assert.equal(byId['env.postgres'].status, 'FAIL');
  assert.equal(byId['env.portalPublic'].status, 'FAIL');
  assert.equal(byId['data.runtimeSkillSeeds'].status, 'FAIL');
  assert.equal(byId['io.codexSessions'].status, 'WARN');
  assert.equal(byId['io.gitObjects'].status, 'WARN');
  assert.ok(byId['env.portalPublic'].details.includes('PORTAL_PUBLIC_BACKEND_API_BASE_URL'));
  assert.ok(byId['env.portalPublic'].details.includes('PORTAL_PUBLIC_TOOL_API_ENABLED'));
});

test('release preflight json output is machine readable', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'release-preflight.mjs')).href
  );

  const result = module.buildReleasePreflightReport({
    settings: module.parseArgs(['--json']),
    platform: 'linux',
    env: {
      SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL: 'postgres://example',
      PORTAL_PUBLIC_API_BASE_URL: 'https://api.example.com',
      PORTAL_PUBLIC_APP_API_BASE_URL: 'https://api.example.com/app/v3/api',
      PORTAL_PUBLIC_BACKEND_API_BASE_URL: 'https://api.example.com/backend/v3/api',
      PORTAL_PUBLIC_TOOL_API_ENABLED: 'false',
    },
    probes: {
      branch: 'main',
      mainOriginCounts: { behind: 0, ahead: 0 },
      appStatusLines: [],
      rootStatusLines: [],
      commandVersions: {
        git: 'git version 2.51.0',
        node: 'v24.11.1',
        pnpm: '10.33.0',
        cargo: 'cargo 1.92.0',
        python: 'Python 3.13.7',
      },
      codexSessionStats: { count: 0, totalBytes: 0 },
      gitObjectHealth: { count: 0, size: '0 bytes', inPack: 1, sizePack: '1 MiB' },
      gitLfsVersion: 'git-lfs/3.7.1',
      runtimeSkillSeedFiles: [{ path: 'data/skills/skills.json', validJson: true, pointer: false }],
    },
  });
  const parsed = JSON.parse(module.formatReport(result, { json: true }));

  assert.equal(parsed.summary.fail, 0);
  assert.equal(parsed.summary.warn, 0);
  assert.equal(parsed.summary.pass, parsed.checks.length);
  assert.equal(parsed.recommendedCommands[0], 'pnpm models:check');
  assert.equal(parsed.recommendedCommands[1], 'pnpm verify');
});

test('release preflight report builder handles missing probes defensively', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'release-preflight.mjs')).href
  );

  const result = module.buildReleasePreflightReport({
    settings: module.parseArgs([]),
    platform: 'linux',
    env: {},
  });

  assert.equal(result.exitCode, 1);
  assert.equal(result.checks.find((check) => check.id === 'git.branch').status, 'FAIL');
  assert.equal(result.checks.find((check) => check.id === 'tools.git').status, 'FAIL');
  assert.equal(result.checks.find((check) => check.id === 'tools.gitLfs').status, 'WARN');
  assert.equal(result.checks.find((check) => check.id === 'data.runtimeSkillSeeds').status, 'WARN');
  assert.equal(result.checks.find((check) => check.id === 'io.codexSessions').status, 'PASS');
});

test('release preflight reports blocked child process probes without misdiagnosing PATH', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'release-preflight.mjs')).href
  );

  const result = module.buildReleasePreflightReport({
    settings: module.parseArgs([]),
    platform: 'win32',
    env: {},
    probes: {
      childProcessProbe: {
        status: 'BLOCKED',
        details: 'child process execution is not available in this environment: spawn EPERM',
      },
      branch: '',
      mainOriginCounts: { behind: 0, ahead: 0 },
      appStatusLines: [],
      rootStatusLines: [],
      commandVersions: {
        git: '',
        node: '',
        pnpm: '',
        cargo: '',
        python: '',
      },
      codexSessionStats: { count: 0, totalBytes: 0 },
      gitObjectHealth: { count: 0, size: '0 bytes', inPack: 0, sizePack: '0 bytes' },
      gitLfsVersion: '',
      runtimeSkillSeedFiles: [],
    },
  });

  const byId = Object.fromEntries(result.checks.map((check) => [check.id, check]));

  assert.equal(result.exitCode, 1);
  assert.equal(byId['runtime.childProcess'].status, 'FAIL');
  assert.ok(byId['runtime.childProcess'].details.includes('spawn EPERM'));
  assert.ok(byId['runtime.childProcess'].recommendation.includes('permits Node child_process'));
  assert.equal(byId['git.branch'].status, 'WARN');
  assert.equal(byId['git.sync'].status, 'WARN');
  assert.equal(byId['git.appClean'].status, 'WARN');
  assert.equal(byId['git.rootClean'].status, 'WARN');
  assert.ok(byId['git.sync'].details.includes('not probed because child process execution is blocked'));
  assert.ok(byId['git.appClean'].details.includes('not probed because child process execution is blocked'));
  assert.ok(byId['git.rootClean'].details.includes('not probed because child process execution is blocked'));
  assert.equal(byId['tools.git'].status, 'WARN');
  assert.equal(byId['tools.node'].status, 'WARN');
  assert.equal(byId['tools.pnpm'].status, 'WARN');
  assert.equal(byId['tools.cargo'].status, 'WARN');
  assert.equal(byId['tools.python'].status, 'WARN');
  assert.ok(byId['tools.git'].details.includes('not probed because child process execution is blocked'));
  assert.equal(byId['io.gitObjects'].status, 'WARN');
  assert.ok(byId['io.gitObjects'].details.includes('not probed because child process execution is blocked'));
  assert.equal(byId['tools.gitLfs'].status, 'WARN');
  assert.ok(byId['tools.gitLfs'].details.includes('not probed because child process execution is blocked'));
  assert.equal(byId['data.runtimeSkillSeeds'].status, 'WARN');
  assert.ok(byId['data.runtimeSkillSeeds'].details.includes('not probed because child process execution is blocked'));
});

test('release preflight reports late blocked tool probes without stringifying probe objects', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'release-preflight.mjs')).href
  );

  const result = module.buildReleasePreflightReport({
    settings: module.parseArgs([]),
    platform: 'win32',
    env: {},
    probes: {
      childProcessProbe: {
        status: 'PASS',
        details: 'child process execution is available',
      },
      branch: 'main',
      mainOriginCounts: { behind: 0, ahead: 0 },
      appStatusLines: [],
      rootStatusLines: [],
      commandVersions: {
        git: 'git version 2.51.0',
        node: 'v24.11.1',
        pnpm: {
          blocked: true,
          details: 'child process execution is not available in this environment: spawn EPERM',
        },
        cargo: 'cargo 1.92.0',
        python: 'Python 3.13.7',
      },
      codexSessionStats: { count: 0, totalBytes: 0 },
      gitObjectHealth: { count: 0, size: '0 bytes', inPack: 0, sizePack: '0 bytes' },
      gitLfsVersion: 'git-lfs/3.7.1',
      runtimeSkillSeedFiles: [{ path: 'data/skills/skills.json', validJson: true, pointer: false }],
    },
  });

  const byId = Object.fromEntries(result.checks.map((check) => [check.id, check]));

  assert.equal(result.exitCode, 1);
  assert.equal(byId['runtime.childProcess'].status, 'FAIL');
  assert.ok(byId['runtime.childProcess'].details.includes('spawn EPERM'));
  assert.equal(byId['tools.pnpm'].status, 'WARN');
  assert.ok(byId['tools.pnpm'].details.includes('not probed because child process execution is blocked'));
  assert.ok(!byId['tools.pnpm'].details.includes('[object Object]'));
  assert.equal(byId['tools.git'].status, 'WARN');
  assert.equal(byId['git.branch'].status, 'WARN');
  assert.equal(byId['io.gitObjects'].status, 'WARN');
  assert.equal(byId['tools.gitLfs'].status, 'WARN');
  assert.equal(byId['data.runtimeSkillSeeds'].status, 'WARN');
});

test('release preflight fails when runtime skill seed JSON is invalid', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'release-preflight.mjs')).href
  );

  const result = module.buildReleasePreflightReport({
    settings: module.parseArgs([]),
    platform: 'linux',
    env: {
      SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL: 'postgres://example',
      PORTAL_PUBLIC_API_BASE_URL: 'https://api.example.com',
      PORTAL_PUBLIC_APP_API_BASE_URL: 'https://api.example.com/app/v3/api',
      PORTAL_PUBLIC_BACKEND_API_BASE_URL: 'https://api.example.com/backend/v3/api',
      PORTAL_PUBLIC_TOOL_API_ENABLED: 'false',
    },
    probes: {
      branch: 'main',
      mainOriginCounts: { behind: 0, ahead: 0 },
      appStatusLines: [],
      rootStatusLines: [],
      commandVersions: {
        git: 'git version 2.51.0',
        node: 'v24.11.1',
        pnpm: '10.33.0',
        cargo: 'cargo 1.92.0',
        python: 'Python 3.13.7',
      },
      codexSessionStats: { count: 0, totalBytes: 0 },
      gitObjectHealth: { count: 0, size: '0 bytes', inPack: 1, sizePack: '1 MiB' },
      gitLfsVersion: 'git-lfs/3.7.1',
      runtimeSkillSeedFiles: [
        { path: 'data/skills/skills.json', validJson: true, pointer: false },
        { path: 'data/skills/artifacts.json', validJson: false, pointer: true },
      ],
    },
  });
  const byId = Object.fromEntries(result.checks.map((check) => [check.id, check]));

  assert.equal(result.exitCode, 1);
  assert.equal(byId['tools.gitLfs'].status, 'PASS');
  assert.equal(byId['data.runtimeSkillSeeds'].status, 'FAIL');
  assert.ok(byId['data.runtimeSkillSeeds'].details.includes('data/skills/artifacts.json'));
  assert.ok(byId['data.runtimeSkillSeeds'].recommendation.includes('Regenerate the curated runtime skill seed JSON'));
});

test('verification plan includes all commercial contract guardians before tests', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );

  const plan = module.buildVerificationPlan(
    {
      withEdgeDevSmoke: true,
      skipRustTests: true,
      skipPythonTests: true,
      skipSchemaGate: true,
    },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const toolingTestsIndex = commandLines.indexOf('node scripts/run-claw-router-application.test.mjs');

  assert.deepEqual(commandLines.slice(toolingTestsIndex, toolingTestsIndex + 16), [
    'node scripts/run-claw-router-application.test.mjs',
    'python -B -m tools.sdkwork_standard_alignment_guardian --strict',
    'python -B -m tools.repository_delivery_guardian',
    'python -B -m tools.clawrouter_sdk_guardian',
    'python -B -m tools.clawrouter_skill_guardian',
    'python -B -m tools.architecture_standard_guardian',
    'python -B -m tools.rust_backend_architecture_guardian',
    'python -B -m tools.clawrouter_gateway_openapi_generator --check',
    'python -B -m tools.clawrouter_openapi_precision_audit',
    'python -B -m tools.clawrouter_payload_sdk_audit',
    'python -B -m tools.frontend_static_source_manifest --check',
    'python -B -m tools.frontend_contract_guardian',
    'python -B -m tools.schema_guardian',
    'python -B -m tools.flyway_schema_contract_audit',
    'python -B -m tools.frontend_operation_audit',
    'python -B -m tools.frontend_field_audit',
  ]);
  assert.equal(commandLines[toolingTestsIndex + 16], 'python -B -m tools.java_legacy_contract_audit');
});

test('verification plan verifies production portal through Rust edge server without Node server tests', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    {
      withEdgeDevSmoke: true,
      skipRustTests: true,
      skipPythonTests: true,
      skipSchemaGate: true,
    },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);

  assert.ok(commandLines.includes(
    'cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server',
  ));
  assert.ok(!commandLines.some((commandLine) => commandLine.includes('server.test.ts')));
  assert.ok(!commandLines.some((commandLine) => commandLine.includes('smoke-production-server.mjs')));
});

test('verification plan runs frontend source hygiene before portal build', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    {
      withEdgeDevSmoke: true,
      skipRustTests: true,
      skipPythonTests: true,
      skipSchemaGate: true,
    },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const hygieneIndex = plan.findIndex((step) => step.label === 'frontend source hygiene tests');
  const sdkBuildLabels = [
    'app SDK runtime build',
    'backend SDK runtime build',
    'open SDK runtime build',
  ];
  const typecheckIndex = plan.findIndex((step) => step.label === 'portal frontend typecheck');
  const buildIndex = plan.findIndex((step) => step.label === 'production artifact build');

  assert.ok(hygieneIndex > -1, 'frontend source hygiene must be part of the product verification plan');
  for (const label of sdkBuildLabels) {
    const sdkBuildIndex = plan.findIndex((step) => step.label === label);
    assert.ok(sdkBuildIndex > -1, `${label} must be part of the product verification plan`);
    assert.ok(sdkBuildIndex < hygieneIndex, `${label} must refresh dist before source hygiene reads published SDK types`);
  }
  assert.ok(hygieneIndex < typecheckIndex, 'source hygiene must fail before expensive portal typecheck');
  assert.ok(hygieneIndex < buildIndex, 'source hygiene must fail before production build');
  assert.ok(commandLines.includes(
    'python -B -m unittest tests.test_frontend_source_hygiene_standard',
  ));
});

test('verification plan validates portal Vite config before dev smoke and build', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    {
      withEdgeDevSmoke: true,
      skipRustTests: true,
      skipPythonTests: true,
      skipSchemaGate: true,
    },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const hygieneIndex = plan.findIndex((step) => step.label === 'frontend source hygiene tests');
  const viteConfigRuntimeIndex = plan.findIndex((step) => step.label === 'portal vite config runtime tests');
  const smokeIndex = plan.findIndex((step) => step.label === 'edge dev server smoke');
  const typecheckIndex = plan.findIndex((step) => step.label === 'portal frontend typecheck');
  const buildIndex = plan.findIndex((step) => step.label === 'production artifact build');

  assert.ok(viteConfigRuntimeIndex > hygieneIndex, 'portal Vite config runtime tests must run after source hygiene');
  assert.ok(viteConfigRuntimeIndex < smokeIndex, 'portal Vite config runtime tests must run before edge dev smoke');
  assert.ok(viteConfigRuntimeIndex < typecheckIndex, 'portal Vite config runtime tests must run before frontend typecheck');
  assert.ok(viteConfigRuntimeIndex < buildIndex, 'portal Vite config runtime tests must run before production build');
  assert.ok(commandLines.includes(
    'node --experimental-strip-types apps/sdkwork-clawrouter-pc/vite-config-runtime.test.ts',
  ));
});

test('portal service command results must not fabricate returned entities from empty objects', () => {
  const serviceRoot = path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'packages');
  const serviceFiles = [
    'sdkwork-clawrouter-pc-admin-announcement/src/announcementService.ts',
    'sdkwork-clawrouter-pc-admin-channel/src/channelService.ts',
    'sdkwork-clawrouter-pc-admin-group/src/groupService.ts',
    'sdkwork-clawrouter-pc-admin-marketing/src/marketingService.ts',
    'sdkwork-clawrouter-pc-admin-ratelimit/src/ratelimitService.ts',
    'sdkwork-clawrouter-pc-admin-user/src/userService.ts',
  ];
  const servicePaths = [
    ...serviceFiles.map((relativeFile) => path.join(serviceRoot, relativeFile)),
    path.join(
      workspaceRoot,
      'data',
      'sdkwork-models',
      'apps',
      'sdkwork-models-pc',
      'packages',
      'sdkwork-models-pc-admin-catalog',
      'src',
      'modelService.ts',
    ),
  ];

  for (const servicePath of servicePaths) {
    const source = readFileSync(servicePath, 'utf8');
    const label = path.relative(workspaceRoot, servicePath);
    assert.doesNotMatch(
      source,
      /readApiItem\([^)]*\)\s*\?\?\s*\{\}/u,
      `${label} must use readRequiredApiItem for command responses that require returned entities`,
    );
    assert.doesNotMatch(
      source,
      /normalize[A-Za-z0-9_]+\([^)]*\?\?\s*\{\}\)/u,
      `${label} must not normalize missing command data into an empty entity`,
    );
  }
});

test('portal admin update commands must require returned entities instead of silent null success', () => {
  const serviceRoot = path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'packages');
  const serviceFiles = [
    'sdkwork-clawrouter-pc-admin-announcement/src/announcementService.ts',
    'sdkwork-clawrouter-pc-admin-channel/src/channelService.ts',
    'sdkwork-clawrouter-pc-admin-group/src/groupService.ts',
    'sdkwork-clawrouter-pc-admin-user/src/userService.ts',
  ];

  for (const relativeFile of serviceFiles) {
    const source = readFileSync(path.join(serviceRoot, relativeFile), 'utf8');
    assert.doesNotMatch(
      source,
      /Promise<[^>\n]*\|\s*null>/u,
      `${relativeFile} update command APIs must fail closed when required returned entities are missing`,
    );
    assert.doesNotMatch(
      source,
      /return\s+item\s*\?\s*normalize[A-Za-z0-9_]+\([^)]*\)\s*:\s*null/u,
      `${relativeFile} must not treat missing update response entities as successful null results`,
    );
  }
});

test('portal channel test commands must require returned channel entities', () => {
  const serviceRoot = path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'packages');
  const serviceFiles = [
    'sdkwork-clawrouter-pc-admin-channel/src/channelService.ts',
  ];

  for (const relativeFile of serviceFiles) {
    const source = readFileSync(path.join(serviceRoot, relativeFile), 'utf8');
    assert.doesNotMatch(
      source,
      /normalize[A-Za-z0-9_]+\(\s*isRecord\([^)]*\)\s*\?\s*[^:]+:\s*\{\}\s*\)/u,
      `${relativeFile} must fail closed when channel test responses omit item data`,
    );
    assert.match(
      source,
      /readRequiredApiItem\([^)]*test response is missing channel data/u,
      `${relativeFile} must use readRequiredApiItem for channel test response item data`,
    );
  }
});

test('portal mutable entity services must require backend stable ids', () => {
  const portalRoot = path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc');
  const commonsSource = readFileSync(
    path.join(portalRoot, 'packages', 'sdkwork-clawroutes-pc-commons', 'src', 'api-result.ts'),
    'utf8',
  );
  const guardedServices = [
    {
      file: path.join('sdkwork-clawrouter-pc-admin-group', 'src', 'groupService.ts'),
      requiredMessages: ['Group id is required'],
      forbidden: [/id:\s*readString\(item,\s*['"]id['"]\)/u],
    },
    {
      file: path.join('sdkwork-clawrouter-pc-admin-channel', 'src', 'channelService.ts'),
      requiredMessages: ['Channel id is required', 'Provider credential id is required'],
      forbidden: [/id:\s*readString\(item,\s*['"]id['"]\)/u],
    },
    {
      file: path.join('sdkwork-clawrouter-pc-admin-user', 'src', 'userService.ts'),
      requiredMessages: ['User id is required', 'API key id is required'],
      forbidden: [/id:\s*readNumber\(item,\s*['"]id['"]\)/u, /id:\s*readString\(item,\s*['"]id['"]\)/u],
    },
    {
      file: path.join(
        workspaceRoot,
        'data',
        'sdkwork-models',
        'apps',
        'sdkwork-models-pc',
        'packages',
        'sdkwork-models-pc-admin-catalog',
        'src',
        'modelService.ts',
      ),
      requiredMessages: ['Vendor id is required', 'Model id is required', 'Model vendor id is required'],
      forbidden: [/id:\s*readString\(item,\s*['"]id['"]\)/u, /vendorId:\s*readString\(item,\s*['"]vendorId['"]\)/u],
    },
    {
      file: path.join('sdkwork-clawrouter-pc-admin-ratelimit', 'src', 'ratelimitService.ts'),
      requiredMessages: [
        'IP limit id is required',
        'Token limit id is required',
        'Model limit id is required',
        'Firewall rule id is required',
      ],
      forbidden: [/id:\s*readString\(item,\s*['"]id['"]\)/u],
    },
    {
      file: path.join('sdkwork-clawrouter-pc-admin-marketing', 'src', 'marketingService.ts'),
      requiredMessages: ['Referral stat id is required'],
      forbidden: [/id:\s*readString\(item,\s*['"]id['"]\)/u],
    },
    {
      file: path.join('sdkwork-clawrouter-pc-admin-announcement', 'src', 'announcementService.ts'),
      requiredMessages: ['Announcement id is required'],
      forbidden: [/id:\s*readString\(item,\s*['"]id['"]\)/u],
    },
    {
      file: path.join('sdkwork-clawrouter-pc-admin-dashboard', 'src', 'dashboardService.ts'),
      requiredMessages: ['Recent usage trace id is required'],
      forbidden: [/id:\s*readString\(item,\s*['"]id['"]\)/u],
    },
    {
      file: path.join('sdkwork-clawrouter-pc-admin-monitor', 'src', 'monitorService.ts'),
      requiredMessages: ['System node id is required', 'Alert id is required'],
      forbidden: [/id:\s*readString\(item,\s*['"]id['"]\)/u],
    },
    {
      file: path.join('sdkwork-clawrouter-pc-admin-record', 'src', 'recordService.ts'),
      requiredMessages: ['Log record id is required'],
      forbidden: [/id:\s*readString\(item,\s*['"]id['"]\)/u],
    },
    {
      file: path.join('sdkwork-clawrouter-pc-admin-wallet', 'src', 'walletService.ts'),
      requiredMessages: ['Recharge record id is required'],
      forbidden: [/id:\s*readString\(item,\s*['"]id['"]\)/u],
    },
    {
      file: path.join('sdkwork-clawrouter-pc-console-usage', 'src', 'usageService.ts'),
      requiredMessages: ['Usage log id is required'],
      forbidden: [/id:\s*readString\(item,\s*['"]id['"]\)/u],
    },
  ];

  assert.match(
    commonsSource,
    /export function readRequiredString\(record: ApiRecord, key: string, message: string\): string/u,
    'shared API result boundary must expose required stable string validation',
  );

  for (const service of guardedServices) {
    const sourcePath = service.file.startsWith(workspaceRoot)
      ? service.file
      : path.join(portalRoot, 'packages', service.file);
    const source = readFileSync(sourcePath, 'utf8');
    for (const message of service.requiredMessages) {
      assert.ok(
        source.includes(`readRequiredString(item, 'id', '${message}')`)
          || source.includes(`readRequiredNumber(item, 'id', '${message}')`)
          || source.includes(`readRequiredPositiveInt64String(item, 'id', '${message}')`)
          || source.includes(`readRequiredString(item, 'vendorId', '${message}')`)
          || source.includes(`readRequiredPositiveInt64String(item, 'vendorId', '${message}')`)
          || source.includes(`firstRequiredString(item, ['id', 'transactionNo', 'transaction_no', 'requestNo', 'request_no'], '${message}')`)
          || source.includes(`readRequiredAnyString(item, ['id', 'uuid', 'channelCode', 'channel_code'], '${message}')`),
        `${service.file} must fail closed with "${message}" when backend omits a stable id`,
      );
    }
    for (const pattern of service.forbidden) {
      assert.doesNotMatch(
        source,
        pattern,
        `${service.file} must not fabricate mutable entity ids from optional or display fields`,
      );
    }
  }
});

test('portal dev scripts run Vite without a Node server entrypoint', () => {
  const portalPackage = JSON.parse(
    readFileSync(path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'package.json'), 'utf8'),
  );
  const viteConfig = readFileSync(
    path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'vite.config.ts'),
    'utf8',
  );

  assert.equal(portalPackage.scripts.dev, 'pnpm deps:check && vite --configLoader native');
  assert.equal(portalPackage.scripts['dev:browser'], 'pnpm deps:check && vite --configLoader native');
  assert.equal(portalPackage.scripts.preview, 'vite preview --configLoader native');
  assert.equal(
    portalPackage.scripts.typecheck,
    'tsc -p tsconfig.typecheck.json --noEmit',
    'portal typecheck must use the portal-only TypeScript project',
  );
  assert.equal(
    portalPackage.scripts.lint,
    'tsc -p tsconfig.typecheck.json --noEmit',
    'portal lint must use the portal-only TypeScript project',
  );
  assert.ok(!portalPackage.scripts.dev.includes('tsx'));
  assert.ok(portalPackage.scripts.dev.includes('--configLoader native'));
  assert.ok(!portalPackage.scripts['dev:browser'].includes('tsx'));
  assert.ok(portalPackage.scripts['dev:browser'].includes('--configLoader native'));
  assert.ok(portalPackage.scripts.preview.includes('--configLoader native'));
  assert.ok(!JSON.stringify(portalPackage.scripts).includes('server.ts'));
  assert.match(viteConfig, /host:\s*resolvePortalDevHost\(process\.env\)/u);
  assert.ok(viteConfig.includes('configureServer(server)'));
  assert.ok(viteConfig.includes("order: 'post'"));
  assert.ok(viteConfig.includes('type="module" src="${RUNTIME_ENV_SCRIPT_PATH}"'));
  assert.ok(viteConfig.includes('PORTAL_PUBLIC_API_BASE_URL'));
  assert.ok(viteConfig.includes('PORTAL_PUBLIC_OPEN_API_BASE_URL'));
  assert.ok(viteConfig.includes('PORTAL_PUBLIC_APP_API_BASE_URL'));
  assert.ok(viteConfig.includes('PORTAL_PUBLIC_BACKEND_API_BASE_URL'));
  assert.ok(viteConfig.includes('optimizeDeps'));
  assert.ok(viteConfig.includes("'@sdkwork/documents-pc-api-reference'"));
  assert.ok(viteConfig.includes("'@sdkwork/documents-pc-sdk-reference'"));
});

test('portal typecheck project does not compile external appbase or UI source', () => {
  const portalPackage = JSON.parse(
    readFileSync(path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'package.json'), 'utf8'),
  );
  const typecheckConfig = JSON.parse(
    readFileSync(path.join(portalRoot, 'tsconfig.typecheck.json'), 'utf8'),
  );
  const typecheckShims = readFileSync(
    path.join(portalRoot, 'src', 'typecheck-shims.d.ts'),
    'utf8',
  );
  const packageTypecheckConfig = JSON.parse(
    readFileSync(path.join(portalRoot, 'packages', 'tsconfig.json'), 'utf8'),
  );
  const runtimeTsconfig = readFileSync(path.join(portalRoot, 'tsconfig.json'), 'utf8');

  assert.equal(portalPackage.scripts.typecheck, 'tsc -p tsconfig.typecheck.json --noEmit');
  assert.deepEqual(typecheckConfig.include, [
    'src/**/*.ts',
    'src/**/*.tsx',
    'packages/*/src/**/*.ts',
    'packages/*/src/**/*.tsx',
  ]);
  assert.equal(packageTypecheckConfig.extends, '../tsconfig.typecheck.json');
  assert.deepEqual(packageTypecheckConfig.include, [
    '../src/typecheck-shims.d.ts',
    '*/src/**/*.ts',
    '*/src/**/*.tsx',
  ]);
  assert.ok(typecheckConfig.exclude.includes('../../../sdkwork-appbase/**'));
  assert.ok(typecheckConfig.exclude.includes('../../../sdkwork-ui/**'));
  assert.ok(packageTypecheckConfig.exclude.includes('../../../../sdkwork-appbase/**'));
  assert.ok(packageTypecheckConfig.exclude.includes('../../../../sdkwork-ui/**'));
  assert.match(
    runtimeTsconfig,
    /sdkwork-image\/apps\/sdkwork-image-pc\/packages\/sdkwork-image-pc-generation\/src\/index\.ts/u,
    'runtime tsconfig keeps image-owned generation source aliases for Vite dev/build',
  );
  assert.doesNotMatch(
    runtimeTsconfig,
    /sdkwork-appbase\/packages\/pc-react\/content\/sdkwork-generation-pc-react/u,
    'generation PC React is no longer an appbase-owned package fallback',
  );
  assert.doesNotMatch(
    runtimeTsconfig,
    /sdkwork-image\/packages\/pc-react\/content\/sdkwork-generation-pc-react/u,
    'generation PC React no longer uses the legacy image package layout',
  );
  for (const [specifier, target] of Object.entries(typecheckConfig.compilerOptions.paths)) {
    assert.ok(
      target.every((entry) => !entry.includes('../../../sdkwork-appbase/') && !entry.includes('../../../sdkwork-ui/')),
      `${specifier} must not resolve to external workspace source during portal typecheck`,
    );
  }
  for (const moduleName of [
    '@sdkwork/auth-pc-react',
    '@sdkwork/image-pc-generation',
    '@sdkwork/host-tauri-pc-react',
    '@sdkwork/iam-runtime',
    '@sdkwork/iam-service',
  ]) {
    assert.match(
      typecheckShims,
      new RegExp(`declare module ['"]${moduleName.replaceAll('/', '\\/')}['"]`, 'u'),
      `${moduleName} must have a portal-local typecheck shim`,
    );
  }
});

test('portal workspace packages declare ESM module metadata', () => {
  const packagesRoot = path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'packages');
  const packageNames = [
    'sdkwork-clawrouter-pc-admin-announcement',
    'sdkwork-clawrouter-pc-admin-channel',
    'sdkwork-clawrouter-pc-admin-dashboard',
    'sdkwork-clawrouter-pc-admin-finance',
    'sdkwork-clawrouter-pc-admin-group',
    'sdkwork-clawrouter-pc-admin-marketing',
    'sdkwork-clawrouter-pc-admin-relay-site',
    'sdkwork-clawrouter-pc-admin-monitor',
    'sdkwork-clawrouter-pc-admin-ratelimit',
    'sdkwork-clawrouter-pc-admin-record',
    'sdkwork-clawrouter-pc-admin-user',
    'sdkwork-clawroutes-pc-commons',
    'sdkwork-clawrouter-pc-console-api-keys',
    'sdkwork-clawrouter-pc-console-core',
    'sdkwork-clawrouter-pc-console-dashboard',
    'sdkwork-clawrouter-pc-console-gateway',
    'sdkwork-clawrouter-pc-console-messages',
    'sdkwork-clawrouter-pc-console-settings',
    'sdkwork-clawrouter-pc-console-usage',
    'sdkwork-clawrouter-pc-console-user',
    'sdkwork-clawrouter-pc-core',
    'sdkwork-clawrouter-pc-home',
    'sdkwork-clawrouter-pc-i18n',
    'sdkwork-clawrouter-pc-models',
    'sdkwork-clawrouter-pc-playground',
    'sdkwork-clawrouter-pc-rankings',
    'sdkwork-clawrouter-pc-types',
  ];

  for (const packageName of packageNames) {
    const packageJson = JSON.parse(
      readFileSync(path.join(packagesRoot, packageName, 'package.json'), 'utf8'),
    );

    assert.equal(packageJson.type, 'module', `${packageName} must declare type=module`);
  }
});

test('portal commons package exposes runtime subpath for ESM and SSR tooling', () => {
  const packageJson = JSON.parse(
    readFileSync(
      path.join(
        workspaceRoot,
        'apps',
        'sdkwork-clawrouter-pc',
        'packages',
        'sdkwork-clawroutes-pc-commons',
        'package.json',
      ),
      'utf8',
    ),
  );

  assert.deepEqual(packageJson.exports['.'], {
    types: './src/index.ts',
    import: './src/index.ts',
    require: './src/index.ts',
    default: './src/index.ts',
  });
  assert.deepEqual(packageJson.exports['./runtime'], {
    types: './src/runtime.ts',
    import: './src/runtime.ts',
    require: './src/runtime.ts',
    default: './src/runtime.ts',
  });
});

test('standalone portal Vite dev server defaults to direct port 3901', () => {
  const viteConfig = readFileSync(
    path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'vite.config.ts'),
    'utf8',
  );

  assert.match(viteConfig, /DEFAULT_PORTAL_DEV_PORT\s*=\s*3901/u);
  assert.match(viteConfig, /port:\s*resolvePortalDevPort\(/u);
  assert.match(viteConfig, /strictPort:\s*true/u);
});

test('standalone portal Vite dev server proxies API paths using topology profile fallbacks', () => {
  const viteConfig = readFileSync(
    path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'vite.config.ts'),
    'utf8',
  );

  assert.ok(viteConfig.includes('resolvePortalDevProxy'));
  assert.ok(viteConfig.includes('SDKWORK_CLAW_BROWSER_DEV_PROXY_OPEN_API_ORIGIN'));
  assert.ok(viteConfig.includes('SDKWORK_CLAW_BROWSER_DEV_PROXY_BACKEND_API_ORIGIN'));
  assert.ok(viteConfig.includes('SDKWORK_CLAW_BROWSER_DEV_PROXY_APP_API_ORIGIN'));
  assert.ok(viteConfig.includes('VITE_SDKWORK_CLAW_ROUTER_APPLICATION_OPEN_HTTP_URL'));
  assert.ok(viteConfig.includes('VITE_SDKWORK_CLAW_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL'));
  assert.ok(viteConfig.includes("'/v1'"));
  assert.ok(viteConfig.includes("'/backend/v3/api'"));
  assert.ok(viteConfig.includes("'/app/v3/api'"));
  assert.match(viteConfig, /changeOrigin:\s*true/u);
  assert.match(viteConfig, /secure:\s*true/u);
  assert.match(viteConfig, /ws:\s*false/u);
});

test('portal build script uses native Vite config loading', () => {
  const portalPackage = JSON.parse(
    readFileSync(path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'package.json'), 'utf8'),
  );
  const buildScript = readFileSync(
    path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'scripts', 'build-portal.mjs'),
    'utf8',
  );

  assert.equal(portalPackage.scripts.build, 'pnpm deps:check && node scripts/build-portal.mjs');
  assert.match(buildScript, /process\.env\.NODE_ENV\s*=\s*['"]production['"]/);
  assert.doesNotMatch(buildScript, /import\s*\{\s*build\s*\}\s*from\s*['"]vite['"]/);
  assert.match(buildScript, /await import\(['"]vite['"]\)/);
  assert.match(buildScript, /configLoader:\s*['"]native['"]/);
  assert.doesNotMatch(buildScript, /buildServer\(\)/);
  assert.doesNotMatch(buildScript, /build-server\.mjs/);
});

test('verification plan includes portal frontend typecheck', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: true, skipPythonTests: true, skipSchemaGate: true },
    {},
  );

  const portalTypecheck = plan.find((step) => step.label === 'portal frontend typecheck');
  const sdkBuilds = [
    ['app SDK runtime build', ['--dir', 'sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi', 'build']],
    ['backend SDK runtime build', ['--dir', 'sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi', 'build']],
    ['open SDK runtime build', ['--dir', 'sdks/clawrouter-open-sdk/clawrouter-open-sdk-typescript/generated/server-openapi', 'build']],
  ];
  assert.ok(portalTypecheck);
  const portalTypecheckIndex = plan.indexOf(portalTypecheck);
  for (const [label, expectedArgs] of sdkBuilds) {
    const sdkBuild = plan.find((step) => step.label === label);
    assert.ok(sdkBuild, `${label} must run before portal frontend typecheck`);
    assert.ok(
      plan.indexOf(sdkBuild) < portalTypecheckIndex,
      `${label} must refresh package dist before portal packages resolve SDK types`,
    );
    assert.deepEqual(sdkBuild.args, expectedArgs);
  }
  assert.deepEqual(portalTypecheck.args, [
    '--dir',
    'apps/sdkwork-clawrouter-pc',
    'typecheck',
  ]);
  assert.equal(module.pnpmCommand('win32'), 'pnpm.cmd');
  assert.equal(module.pnpmCommand('linux'), 'pnpm');
});

test('verification plan includes production artifact build and bundle budget audit', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: true, skipPythonTests: true, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const typecheckIndex = plan.findIndex((step) => step.label === 'portal frontend typecheck');
  const buildIndex = plan.findIndex((step) => step.label === 'production artifact build');
  const budgetIndex = plan.findIndex((step) => step.label === 'portal bundle budget audit');

  assert.ok(buildIndex > typecheckIndex, 'production build must run after portal typecheck');
  assert.ok(budgetIndex > buildIndex, 'bundle budget audit must inspect fresh production artifacts');
  assert.ok(commandLines.includes(
    `${module.pnpmCommand()} build`,
  ));
  assert.ok(commandLines.includes(
    'node apps/sdkwork-clawrouter-pc/scripts/audit-bundle-budget.mjs',
  ));
});

test('verification plan includes portal production edge smoke after artifact audits', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: true, skipPythonTests: true, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const edgeServerSource = readFileSync(
    path.join(workspaceRoot, 'crates', 'sdkwork-clawrouter-cloud-gateway', 'src', 'edge_server.rs'),
    'utf8',
  );
  const budgetIndex = plan.findIndex((step) => step.label === 'portal bundle budget audit');
  const smokeIndex = plan.findIndex((step) => step.label === 'portal production edge smoke');
  const browserSmokeIndex = plan.findIndex((step) => step.label === 'portal production browser DOM smoke');

  assert.ok(smokeIndex > budgetIndex, 'production edge smoke must inspect the audited artifact');
  assert.ok(browserSmokeIndex > smokeIndex, 'browser DOM smoke must run after production edge smoke');
  assert.ok(commandLines.includes(
    'cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server',
  ));
  assert.ok(edgeServerSource.includes('with_portal_static_dist'));
  assert.ok(edgeServerSource.includes('runtime-env.js'));
  assert.ok(edgeServerSource.includes('path.starts_with("/api/")'));
});

test('verification plan includes real browser DOM smoke after production HTTP smoke', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: true, skipPythonTests: true, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const edgeSmokeIndex = plan.findIndex((step) => step.label === 'portal production edge smoke');
  const browserSmokeIndex = plan.findIndex((step) => step.label === 'portal production browser DOM smoke');
  const browserSmokeSource = readFileSync(
    path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'scripts', 'smoke-production-browser.mjs'),
    'utf8',
  );
  const apiEndpointViewSource = readFileSync(
    path.join(documentsApiReferenceRoot, 'src', 'components', 'ApiEndpointView.tsx'),
    'utf8',
  );
  const codeSnippetClientSource = readFileSync(
    path.join(documentsApiReferenceRoot, 'src', 'codeSnippetClient.ts'),
    'utf8',
  );

  assert.ok(browserSmokeIndex > edgeSmokeIndex, 'browser DOM smoke must run after Rust edge production smoke');
  assert.ok(commandLines.includes(
    'node apps/sdkwork-clawrouter-pc/scripts/smoke-production-browser.mjs',
  ));
  assert.match(browserSmokeSource, /Chrome DevTools Protocol/);
  assert.match(browserSmokeSource, /findChromeExecutable/);
  assert.match(browserSmokeSource, /spawnRustEdgeServer/);
  assert.match(
    browserSmokeSource,
    /parsePositiveIntegerEnv\("CLAWROUTER_EDGE_STARTUP_TIMEOUT_MS", 900_000\)/,
  );
  assert.match(browserSmokeSource, /processSpawnPermissionDiagnostic/);
  assert.doesNotMatch(browserSmokeSource, /process\.env\.TOOL_API_ENABLED/);
  assert.match(browserSmokeSource, /verifyRuntimeEnvironment/);
  assert.match(browserSmokeSource, /verifyRouteDom/);
  assert.match(browserSmokeSource, /Runtime\.exceptionThrown/);
  assert.match(browserSmokeSource, /Log\.entryAdded/);
  assert.match(browserSmokeSource, /captureRouteSetupDiagnostics/);
  assert.match(browserSmokeSource, /setup expression \$\{index \+ 1\}/);
  assert.match(browserSmokeSource, /activeEndpointHeading/);
  assert.match(browserSmokeSource, /clickRoutePlaygroundTabByExactText\("Authorization"\)/);
  assert.match(browserSmokeSource, /Auth Type/);
  assert.match(browserSmokeSource, /input\[placeholder="Key"\]/);
  assert.match(browserSmokeSource, /API PLAYGROUND/);
  assert.match(browserSmokeSource, /REQ/);
  assert.match(browserSmokeSource, /bodyTextIncludesExpression\("Browser smoke playground response"\)/);
  assert.match(browserSmokeSource, /bodyTextIncludesExpression\("Browser smoke API key auth response"\)/);
  const playgroundSendRouteSource = browserSmokeSource.slice(
    browserSmokeSource.indexOf('pathName: "/api-reference?__browser-smoke-playground-send=1"'),
    browserSmokeSource.indexOf('pathName: "/api-reference?__browser-smoke-playground-primitive-response=1"'),
  );
  const playgroundApiKeyAuthRouteSource = browserSmokeSource.slice(
    browserSmokeSource.indexOf('pathName: "/api-reference?__browser-smoke-playground-api-key-auth=1"'),
    browserSmokeSource.indexOf('pathName: "/api-reference?__browser-smoke-playground-network-error=1"'),
  );
  assert.ok(playgroundSendRouteSource.includes('clickRouteResponseTabByExactText("Headers")'));
  assert.ok(playgroundSendRouteSource.includes('bodyTextIncludesExpression("Browser smoke playground response")'));
  const playgroundSendRequiredTextTokensSource = playgroundSendRouteSource.match(
    /requiredTextTokens:\s*\[([\s\S]*?)\],\s*requiredDomExpressions:/,
  )?.[1] ?? '';
  assert.doesNotMatch(playgroundSendRequiredTextTokensSource, /Browser smoke playground response/);
  assert.ok(playgroundApiKeyAuthRouteSource.includes('clickRouteResponseTabByExactText("Headers")'));
  assert.ok(playgroundApiKeyAuthRouteSource.includes('bodyTextIncludesExpression("Browser smoke API key auth response")'));
  const playgroundApiKeyAuthRequiredTextTokensSource = playgroundApiKeyAuthRouteSource.match(
    /requiredTextTokens:\s*\[([\s\S]*?)\],\s*requiredDomExpressions:/,
  )?.[1] ?? '';
  assert.doesNotMatch(playgroundApiKeyAuthRequiredTextTokensSource, /Browser smoke API key auth response/);
  const playgroundSendDownloadRouteSource = browserSmokeSource.slice(
    browserSmokeSource.indexOf('pathName: "/api-reference?__browser-smoke-playground-send-download=1"'),
    browserSmokeSource.indexOf('pathName: "/api-reference?__browser-smoke-playground-api-key-auth=1"'),
  );
  const playgroundSendDownloadRequiredTextTokensSource = playgroundSendDownloadRouteSource.match(
    /requiredTextTokens:\s*\[([\s\S]*?)\],\s*requiredDomExpressions:/,
  )?.[1] ?? '';
  assert.ok(playgroundSendDownloadRouteSource.includes('clickRouteButtonByExactText("Send and Download")'));
  assert.ok(playgroundSendDownloadRouteSource.includes('window.__BROWSER_SMOKE_DOWNLOAD__?.text?.includes("Browser smoke playground response")'));
  assert.doesNotMatch(playgroundSendDownloadRequiredTextTokensSource, /Send and Download/);
  assert.match(browserSmokeSource, /apiPlaygroundFixtureMode === API_PLAYGROUND_NETWORK_FAILURE_FIXTURE_MODE/);
  assert.match(browserSmokeSource, /Failed to load resource: net::ERR_CONNECTION_FAILED/);
  assert.match(browserSmokeSource, /CLAWROUTER_BROWSER_SMOKE_REQUIRED/);
  assert.match(browserSmokeSource, /child process spawn is not available in this environment/);
  assert.match(browserSmokeSource, /local shell or CI runner that permits Node child_process.spawn/);
  assert.match(browserSmokeSource, /browserSmokeStartupErrorKind = isProcessSpawnPermissionError\(error\) \? "spawnPermission" : "process"/);
  assert.match(browserSmokeSource, /CLAWROUTER_BROWSER_DEBUG_PORT/);
  assert.match(browserSmokeSource, /skipBrowserSmoke/);
  assert.match(browserSmokeSource, /addEventListener/);
  assert.doesNotMatch(browserSmokeSource, /\.once\(["']open["']/);
  assert.doesNotMatch(browserSmokeSource, /\.on\(["']message["']/);
  assert.match(browserSmokeSource, /--lang=en-US/);
  assert.match(browserSmokeSource, /Emulation\.setLocaleOverride/);
  assert.match(browserSmokeSource, /Emulation\.setUserAgentOverride/);
  assert.match(browserSmokeSource, /PORTAL_PUBLIC_OPEN_API_BASE_URL/);
  assert.match(browserSmokeSource, /previousPublicOpenApiBaseUrl/);
  assert.match(browserSmokeSource, /VITE_CLAWROUTER_OPEN_API_BASE_URL/);
  assert.match(browserSmokeSource, /PORTAL_PUBLIC_APP_API_BASE_URL/);
  assert.match(browserSmokeSource, /previousPublicAppApiBaseUrl/);
  assert.match(browserSmokeSource, /VITE_CLAWROUTER_APP_API_BASE_URL/);
  assert.match(browserSmokeSource, /const BROWSER_SMOKE_ROUTES = \[/);
  assert.match(browserSmokeSource, /for \(const route of BROWSER_SMOKE_ROUTES\)/);
  const defaultModelsRouteSource = browserSmokeSource.slice(
    browserSmokeSource.indexOf('pathName: "/models"'),
    browserSmokeSource.indexOf('pathName: "/models/openai%2Fgpt-5.5-pro"'),
  );
  const defaultModelDetailRouteSource = browserSmokeSource.slice(
    browserSmokeSource.indexOf('pathName: "/models/openai%2Fgpt-5.5-pro"'),
    browserSmokeSource.indexOf('pathName: "/models?__browser-smoke-runtime=1"'),
  );
  assert.match(defaultModelsRouteSource, /appSdkFixtureMode: APP_SDK_MODEL_FIXTURE_MODE/);
  assert.match(defaultModelDetailRouteSource, /appSdkFixtureMode: APP_SDK_MODEL_FIXTURE_MODE/);
  assert.match(browserSmokeSource, /\/models\/openai%2Fgpt-5\.5-pro/);
  assert.match(browserSmokeSource, /GPT-5\.5 Pro/);
  assert.match(browserSmokeSource, /Claude Opus 4\.7/);
  assert.ok(browserSmokeSource.includes('/models?__browser-smoke-runtime=1'));
  assert.ok(browserSmokeSource.includes('/models?__browser-smoke-groups=1'));
  assert.ok(browserSmokeSource.includes('/models?__browser-smoke-empty-runtime=1'));
  assert.ok(browserSmokeSource.includes('/models/newvendor%2Fruntime-good?__browser-smoke-detail=1'));
  assert.match(browserSmokeSource, /BROWSER_SMOKE_MODEL_RECORDS/);
  assert.match(browserSmokeSource, /APP_SDK_MODEL_FIXTURE_MODE/);
  assert.match(browserSmokeSource, /APP_SDK_MODEL_EMPTY_FIXTURE_MODE/);
  assert.match(browserSmokeSource, /app\/v3\/api\/ai\/models/);
  assert.match(browserSmokeSource, /Runtime Good/);
  assert.match(browserSmokeSource, /Runtime Enterprise/);
  assert.match(browserSmokeSource, /Runtime Unpriced/);
  assert.match(browserSmokeSource, /Runtime model catalog filter/);
  assert.match(browserSmokeSource, /Enterprise exclusive/);
  assert.match(browserSmokeSource, /Try in Playground/);
  assert.match(browserSmokeSource, /CATALOG REFERENCE VALUES/);
  assert.match(browserSmokeSource, /REFERENCE \/ 1M TOKENS/);
  assert.match(browserSmokeSource, /UNAVAILABLE/);
  assert.match(browserSmokeSource, /Price is unavailable for the selected billing meter\./);
  assert.match(browserSmokeSource, /clickRouteModelCardByName\("Runtime Good"\)/);
  assert.match(browserSmokeSource, /clickRouteFilterLabelByText\("Enterprise exclusive"\)/);
  assert.match(browserSmokeSource, /setRouteTextInputByPlaceholder\("Search models\.\.\.", "no-match-runtime-model"\)/);
  assert.match(browserSmokeSource, /lowestUpstreamCostUnitPrice/);
  assert.match(browserSmokeSource, /customerUnitPrice/);
  assert.match(browserSmokeSource, /grossMarginPerUnit/);
  assert.match(browserSmokeSource, /\/rankings/);
  assert.match(browserSmokeSource, /Published catalog benchmark/);
  assert.match(browserSmokeSource, /Snapshot Benchmark/);
  assert.doesNotMatch(browserSmokeSource, /pathName: "\/forum"/);
  assert.doesNotMatch(browserSmokeSource, /function resolveForumAppSdkFixture/);
  assert.doesNotMatch(browserSmokeSource, /\bBROWSER_SMOKE_FORUM_FEEDS\b/);
  assert.doesNotMatch(browserSmokeSource, /\bBROWSER_SMOKE_FORUM_COMMENTS_BY_FEED_ID\b/);
  assert.match(browserSmokeSource, /\/api-reference/);
  assert.ok(browserSmokeSource.includes('/api-reference?__browser-smoke-playground-validation=1'));
  assert.ok(browserSmokeSource.includes('/api-reference?__browser-smoke-playground-managed-header=1'));
  assert.ok(browserSmokeSource.includes('/api-reference?__browser-smoke-playground-send=1'));
  assert.ok(browserSmokeSource.includes('/api-reference?__browser-smoke-playground-primitive-response=1'));
  assert.ok(browserSmokeSource.includes('/api-reference?__browser-smoke-playground-send-download=1'));
  assert.ok(browserSmokeSource.includes('/api-reference?__browser-smoke-playground-drawer=1'));
  assert.ok(browserSmokeSource.includes('/api-reference?__browser-smoke-playground-api-key-auth=1'));
  assert.ok(browserSmokeSource.includes('/api-reference?__browser-smoke-playground-network-error=1'));
  assert.ok(browserSmokeSource.includes('/api-reference?__browser-smoke-tool-api-disabled=1'));
  assert.ok(browserSmokeSource.includes('/api-reference?__browser-smoke-code-snippet-tabs=1'));
  assert.match(browserSmokeSource, /API_PLAYGROUND_FIXTURE_MODE/);
  assert.match(browserSmokeSource, /API_PLAYGROUND_PRIMITIVE_FIXTURE_MODE/);
  assert.match(browserSmokeSource, /API_PLAYGROUND_AUTH_FIXTURE_MODE/);
  assert.match(browserSmokeSource, /API_PLAYGROUND_NETWORK_FAILURE_FIXTURE_MODE/);
  assert.match(browserSmokeSource, /createToolApiRequestCollector/);
  assert.match(browserSmokeSource, /toolApiRequestCollector\.register\(cdp\)/);
  assert.match(browserSmokeSource, /forbiddenToolApiPaths: \["\/api\/code-snippet"\]/);
  assert.match(browserSmokeSource, /Network\.requestWillBeSent/);
  assert.match(browserSmokeSource, /\/api\/code-snippet/);
  assert.match(browserSmokeSource, /CLAWROUTER_API_KEY/);
  assert.match(browserSmokeSource, /clickRouteCodeLanguageButtonByExactText\("typescript"\)/);
  assert.match(browserSmokeSource, /clickRouteCodeLibraryButtonByExactText\("fetch"\)/);
  assert.match(browserSmokeSource, /clickRouteButtonByTitle\("Copy code"\)/);
  assert.match(browserSmokeSource, /window\.__BROWSER_SMOKE_CLIPBOARD__\?\.includes\("await fetch"\)/);
  assert.match(browserSmokeSource, /window\.__BROWSER_SMOKE_CLIPBOARD__\?\.includes\("CLAWROUTER_API_KEY"\)/);
  assert.match(browserSmokeSource, /axios\.request/);
  assert.match(browserSmokeSource, /await fetch/);
  assert.match(apiEndpointViewSource, /buildStaticCodeSnippet\(request\)/);
  assert.match(codeSnippetClientSource, /export function buildStaticCodeSnippet/);
  assert.match(browserSmokeSource, /installApiPlaygroundFetchInterceptor/);
  assert.match(browserSmokeSource, /resolveApiPlaygroundFixture/);
  assert.match(browserSmokeSource, /selectRouteApiReferenceEndpointByName\("Retrieve Model"\)/);
  assert.match(browserSmokeSource, /selectRouteApiReferenceEndpointByName\("Create Chat Completion"\)/);
  assert.match(browserSmokeSource, /clickRouteButtonByExactText\("Try it out"\)/);
  assert.match(browserSmokeSource, /function clickRoutePlaygroundBulkEditForSection/);
  assert.match(browserSmokeSource, /clickRoutePlaygroundBulkEditForSection\("Headers"\)/);
  assert.match(browserSmokeSource, /clickRoutePlaygroundBulkEditForSection\("Query Params"\)/);
  assert.doesNotMatch(
    browserSmokeSource,
    /clickRoutePlaygroundTabByExactText\("Headers"\),\s*clickRouteButtonByExactText\("Bulk Edit"\)/,
  );
  assert.match(browserSmokeSource, /setRouteBulkEditValue/);
  assert.match(browserSmokeSource, /clickRouteButtonByExactText\("Key-Value Edit"\)/);
  assert.match(browserSmokeSource, /setRouteParamTableInput/);
  assert.match(browserSmokeSource, /setRouteTextareaValue/);
  assert.match(browserSmokeSource, /installRouteDownloadProbe/);
  assert.match(browserSmokeSource, /installRouteClipboardProbe/);
  assert.match(browserSmokeSource, /clickRouteSaveResponseButton\(\)/);
  assert.match(browserSmokeSource, /clickRouteCopyResponseButton\(\)/);
  assert.match(browserSmokeSource, /clickRouteButtonByExactText\("Send and Download"\)/);
  assert.match(browserSmokeSource, /clickRouteButtonByTitle\("Close Drawer"\)/);
  assert.match(browserSmokeSource, /setRouteSelectValueByOptionText\("Bearer Token"\)/);
  assert.match(browserSmokeSource, /setRoutePasswordInputByPlaceholder\("Enter your API Key \(sk-\.\.\.\)", "browser-smoke-api-key"\)/);
  assert.match(browserSmokeSource, /clickRouteResponseTabByExactText\("Headers"\)/);
  assert.match(browserSmokeSource, /clickRouteResponseTabByExactText\("Raw"\)/);
  assert.match(browserSmokeSource, /playground-response-200-ok\.json/);
  assert.match(browserSmokeSource, /Validation Error/);
  assert.match(browserSmokeSource, /Managed Header/);
  assert.match(browserSmokeSource, /Browser smoke playground response/);
  assert.match(browserSmokeSource, /Browser smoke primitive response/);
  assert.match(browserSmokeSource, /Browser smoke API key auth response/);
  assert.match(browserSmokeSource, /Network Error/);
  assert.match(browserSmokeSource, /This might be a CORS issue/);
  assert.match(browserSmokeSource, /requestHeaderValue\(request, "authorization"\)/);
  assert.match(browserSmokeSource, /Bearer \$\{API_PLAYGROUND_EXPECTED_API_KEY\}/);
  assert.match(browserSmokeSource, /document\.body\.innerText\.includes\("browser-smoke-api-key"\)/);
  assert.match(browserSmokeSource, /window\.__BROWSER_SMOKE_CLIPBOARD__ === "null"/);
  assert.match(browserSmokeSource, /window\.__BROWSER_SMOKE_DOWNLOAD__\?\.text === "null"/);
  assert.match(browserSmokeSource, /Status:/);
  assert.match(browserSmokeSource, /200 OK/);
  assert.match(browserSmokeSource, /0 Network Error/);
  assert.match(browserSmokeSource, /Save Response/);
  assert.match(browserSmokeSource, /Send and Download/);
  assert.match(browserSmokeSource, /button\[title="Close Drawer"\]/);
  assert.match(browserSmokeSource, /max-w-\[100vw\]/);
  assert.match(browserSmokeSource, /content-type/);
  assert.match(browserSmokeSource, /const APP_SDK_BROWSER_FIXTURES = new Map/);
  assert.match(browserSmokeSource, /APP_SDK_MODEL_EMPTY_FIXTURE_MODE/);
  assert.match(browserSmokeSource, /APP_SDK_MODEL_FIXTURE_MODE/);
  assert.match(browserSmokeSource, /APP_SDK_FIXTURE_MODE/);
  assert.match(browserSmokeSource, /APP_SDK_PORTAL_SESSION_FIXTURE_MODE/);
  assert.match(browserSmokeSource, /APP_SDK_SHARED_BROWSER_FIXTURES/);
  assert.match(browserSmokeSource, /app\/v3\/api\/notification\/notifications/);
  assert.match(browserSmokeSource, /app\/v3\/api\/ecosystem\/skills/);
  assert.match(browserSmokeSource, /Fetch\.enable/);
  assert.match(browserSmokeSource, /Fetch\.requestPaused/);
  assert.match(browserSmokeSource, /Fetch\.fulfillRequest/);
  assert.match(browserSmokeSource, /Fetch\.failRequest/);
  assert.match(browserSmokeSource, /networkErrorReason: "ConnectionFailed"/);
  assert.match(browserSmokeSource, /errorReason: fixture\.networkErrorReason/);
  assert.match(browserSmokeSource, /application\/json/);
  assert.match(browserSmokeSource, /Buffer\.from\(typeof fixture\.body === "string" \? fixture\.body : JSON\.stringify\(fixture\.body\)\)\.toString\("base64"\)/);
  assert.match(browserSmokeSource, /installAppSdkFixtureInterceptor/);
  assert.match(browserSmokeSource, /resolveAppSdkFixture/);
  assert.match(browserSmokeSource, /waitForRouteTextTokens/);
  assert.match(browserSmokeSource, /forbiddenTextTokens/);
  assert.match(browserSmokeSource, /waitForRouteForbiddenTextTokens/);
  assert.match(browserSmokeSource, /HTMLInputElement\.prototype/);
  assert.match(browserSmokeSource, /dispatchEvent\(new Event\("input", \{ bubbles: true \}\)\)/);
  assert.match(browserSmokeSource, /clickRouteButtonByExactText/);
  assert.match(browserSmokeSource, /Array\.isArray\(requiredTextTokens\)/);
  assert.match(browserSmokeSource, /document\.body\.innerText/);
  assert.match(browserSmokeSource, /window\.__CLAWROUTER_ENV__/);
}
);

test('verification plan refreshes generated SDK runtimes after production smoke and before portal runtime suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: true, skipPythonTests: true, skipSchemaGate: true },
    {},
  );
  const browserSmokeIndex = plan.findIndex((step) => step.label === 'portal production browser DOM smoke');
  const commonsRuntimeIndex = plan.findIndex((step) => step.label === 'portal commons runtime tests');
  const runtimeAppSdkRefreshIndex = plan.findIndex((step) => step.label === 'portal runtime app SDK refresh');
  const runtimeBackendSdkRefreshIndex = plan.findIndex((step) => step.label === 'portal runtime backend SDK refresh');
  const runtimeOpenSdkRefreshIndex = plan.findIndex((step) => step.label === 'portal runtime open SDK refresh');

  assert.ok(runtimeAppSdkRefreshIndex > browserSmokeIndex, 'runtime app SDK refresh must run after production browser smoke');
  assert.ok(runtimeBackendSdkRefreshIndex > runtimeAppSdkRefreshIndex, 'runtime backend SDK refresh must run after app SDK refresh');
  assert.ok(runtimeOpenSdkRefreshIndex > runtimeBackendSdkRefreshIndex, 'runtime open SDK refresh must run after backend SDK refresh');
  assert.ok(commonsRuntimeIndex > runtimeOpenSdkRefreshIndex, 'portal runtime suites must run after SDK runtime refresh');

  assert.deepEqual(plan[runtimeAppSdkRefreshIndex].args, [
    '--dir',
    'sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi',
    'build',
  ]);
  assert.deepEqual(plan[runtimeBackendSdkRefreshIndex].args, [
    '--dir',
    'sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi',
    'build',
  ]);
  assert.deepEqual(plan[runtimeOpenSdkRefreshIndex].args, [
    '--dir',
    'sdks/clawrouter-open-sdk/clawrouter-open-sdk-typescript/generated/server-openapi',
    'build',
  ]);
});

test('verification plan includes portal models runtime tests before broad suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const browserSmokeIndex = plan.findIndex((step) => step.label === 'portal production browser DOM smoke');
  const commonsRuntimeIndex = plan.findIndex((step) => step.label === 'portal commons runtime tests');
  const modelsRuntimeIndex = plan.findIndex((step) => step.label === 'portal models runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(modelsRuntimeIndex > browserSmokeIndex, 'models runtime tests must run after production browser smoke');
  assert.ok(modelsRuntimeIndex > commonsRuntimeIndex, 'models runtime tests must run after shared commons runtime tests');
  assert.ok(modelsRuntimeIndex < rustTestsIndex, 'models runtime tests must run before broad Rust tests');
  assert.ok(modelsRuntimeIndex < pythonTestsIndex, 'models runtime tests must run before broad Python tests');
  assert.ok(commandLines.includes(
    'node --experimental-strip-types apps/sdkwork-clawrouter-pc/models-runtime.test.ts',
  ));
});

test('verification plan includes portal commons runtime tests before route runtime tests', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const browserSmokeIndex = plan.findIndex((step) => step.label === 'portal production browser DOM smoke');
  const commonsRuntimeIndex = plan.findIndex((step) => step.label === 'portal commons runtime tests');
  const modelsRuntimeIndex = plan.findIndex((step) => step.label === 'portal models runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(commonsRuntimeIndex > browserSmokeIndex, 'commons runtime tests must run after production browser smoke');
  assert.ok(commonsRuntimeIndex < modelsRuntimeIndex, 'commons runtime tests must run before route runtime tests that depend on shared idempotency tokens');
  assert.ok(commonsRuntimeIndex < rustTestsIndex, 'commons runtime tests must run before broad Rust tests');
  assert.ok(commonsRuntimeIndex < pythonTestsIndex, 'commons runtime tests must run before broad Python tests');
  assert.ok(commandLines.includes(
    'node --experimental-strip-types apps/sdkwork-clawrouter-pc/commons-runtime.test.ts',
  ));
});

test('verification plan includes portal auth runtime tests before route runtime tests', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const commonsRuntimeIndex = plan.findIndex((step) => step.label === 'portal commons runtime tests');
  const authRuntimeIndex = plan.findIndex((step) => step.label === 'portal auth runtime tests');
  const modelsRuntimeIndex = plan.findIndex((step) => step.label === 'portal models runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(authRuntimeIndex > commonsRuntimeIndex, 'auth runtime tests must run after shared commons runtime tests');
  assert.ok(authRuntimeIndex < modelsRuntimeIndex, 'auth runtime tests must run before public route runtime tests');
  assert.ok(authRuntimeIndex < rustTestsIndex, 'auth runtime tests must run before broad Rust tests');
  assert.ok(authRuntimeIndex < pythonTestsIndex, 'auth runtime tests must run before broad Python tests');
  assert.ok(commandLines.includes(
    `${module.pnpmCommand()} --dir apps/sdkwork-clawrouter-pc exec tsx auth-runtime.test.ts`,
  ));
});

test('verification plan includes portal home downloads runtime tests before broad suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const rankingsRuntimeIndex = plan.findIndex((step) => step.label === 'portal rankings runtime tests');
  const homeDownloadsRuntimeIndex = plan.findIndex((step) => step.label === 'portal home downloads runtime tests');
  const apiReferenceRuntimeIndex = plan.findIndex((step) => step.label === 'portal api reference playground runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(homeDownloadsRuntimeIndex > rankingsRuntimeIndex, 'home downloads runtime tests must run after existing public route runtime tests');
  assert.ok(homeDownloadsRuntimeIndex < apiReferenceRuntimeIndex, 'home downloads runtime tests must run before API reference runtime tests');
  assert.ok(homeDownloadsRuntimeIndex < rustTestsIndex, 'home downloads runtime tests must run before broad Rust tests');
  assert.ok(homeDownloadsRuntimeIndex < pythonTestsIndex, 'home downloads runtime tests must run before broad Python tests');
  assert.ok(commandLines.includes(
    'node --experimental-strip-types apps/sdkwork-clawrouter-pc/home-downloads-runtime.test.ts',
  ));
});

test('verification plan includes portal api reference playground runtime tests before broad suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const homeDownloadsRuntimeIndex = plan.findIndex((step) => step.label === 'portal home downloads runtime tests');
  const apiReferenceRuntimeIndex = plan.findIndex((step) => step.label === 'portal api reference playground runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(apiReferenceRuntimeIndex > homeDownloadsRuntimeIndex, 'api reference playground runtime tests must run after home downloads runtime tests');
  assert.ok(apiReferenceRuntimeIndex < rustTestsIndex, 'api reference playground runtime tests must run before broad Rust tests');
  assert.ok(apiReferenceRuntimeIndex < pythonTestsIndex, 'api reference playground runtime tests must run before broad Python tests');
  assert.ok(commandLines.includes(
    `${module.pnpmCommand()} --dir apps/sdkwork-clawrouter-pc exec tsx api-reference-playground-runtime.test.ts`,
  ));
});

test('verification plan includes portal api reference SSR smoke before broad suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const apiReferenceRuntimeIndex = plan.findIndex((step) => step.label === 'portal api reference playground runtime tests');
  const apiReferenceSsrIndex = plan.findIndex((step) => step.label === 'portal api reference SSR smoke tests');
  const apiKeyRuntimeIndex = plan.findIndex((step) => step.label === 'portal api key runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(apiReferenceSsrIndex > apiReferenceRuntimeIndex, 'api reference SSR smoke must run after pure playground runtime tests');
  assert.ok(apiReferenceSsrIndex < apiKeyRuntimeIndex, 'api reference SSR smoke must run before console API key runtime tests');
  assert.ok(apiReferenceSsrIndex < rustTestsIndex, 'api reference SSR smoke must run before broad Rust tests');
  assert.ok(apiReferenceSsrIndex < pythonTestsIndex, 'api reference SSR smoke must run before broad Python tests');
  assert.ok(commandLines.includes(
    'node apps/sdkwork-clawrouter-pc/api-reference-ssr-smoke.test.cjs',
  ));
});

test('verification plan includes portal playground chat runtime tests before broad suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const apiReferenceSsrIndex = plan.findIndex((step) => step.label === 'portal api reference SSR smoke tests');
  const playgroundChatRuntimeIndex = plan.findIndex((step) => step.label === 'portal playground chat runtime tests');
  const apiKeyRuntimeIndex = plan.findIndex((step) => step.label === 'portal api key runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(playgroundChatRuntimeIndex > apiReferenceSsrIndex, 'playground chat runtime tests must run after API reference SSR smoke');
  assert.ok(playgroundChatRuntimeIndex < apiKeyRuntimeIndex, 'playground chat runtime tests must run before console API key runtime tests');
  assert.ok(playgroundChatRuntimeIndex < rustTestsIndex, 'playground chat runtime tests must run before broad Rust tests');
  assert.ok(playgroundChatRuntimeIndex < pythonTestsIndex, 'playground chat runtime tests must run before broad Python tests');
  assert.ok(commandLines.includes(
    `${module.pnpmCommand()} --dir apps/sdkwork-clawrouter-pc exec vitest run playground-chat-runtime.test.ts --config vite.config.ts --pool vmThreads`,
  ));
});

test('production browser smoke validates api reference route bundle semantics', () => {
  const smokeSource = readFileSync(
    path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'scripts', 'smoke-production-browser.mjs'),
    'utf8',
  );
  const playgroundRowsSource = readFileSync(
    path.join(documentsApiReferenceRoot, 'src', 'apiPlaygroundRows.ts'),
    'utf8',
  );
  const playgroundRequestSource = readFileSync(
    path.join(documentsApiReferenceRoot, 'src', 'playgroundRequest.ts'),
    'utf8',
  );
  const playgroundSource = readFileSync(
    path.join(documentsApiReferenceRoot, 'src', 'components', 'ApiPlayground.tsx'),
    'utf8',
  );
  const playgroundDownloadSource = readFileSync(
    path.join(
      documentsApiReferenceRoot,
      'src',
      'playgroundResponseDownload.ts',
    ),
    'utf8',
  );
  const apiReferenceSmokeStart = smokeSource.indexOf('pathName: "/api-reference"');
  const toolApiSmokeStart = smokeSource.indexOf('async function canBindPort');
  assert.notEqual(apiReferenceSmokeStart, -1);
  assert.notEqual(toolApiSmokeStart, -1);
  const apiReferenceSmokeSource = smokeSource.slice(apiReferenceSmokeStart, toolApiSmokeStart);

  assert.ok(smokeSource.includes('pathName: "/api-reference"'));
  assert.ok(apiReferenceSmokeSource.includes('/api-reference?__browser-smoke-playground-validation=1'));
  assert.ok(apiReferenceSmokeSource.includes('/api-reference?__browser-smoke-playground-managed-header=1'));
  assert.ok(apiReferenceSmokeSource.includes('/api-reference?__browser-smoke-playground-send=1'));
  assert.ok(apiReferenceSmokeSource.includes('/api-reference?__browser-smoke-tool-api-disabled=1'));
  assert.ok(playgroundRowsSource.includes('createApiPlaygroundInitialState'));
  assert.ok(playgroundRowsSource.includes('createApiPlaygroundInitialStateKey'));
  assert.ok(playgroundRowsSource.includes('extractApiPlaygroundPathTemplateVariables'));
  assert.ok(playgroundRowsSource.includes('parseApiPlaygroundBulkRows'));
  assert.ok(playgroundSource.includes('buildPlaygroundRequest'));
  assert.ok(playgroundRequestSource.includes('buildPlaygroundRequest'));
  assert.ok(playgroundRequestSource.includes('FORBIDDEN_HEADER_NAMES'));
  assert.ok(playgroundRequestSource.includes('Unresolved Path Variable'));
  assert.ok(playgroundRequestSource.includes('resolveRequiredErrorTab'));
  assert.ok(playgroundRequestSource.includes('content-type'));
  assert.ok(playgroundRequestSource.includes('Managed Header'));
  assert.ok(playgroundSource.includes('headers'));
  assert.ok(playgroundSource.includes('downloadApiPlaygroundResponse'));
  assert.ok(playgroundDownloadSource.includes('createApiPlaygroundResponseDownload'));
  assert.ok(playgroundDownloadSource.includes('serializeApiPlaygroundResponseData'));
  assert.ok(playgroundDownloadSource.includes('playground-response'));
  assert.ok(smokeSource.includes('Math.random'));
});

test('production browser smoke keeps backend SDK interception for portal session routes', () => {
  const smokeSource = readFileSync(
    path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'scripts', 'smoke-production-browser.mjs'),
    'utf8',
  );

  assert.ok(smokeSource.includes('requiresPortalSession: true'));
  assert.ok(smokeSource.includes('sdkwork.clawRouter.appSession.v1'));
  assert.ok(smokeSource.includes('/app/v3/api/auth/sessions/current'));
  assert.ok(smokeSource.includes('urlPattern: "*://*/backend/v3/api/*"'));
});

test('production browser smoke keeps current-user playground CORS compatible with app session tokens', () => {
  const smokeSource = readFileSync(
    path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'scripts', 'smoke-production-browser.mjs'),
    'utf8',
  );

  assert.ok(smokeSource.includes('apiPlaygroundCorsHeaders'));
  assert.ok(smokeSource.includes('access-token'));
  assert.ok(smokeSource.includes('authorization, content-type, access-token, x-browser-smoke'));
});

test('verification plan includes portal api key runtime tests before broad suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const apiReferenceRuntimeIndex = plan.findIndex((step) => step.label === 'portal api reference playground runtime tests');
  const apiKeyRuntimeIndex = plan.findIndex((step) => step.label === 'portal api key runtime tests');
  const consoleRoutingRuntimeIndex = plan.findIndex((step) => step.label === 'portal console routing runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(apiKeyRuntimeIndex > apiReferenceRuntimeIndex, 'api key runtime tests must run after public route runtime tests');
  assert.ok(apiKeyRuntimeIndex < consoleRoutingRuntimeIndex, 'api key runtime tests must run before console routing runtime tests');
  assert.ok(apiKeyRuntimeIndex < rustTestsIndex, 'api key runtime tests must run before broad Rust tests');
  assert.ok(apiKeyRuntimeIndex < pythonTestsIndex, 'api key runtime tests must run before broad Python tests');
  assert.ok(commandLines.includes(
    'node --experimental-strip-types apps/sdkwork-clawrouter-pc/api-key-runtime.test.ts',
  ));
});

test('verification plan includes portal commerce business runtime tests before broad suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const apiKeyRuntimeIndex = plan.findIndex((step) => step.label === 'portal api key runtime tests');
  const commerceBusinessRuntimeIndex = plan.findIndex((step) => step.label === 'portal commerce business runtime tests');
  const consoleRoutingRuntimeIndex = plan.findIndex((step) => step.label === 'portal console routing runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(commerceBusinessRuntimeIndex > apiKeyRuntimeIndex, 'commerce business runtime tests must run after account API key runtime tests');
  assert.ok(commerceBusinessRuntimeIndex < consoleRoutingRuntimeIndex, 'commerce business runtime tests must run before console routing runtime tests');
  assert.ok(commerceBusinessRuntimeIndex < rustTestsIndex, 'commerce business runtime tests must run before broad Rust tests');
  assert.ok(commerceBusinessRuntimeIndex < pythonTestsIndex, 'commerce business runtime tests must run before broad Python tests');
  assert.ok(commandLines.includes(
    `${module.pnpmCommand()} --dir apps/sdkwork-clawrouter-pc exec tsx commerce-business-runtime.test.ts`,
  ));
});

test('verification plan includes portal console app runtime tests before broad suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const commerceBusinessRuntimeIndex = plan.findIndex((step) => step.label === 'portal commerce business runtime tests');
  const consoleAppRuntimeIndex = plan.findIndex((step) => step.label === 'portal console app runtime tests');
  const consoleRoutingRuntimeIndex = plan.findIndex((step) => step.label === 'portal console routing runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(consoleAppRuntimeIndex > commerceBusinessRuntimeIndex, 'console app runtime tests must run after commerce business runtime tests');
  assert.ok(consoleAppRuntimeIndex < consoleRoutingRuntimeIndex, 'console app runtime tests must run before console routing runtime tests');
  assert.ok(consoleAppRuntimeIndex < rustTestsIndex, 'console app runtime tests must run before broad Rust tests');
  assert.ok(consoleAppRuntimeIndex < pythonTestsIndex, 'console app runtime tests must run before broad Python tests');
  assert.ok(commandLines.includes(
    `${module.pnpmCommand()} --dir apps/sdkwork-clawrouter-pc exec tsx console-app-runtime.test.ts`,
  ));
});

test('verification plan includes portal console routing runtime tests before broad suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const apiReferenceRuntimeIndex = plan.findIndex((step) => step.label === 'portal api reference playground runtime tests');
  const consoleRoutingRuntimeIndex = plan.findIndex((step) => step.label === 'portal console routing runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(consoleRoutingRuntimeIndex > apiReferenceRuntimeIndex, 'console routing runtime tests must run after public route runtime tests');
  assert.ok(consoleRoutingRuntimeIndex < rustTestsIndex, 'console routing runtime tests must run before broad Rust tests');
  assert.ok(consoleRoutingRuntimeIndex < pythonTestsIndex, 'console routing runtime tests must run before broad Python tests');
  assert.ok(commandLines.includes(
    'node --experimental-strip-types apps/sdkwork-clawrouter-pc/console-routing-runtime.test.ts',
  ));
});

test('verification plan includes portal admin group runtime tests before broad suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const consoleRoutingRuntimeIndex = plan.findIndex((step) => step.label === 'portal console routing runtime tests');
  const adminGroupRuntimeIndex = plan.findIndex((step) => step.label === 'portal admin group runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(adminGroupRuntimeIndex > consoleRoutingRuntimeIndex, 'admin group runtime tests must run after console routing runtime tests');
  assert.ok(adminGroupRuntimeIndex < rustTestsIndex, 'admin group runtime tests must run before broad Rust tests');
  assert.ok(adminGroupRuntimeIndex < pythonTestsIndex, 'admin group runtime tests must run before broad Python tests');
  assert.ok(commandLines.includes(
    'node --experimental-strip-types apps/sdkwork-clawrouter-pc/admin-group-runtime.test.ts',
  ));
});

test('verification plan includes portal console operations runtime tests before broad suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const consoleRoutingRuntimeIndex = plan.findIndex((step) => step.label === 'portal console routing runtime tests');
  const consoleOperationsRuntimeIndex = plan.findIndex((step) => step.label === 'portal console operations runtime tests');
  const adminGroupRuntimeIndex = plan.findIndex((step) => step.label === 'portal admin group runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(consoleOperationsRuntimeIndex > consoleRoutingRuntimeIndex, 'console operations runtime tests must run after console routing runtime tests');
  assert.ok(consoleOperationsRuntimeIndex < adminGroupRuntimeIndex, 'console operations runtime tests must run before admin runtime tests');
  assert.ok(consoleOperationsRuntimeIndex < rustTestsIndex, 'console operations runtime tests must run before broad Rust tests');
  assert.ok(consoleOperationsRuntimeIndex < pythonTestsIndex, 'console operations runtime tests must run before broad Python tests');
  assert.ok(commandLines.includes(
    'node --experimental-strip-types apps/sdkwork-clawrouter-pc/console-operations-runtime.test.ts',
  ));
});

test('verification plan includes portal admin user runtime tests before broad suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const adminGroupRuntimeIndex = plan.findIndex((step) => step.label === 'portal admin group runtime tests');
  const adminChannelRuntimeIndex = plan.findIndex((step) => step.label === 'portal admin channel runtime tests');
  const adminUserRuntimeIndex = plan.findIndex((step) => step.label === 'portal admin user runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(adminUserRuntimeIndex > adminGroupRuntimeIndex, 'admin user runtime tests must run after admin group runtime tests');
  assert.ok(adminUserRuntimeIndex > adminChannelRuntimeIndex, 'admin user runtime tests must run after admin channel runtime tests');
  assert.ok(adminUserRuntimeIndex < rustTestsIndex, 'admin user runtime tests must run before broad Rust tests');
  assert.ok(adminUserRuntimeIndex < pythonTestsIndex, 'admin user runtime tests must run before broad Python tests');
  assert.ok(commandLines.includes(
    'node --experimental-strip-types apps/sdkwork-clawrouter-pc/admin-user-runtime.test.ts',
  ));
});

test('verification plan includes portal admin channel runtime tests before broad suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const adminGroupRuntimeIndex = plan.findIndex((step) => step.label === 'portal admin group runtime tests');
  const adminChannelRuntimeIndex = plan.findIndex((step) => step.label === 'portal admin channel runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(adminChannelRuntimeIndex > adminGroupRuntimeIndex, 'admin channel runtime tests must run after admin group runtime tests');
  assert.ok(adminChannelRuntimeIndex < rustTestsIndex, 'admin channel runtime tests must run before broad Rust tests');
  assert.ok(adminChannelRuntimeIndex < pythonTestsIndex, 'admin channel runtime tests must run before broad Python tests');
  assert.ok(commandLines.includes(
    'node --experimental-strip-types apps/sdkwork-clawrouter-pc/admin-channel-runtime.test.ts',
  ));
});

test('verification plan includes portal admin model runtime tests before broad suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const adminUserRuntimeIndex = plan.findIndex((step) => step.label === 'portal admin user runtime tests');
  const adminModelRuntimeIndex = plan.findIndex((step) => step.label === 'portal admin model runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(adminModelRuntimeIndex > adminUserRuntimeIndex, 'admin model runtime tests must run after admin user runtime tests');
  assert.ok(adminModelRuntimeIndex < rustTestsIndex, 'admin model runtime tests must run before broad Rust tests');
  assert.ok(adminModelRuntimeIndex < pythonTestsIndex, 'admin model runtime tests must run before broad Python tests');
  assert.ok(commandLines.includes(
    'node --experimental-strip-types apps/sdkwork-clawrouter-pc/admin-model-runtime.test.ts',
  ));
});

test('verification plan includes portal admin ratelimit runtime tests before broad suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const adminModelRuntimeIndex = plan.findIndex((step) => step.label === 'portal admin model runtime tests');
  const adminRatelimitRuntimeIndex = plan.findIndex((step) => step.label === 'portal admin ratelimit runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(adminRatelimitRuntimeIndex > adminModelRuntimeIndex, 'admin ratelimit runtime tests must run after admin model runtime tests');
  assert.ok(adminRatelimitRuntimeIndex < rustTestsIndex, 'admin ratelimit runtime tests must run before broad Rust tests');
  assert.ok(adminRatelimitRuntimeIndex < pythonTestsIndex, 'admin ratelimit runtime tests must run before broad Python tests');
  assert.ok(commandLines.includes(
    'node --experimental-strip-types apps/sdkwork-clawrouter-pc/admin-ratelimit-runtime.test.ts',
  ));
});

test('verification plan includes portal admin marketing runtime tests before broad suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const adminRatelimitRuntimeIndex = plan.findIndex((step) => step.label === 'portal admin ratelimit runtime tests');
  const adminMarketingRuntimeIndex = plan.findIndex((step) => step.label === 'portal admin marketing runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(adminMarketingRuntimeIndex > adminRatelimitRuntimeIndex, 'admin marketing runtime tests must run after admin ratelimit runtime tests');
  assert.ok(adminMarketingRuntimeIndex < rustTestsIndex, 'admin marketing runtime tests must run before broad Rust tests');
  assert.ok(adminMarketingRuntimeIndex < pythonTestsIndex, 'admin marketing runtime tests must run before broad Python tests');
  assert.ok(commandLines.includes(
    'node --experimental-strip-types apps/sdkwork-clawrouter-pc/admin-marketing-runtime.test.ts',
  ));
});

test('verification plan includes portal admin announcement runtime tests before broad suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const adminMarketingRuntimeIndex = plan.findIndex((step) => step.label === 'portal admin marketing runtime tests');
  const adminAnnouncementRuntimeIndex = plan.findIndex((step) => step.label === 'portal admin announcement runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(adminAnnouncementRuntimeIndex > adminMarketingRuntimeIndex, 'admin announcement runtime tests must run after admin marketing runtime tests');
  assert.ok(adminAnnouncementRuntimeIndex < rustTestsIndex, 'admin announcement runtime tests must run before broad Rust tests');
  assert.ok(adminAnnouncementRuntimeIndex < pythonTestsIndex, 'admin announcement runtime tests must run before broad Python tests');
  assert.ok(commandLines.includes(
    'node --experimental-strip-types apps/sdkwork-clawrouter-pc/admin-announcement-runtime.test.ts',
  ));
});

test('verification plan includes portal admin operations runtime tests before broad suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const adminMarketingRuntimeIndex = plan.findIndex((step) => step.label === 'portal admin marketing runtime tests');
  const adminOperationsRuntimeIndex = plan.findIndex((step) => step.label === 'portal admin operations runtime tests');
  const adminAnnouncementRuntimeIndex = plan.findIndex((step) => step.label === 'portal admin announcement runtime tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(adminOperationsRuntimeIndex > adminMarketingRuntimeIndex, 'admin operations runtime tests must run after admin marketing runtime tests');
  assert.ok(adminOperationsRuntimeIndex < adminAnnouncementRuntimeIndex, 'admin operations runtime tests must run before admin announcement runtime tests');
  assert.ok(adminOperationsRuntimeIndex < rustTestsIndex, 'admin operations runtime tests must run before broad Rust tests');
  assert.ok(adminOperationsRuntimeIndex < pythonTestsIndex, 'admin operations runtime tests must run before broad Python tests');
  assert.ok(commandLines.includes(
    'node --experimental-strip-types apps/sdkwork-clawrouter-pc/admin-operations-runtime.test.ts',
  ));
});

test('verification plan includes portal models SSR smoke before broad suites', async () => {
  const module = await import(
    pathToFileURL(path.join(workspaceRoot, 'scripts', 'verify-claw-router-application.mjs')).href
  );
  const plan = module.buildVerificationPlan(
    { skipRustTests: false, skipPythonTests: false, skipSchemaGate: true },
    {},
  );
  const commandLines = plan.map((step) => `${step.command} ${step.args.join(' ')}`);
  const modelsRuntimeIndex = plan.findIndex((step) => step.label === 'portal models runtime tests');
  const modelsSsrIndex = plan.findIndex((step) => step.label === 'portal models SSR smoke tests');
  const rustTestsIndex = plan.findIndex((step) => step.label === 'rust workspace tests');
  const pythonTestsIndex = plan.findIndex((step) => step.label === 'python standard tests');

  assert.ok(modelsSsrIndex > modelsRuntimeIndex, 'models SSR smoke must run after model data runtime tests');
  assert.ok(modelsSsrIndex < rustTestsIndex, 'models SSR smoke must run before broad Rust tests');
  assert.ok(modelsSsrIndex < pythonTestsIndex, 'models SSR smoke must run before broad Python tests');
  assert.ok(commandLines.includes(
    'node apps/sdkwork-clawrouter-pc/models-ssr-smoke.test.cjs',
  ));
});

function readTarEntries(buffer) {
  const entries = new Map();
  for (let offset = 0; offset + 512 <= buffer.length;) {
    const header = buffer.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      break;
    }
    const namePart = readTarString(header, 0, 100);
    const prefixPart = readTarString(header, 345, 155);
    const name = prefixPart ? `${prefixPart}/${namePart}` : namePart;
    const mode = Number.parseInt(readTarString(header, 100, 8) || '0', 8);
    const size = Number.parseInt(readTarString(header, 124, 12) || '0', 8);
    const typeflag = header.subarray(156, 157).toString('ascii');
    entries.set(name, {
      mode,
      size,
      type: typeflag === '5' ? 'directory' : 'file',
      typeflag,
    });
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return entries;
}

function assertTarParentBeforeChild(entryNames, parent, child) {
  const parentIndex = entryNames.indexOf(parent);
  const childIndex = entryNames.indexOf(child);
  assert.ok(parentIndex >= 0, `Missing tar parent directory entry: ${parent}`);
  assert.ok(childIndex >= 0, `Missing tar child entry: ${child}`);
  assert.ok(parentIndex < childIndex, `${parent} must appear before ${child}`);
}

function assertNativePermission(permissions, expected) {
  assert.ok(
    permissions.some((item) =>
      item.path === expected.path
      && item.owner === expected.owner
      && item.group === expected.group
      && item.mode === expected.mode
    ),
    `Missing native permission ${expected.path} ${expected.owner}:${expected.group} ${expected.mode}`,
  );
}

function readTarEntryText(buffer, expectedName) {
  for (let offset = 0; offset + 512 <= buffer.length;) {
    const header = buffer.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      break;
    }
    const namePart = readTarString(header, 0, 100);
    const prefixPart = readTarString(header, 345, 155);
    const name = prefixPart ? `${prefixPart}/${namePart}` : namePart;
    const size = Number.parseInt(readTarString(header, 124, 12) || '0', 8);
    const dataOffset = offset + 512;
    if (name === expectedName) {
      return buffer.subarray(dataOffset, dataOffset + size).toString('utf8');
    }
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  throw new Error(`Missing tar entry: ${expectedName}`);
}

function readArEntries(buffer) {
  assert.equal(buffer.subarray(0, 8).toString('ascii'), '!<arch>\n');
  const entries = new Map();
  for (let offset = 8; offset + 60 <= buffer.length;) {
    const header = buffer.subarray(offset, offset + 60);
    const name = header.subarray(0, 16).toString('ascii').trim().replace(/\/$/u, '');
    const size = Number.parseInt(header.subarray(48, 58).toString('ascii').trim(), 10);
    assert.equal(header.subarray(58, 60).toString('ascii'), '`\n');
    const dataOffset = offset + 60;
    entries.set(name, buffer.subarray(dataOffset, dataOffset + size));
    offset = dataOffset + size + (size % 2);
  }
  return entries;
}

function readTarString(buffer, offset, length) {
  return buffer
    .subarray(offset, offset + length)
    .toString('utf8')
    .replace(/\0.*$/u, '')
    .trim();
}

function slashPath(value) {
  return String(value).replaceAll('\\', '/');
}

function assertMarkdownLocalLinksExist(relativePath) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  const markdown = readFileSync(absolutePath, 'utf8');
  const linkPattern = /\[[^\]]+\]\((?!https?:|mailto:|#)([^)]+)\)/gu;
  for (const match of markdown.matchAll(linkPattern)) {
    const targetRef = match[1].split('#')[0].trim().replace(/^<|>$/gu, '');
    if (!targetRef) {
      continue;
    }
    const targetPath = path.resolve(path.dirname(absolutePath), targetRef);
    assert.equal(
      existsSync(targetPath),
      true,
      `${relativePath} links to missing local target ${targetRef}`,
    );
  }
}

const testNamePattern = parseTestNamePattern(process.argv.slice(2));
const selectedTests = testNamePattern === null
  ? tests
  : tests.filter(({ name }) => testNamePattern.test(name));

if (testNamePattern !== null && selectedTests.length === 0) {
  throw new Error(`no tests matched --test-name-pattern ${testNamePattern.source}`);
}

let failed = 0;
for (const { name, fn } of selectedTests) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`not ok - ${name}`);
    console.error(error instanceof Error ? error.stack : String(error));
  }
}

if (failed > 0) {
  process.exit(1);
}
