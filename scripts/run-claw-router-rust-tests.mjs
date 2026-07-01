#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const PROFILES = new Set(['auto', 'smoke', 'quick', 'admin-api', 'app-api', 'gateway', 'product-relay', 'runtime', 'full']);
const PACKAGE_BY_SERVICE_DIR = Object.freeze({
  'sdkwork-clawrouter-admin-gateway': 'sdkwork-clawrouter-admin-gateway',
  'sdkwork-clawrouter-standalone-gateway': 'sdkwork-clawrouter-standalone-gateway',
  'sdkwork-clawrouter-cloud-gateway': 'sdkwork-clawrouter-cloud-gateway',
  'sdkwork-clawrouter-standalone-gateway': 'sdkwork-clawrouter-standalone-gateway',
  'sdkwork-claw-installer': 'sdkwork-claw-installer',
  'sdkwork-clawrouter-router-service': 'sdkwork-clawrouter-router-service',
});
const PACKAGE_WORKSPACE_ROOTS = Object.freeze(['services', 'crates']);
const PROFILE_BY_SERVICE_PACKAGE = Object.freeze({
  'sdkwork-clawrouter-admin-gateway': 'admin-api',
  'sdkwork-clawrouter-standalone-gateway': 'app-api',
  'sdkwork-clawrouter-cloud-gateway': 'gateway',
  'sdkwork-claw-installer': 'runtime',
  'sdkwork-clawrouter-router-service': 'runtime',
});
const PROFILE_BY_PATH_PREFIX = Object.freeze([
  ['crates/sdkwork-claw-config/', 'quick'],
  ['crates/sdkwork-claw-security/', 'quick'],
  ['crates/sdkwork-claw-test-support/', 'smoke'],
  ['crates/sdkwork-claw-http/', 'runtime'],
  ['services/sdkwork-claw-provider-adapter/', 'product-relay'],
  ['crates/sdkwork-clawrouter-cloud-gateway/', 'gateway'],
  ['crates/sdkwork-clawrouter-standalone-gateway-lib/', 'gateway'],
  ['services/sdkwork-clawrouter-standalone-gateway/', 'app-api'],
  ['Cargo.toml', 'quick'],
  ['Cargo.lock', 'quick'],
  ['.cargo/', 'quick'],
]);

function printHelp() {
  console.log(`Usage: node scripts/run-claw-router-rust-tests.mjs <profile> [options]

Run scoped Rust verification profiles without reusing the shared target/debug tree.

Profiles:
  auto        Infer the smallest useful Rust test surface from changed files.
  smoke       Ultra-fast fixture and route smoke for high-frequency iteration.
  quick       Format and focused high-signal package tests for daily iteration.
  admin-api   Admin API route tests split by test target.
  app-api     App API route tests split by test target.
  gateway     Gateway edge and provider relay tests split by test target.
  product-relay
              Product OpenAI-compatible relay and provider adapter tests.
  runtime     Product/gateway/admin/app/installer runtime integration package group.
  full        Full cargo workspace tests.

Options:
  --changed-file <path>   Hint one changed file for the auto profile. Can be repeated.
  --staged                Only inspect staged Git changes for the auto profile.
  --base-ref <ref>        Diff committed changes from <ref> for the auto profile.
  --target-dir <path>     Override Cargo target directory.
                          Defaults to target-rust-tests/daily for scoped profiles
                          and target-rust-tests/full for the full workspace profile.
  --build-jobs <count>    Override Cargo build parallelism for this run.
  --test-threads <count>  Forward --test-threads to cargo test binaries.
  --dry-run               Print commands without executing them.
  -h, --help              Show this help.
`);
}

function parseArgs(argv) {
  const settings = {
    profile: null,
    changedFiles: [],
    staged: false,
    baseRef: null,
    targetDir: null,
    buildJobs: null,
    testThreads: null,
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      continue;
    }
    switch (arg) {
      case '--dry-run':
        settings.dryRun = true;
        break;
      case '--help':
      case '-h':
        settings.help = true;
        break;
      case '--target-dir':
        index += 1;
        if (!argv[index]) {
          throw new Error('--target-dir requires a value');
        }
        settings.targetDir = argv[index];
        break;
      case '--changed-file':
        index += 1;
        if (!argv[index]) {
          throw new Error('--changed-file requires a value');
        }
        settings.changedFiles.push(argv[index]);
        break;
      case '--staged':
        settings.staged = true;
        break;
      case '--base-ref':
        index += 1;
        if (!argv[index]) {
          throw new Error('--base-ref requires a value');
        }
        settings.baseRef = argv[index];
        break;
      case '--build-jobs':
        index += 1;
        if (!argv[index] || !/^[1-9][0-9]*$/u.test(argv[index])) {
          throw new Error('--build-jobs requires a positive integer');
        }
        settings.buildJobs = argv[index];
        break;
      case '--test-threads':
        index += 1;
        if (!argv[index] || !/^[1-9][0-9]*$/u.test(argv[index])) {
          throw new Error('--test-threads requires a positive integer');
        }
        settings.testThreads = argv[index];
        break;
      default:
        if (!settings.profile && PROFILES.has(arg)) {
          settings.profile = arg;
          break;
        }
        throw new Error(`Unsupported rust test option: ${arg}`);
    }
  }

  if (!settings.help && !settings.profile) {
    settings.profile = 'quick';
  }
  const autoSelectorCount = Number(settings.changedFiles.length > 0) + Number(settings.staged) + Number(Boolean(settings.baseRef));
  if (autoSelectorCount > 1) {
    throw new Error('Choose only one auto change selector: --changed-file, --staged, or --base-ref');
  }
  return settings;
}

function normalizeTargetDir(profile, targetDir, platform = process.platform) {
  const selected = targetDir || path.join('target-rust-tests', profile === 'full' ? 'full' : 'daily');
  return platform === 'win32' ? selected.replaceAll('/', '\\') : selected.replaceAll('\\', '/');
}

function buildCargoEnv(env, { targetDir, buildJobs }) {
  const stepEnv = {
    ...env,
    CARGO_TARGET_DIR: targetDir,
  };
  delete stepEnv.CARGO_BUILD_JOBS;
  if (buildJobs) {
    stepEnv.CARGO_BUILD_JOBS = buildJobs;
  }
  if (!stepEnv.SDKWORK_CLAW_HTTP_OPENAPI_BUILD_MODE) {
    stepEnv.SDKWORK_CLAW_HTTP_OPENAPI_BUILD_MODE = 'copy';
  }
  return stepEnv;
}

function normalizePathForMatching(value) {
  return String(value).replaceAll('\\', '/');
}

function uniqueNormalizedPaths(paths) {
  return [...new Set(paths.map((file) => normalizePathForMatching(file)).filter(Boolean))];
}

function parseGitStatusEntries(output) {
  if (!output) {
    return [];
  }
  const entries = output.split('\0').filter(Boolean);
  const changed = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const status = entry.slice(0, 2);
    const file = normalizePathForMatching(entry.slice(3));
    if (status.startsWith('R') || status.startsWith('C')) {
      const renamedTo = normalizePathForMatching(entries[index + 1] ?? '');
      if (renamedTo) {
        changed.push(renamedTo);
      }
      index += 1;
      continue;
    }
    if (file) {
      changed.push(file);
    }
  }
  return uniqueNormalizedPaths(changed);
}

function parseGitNameOnlyEntries(output) {
  if (!output) {
    return [];
  }
  return uniqueNormalizedPaths(output.split('\0').filter(Boolean));
}

function collectAutoChangedFiles({ changedFiles = [], staged = false, baseRef = null } = {}, cwd = process.cwd()) {
  if (changedFiles.length > 0) {
    return uniqueNormalizedPaths(changedFiles);
  }
  if (!existsSync(path.join(cwd, '.git'))) {
    return [];
  }
  try {
    if (staged) {
      const output = execFileSync(
        'git',
        ['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR'],
        { cwd, encoding: 'utf8' },
      );
      return parseGitNameOnlyEntries(output);
    }
    if (baseRef) {
      const mergeBase = execFileSync(
        'git',
        ['merge-base', baseRef, 'HEAD'],
        { cwd, encoding: 'utf8' },
      ).trim();
      if (!mergeBase) {
        return [];
      }
      const output = execFileSync(
        'git',
        ['diff', '--name-only', '-z', '--diff-filter=ACMR', mergeBase, 'HEAD'],
        { cwd, encoding: 'utf8' },
      );
      return parseGitNameOnlyEntries(output);
    }
    const output = execFileSync(
      'git',
      ['status', '--porcelain', '--untracked-files=all', '-z'],
      { cwd, encoding: 'utf8' },
    );
    return parseGitStatusEntries(output);
  } catch {
    return [];
  }
}

function cargoStep(label, args, env, settings) {
  const stepArgs = [...args];
  if (settings.testThreads && args[0] === 'test') {
    stepArgs.push('--', '--test-threads', settings.testThreads);
  }
  return {
    label,
    command: 'cargo',
    args: stepArgs,
    env,
  };
}

function servicePackageFromChangedFile(changedFile) {
  const normalized = normalizePathForMatching(changedFile);
  const match = normalized.match(/^(?:services|crates)\/([^/]+)\//u);
  if (!match) {
    return null;
  }
  return PACKAGE_BY_SERVICE_DIR[match[1]] ?? null;
}

function packageWorkspaceDirs(packageName, cwd = process.cwd()) {
  const serviceDir = Object.entries(PACKAGE_BY_SERVICE_DIR).find(([, value]) => value === packageName)?.[0];
  if (!serviceDir) {
    return [];
  }
  return PACKAGE_WORKSPACE_ROOTS
    .map((root) => path.join(cwd, root, serviceDir))
    .filter((dir) => existsSync(dir));
}

function packageTestTargets(packageName, cwd = process.cwd()) {
  return packageTestFiles(packageName, cwd).map(({ testTarget }) => testTarget);
}

function packageTestFiles(packageName, cwd = process.cwd()) {
  const files = [];
  for (const packageDir of packageWorkspaceDirs(packageName, cwd)) {
    const testsDir = path.join(packageDir, 'tests');
    if (!existsSync(testsDir)) {
      continue;
    }
    for (const entry of readdirSync(testsDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.rs')) {
        continue;
      }
      files.push({
        testTarget: entry.name.slice(0, -3),
        filePath: path.join(testsDir, entry.name),
      });
    }
  }
  return files;
}

function exactAutoTargetsFromChangedTestFile(changedFile) {
  const normalized = normalizePathForMatching(changedFile);
  const testMatch = normalized.match(/^(?:services|crates)\/([^/]+)\/tests\/([^/]+)\.rs$/u);
  if (!testMatch) {
    return null;
  }
  const packageName = PACKAGE_BY_SERVICE_DIR[testMatch[1]];
  if (!packageName) {
    return null;
  }
  return [{ packageName, testTarget: testMatch[2] }];
}

function inferredAutoTargetsFromSourceFile(changedFile, cwd = process.cwd()) {
  const normalized = normalizePathForMatching(changedFile);
  const sourceMatch = normalized.match(/^(?:services|crates)\/([^/]+)\/src\/.+\/([^/]+)\.rs$/u)
    ?? normalized.match(/^(?:services|crates)\/([^/]+)\/src\/([^/]+)\.rs$/u);
  if (!sourceMatch) {
    return null;
  }
  const packageName = PACKAGE_BY_SERVICE_DIR[sourceMatch[1]];
  if (!packageName) {
    return null;
  }
  const stem = sourceMatch[2];
  const availableTargets = packageTestTargets(packageName, cwd);
  if (availableTargets.length === 0) {
    return null;
  }
  const candidateNames = new Set([
    stem,
    `${stem}_api`,
    `${stem}_route`,
    `${stem}_router`,
    `${stem}_store`,
    `${stem}_sql_contract`,
    `sqlite_${stem}`,
    `postgres_${stem}`,
    `sqlite_${stem}_sql_contract`,
    `postgres_${stem}_sql_contract`,
    `secret_ref_${stem}`,
  ]);
  const selectedTargets = availableTargets.filter((target) =>
    candidateNames.has(target)
    || target.endsWith(`_${stem}`)
    || target.endsWith(`_${stem}_api`)
    || target.endsWith(`_${stem}_route`)
    || target.endsWith(`_${stem}_store`)
    || target.endsWith(`_${stem}_sql_contract`),
  );
  if (selectedTargets.length === 0) {
    return null;
  }
  return selectedTargets.map((testTarget) => ({ packageName, testTarget }));
}

function inferredAutoTargetsFromSharedTestHelper(changedFile, cwd = process.cwd()) {
  const normalized = normalizePathForMatching(changedFile);
  const helperMatch = normalized.match(/^(?:services|crates)\/([^/]+)\/tests\/common\/([^/]+)\.rs$/u);
  if (!helperMatch) {
    return null;
  }
  const packageName = PACKAGE_BY_SERVICE_DIR[helperMatch[1]];
  if (!packageName) {
    return null;
  }
  const helperStem = helperMatch[2];
  const referencePattern = helperStem === 'mod'
    ? 'mod common;'
    : `#[path = "common/${helperStem}.rs"]`;
  const selectedTargets = packageTestFiles(packageName, cwd)
    .filter(({ filePath }) => readFileSync(filePath, 'utf8').includes(referencePattern))
    .map(({ testTarget }) => ({ packageName, testTarget }));
  if (selectedTargets.length === 0) {
    return null;
  }
  return selectedTargets;
}

function inferredAutoTargetsFromProductTestSupportCrate(changedFile, cwd = process.cwd()) {
  const normalized = normalizePathForMatching(changedFile);
  if (!normalized.startsWith('crates/sdkwork-clawrouter-router-service-test-support/src/')) {
    return null;
  }
  const productTestSupportSymbolsByFile = Object.freeze({
    'installed.rs': ['installed_sqlite_pool'],
    'repair.rs': ['repair_sqlite_pool'],
    'schema.rs': ['schema_sqlite_pool'],
  });
  const changedFileName = normalized.split('/').at(-1);
  const requiredSymbols = productTestSupportSymbolsByFile[changedFileName] ?? null;
  const selectedTargets = packageTestFiles('sdkwork-clawrouter-router-service', cwd)
    .filter(({ filePath }) => {
      const source = readFileSync(filePath, 'utf8');
      if (!source.includes('sdkwork_clawrouter_router_service_test_support::')) {
        return false;
      }
      if (!requiredSymbols) {
        return true;
      }
      return requiredSymbols.some((symbol) => source.includes(symbol));
    })
    .map(({ testTarget }) => ({ packageName: 'sdkwork-clawrouter-router-service', testTarget }));
  if (selectedTargets.length === 0) {
    return null;
  }
  return selectedTargets;
}

function autoTargetsFromChangedFile(changedFile, cwd = process.cwd()) {
  return exactAutoTargetsFromChangedTestFile(changedFile)
    ?? inferredAutoTargetsFromSourceFile(changedFile, cwd)
    ?? inferredAutoTargetsFromProductTestSupportCrate(changedFile, cwd)
    ?? inferredAutoTargetsFromSharedTestHelper(changedFile, cwd);
}

function buildAutoTargetSteps(changedFiles, env, settings, cwd = process.cwd()) {
  const targets = [];
  for (const changedFile of changedFiles) {
    const fileTargets = autoTargetsFromChangedFile(changedFile, cwd);
    if (!fileTargets) {
      return null;
    }
    for (const target of fileTargets) {
      if (!targets.some((item) => item.packageName === target.packageName && item.testTarget === target.testTarget)) {
        targets.push(target);
      }
    }
  }
  if (targets.length === 0) {
    return null;
  }
  return targets.map(({ packageName, testTarget }) =>
    cargoStep(
      `${packageName} ${testTarget} exact target`,
      ['test', '-p', packageName, '--test', testTarget],
      env,
      settings,
    ),
  );
}

function resolveAutoProfile(changedFiles) {
  if (changedFiles.length === 0) {
    return { resolvedProfile: 'quick' };
  }
  for (const changedFile of changedFiles) {
    const normalized = normalizePathForMatching(changedFile);
    const matchedPrefix = PROFILE_BY_PATH_PREFIX.find(([prefix]) =>
      normalized === prefix || normalized.startsWith(prefix),
    );
    if (matchedPrefix) {
      return { resolvedProfile: matchedPrefix[1] };
    }
  }
  const packages = [...new Set(changedFiles.map(servicePackageFromChangedFile).filter(Boolean))];
  if (packages.length === 0) {
    return { resolvedProfile: 'quick' };
  }
  if (packages.length > 1) {
    return { resolvedProfile: 'runtime' };
  }
  const packageName = packages[0];
  return {
    resolvedProfile: PROFILE_BY_SERVICE_PACKAGE[packageName] ?? 'quick',
  };
}

function buildQuickSteps(env, settings) {
  return [
    cargoStep(
      'rust format for frequently touched packages',
      [
        'fmt',
        '-p',
        'sdkwork-claw-config',
        '-p',
        'sdkwork-claw-http',
        '-p',
        'sdkwork-claw-security',
        '-p',
        'sdkwork-claw-test-support',
        '-p',
        'sdkwork-clawrouter-router-service',
        '-p',
        'sdkwork-clawrouter-admin-gateway',
        '--check',
      ],
      env,
      settings,
    ),
    cargoStep(
      'redis config regression tests',
      ['test', '-p', 'sdkwork-claw-config', '--test', 'redis_config'],
      env,
      settings,
    ),
    cargoStep(
      'sqlite product model route smoke',
      [
        'test',
        '-p',
        'sdkwork-clawrouter-admin-gateway',
        '--test',
        'sqlite_product_model_route',
        'sqlite_product_catalog_route_serves_real_backend_model_list',
      ],
      env,
      settings,
    ),
  ];
}

function buildSmokeSteps(env, settings) {
  return [
    cargoStep(
      'shared test fixture smoke',
      ['test', '-p', 'sdkwork-claw-test-support', '--lib', 'seeded_sqlite_catalog_reopens_pool_for_real_route_tests'],
      env,
      settings,
    ),
    cargoStep(
      'admin api sqlite product model route smoke',
      [
        'test',
        '-p',
        'sdkwork-clawrouter-admin-gateway',
        '--test',
        'sqlite_product_model_route',
        'sqlite_product_catalog_route_serves_real_backend_model_list',
      ],
      env,
      settings,
    ),
  ];
}

function buildAdminApiSteps(env, settings) {
  return [
    cargoStep('admin api health tests', ['test', '-p', 'sdkwork-clawrouter-admin-gateway', '--test', 'health'], env, settings),
    cargoStep(
      'admin api contract route tests',
      ['test', '-p', 'sdkwork-clawrouter-admin-gateway', '--test', 'contract_routes'],
      env,
      settings,
    ),
    cargoStep(
      'admin api database router integration tests',
      ['test', '-p', 'sdkwork-clawrouter-admin-gateway', '--test', 'database_config_router'],
      env,
      settings,
    ),
    cargoStep(
      'admin api installation status tests',
      ['test', '-p', 'sdkwork-clawrouter-admin-gateway', '--test', 'installation_status_route'],
      env,
      settings,
    ),
    cargoStep(
      'admin api product model route tests',
      ['test', '-p', 'sdkwork-clawrouter-admin-gateway', '--test', 'product_model_route'],
      env,
      settings,
    ),
    cargoStep(
      'admin api sqlite product model route tests',
      ['test', '-p', 'sdkwork-clawrouter-admin-gateway', '--test', 'sqlite_product_model_route'],
      env,
      settings,
    ),
  ];
}

function buildAppApiSteps(env, settings) {
  return [
    cargoStep('app api health tests', ['test', '-p', 'sdkwork-clawrouter-standalone-gateway', '--test', 'health'], env, settings),
    cargoStep(
      'app api contract route tests',
      ['test', '-p', 'sdkwork-clawrouter-standalone-gateway', '--test', 'contract_routes'],
      env,
      settings,
    ),
    cargoStep(
      'app api database router integration tests',
      ['test', '-p', 'sdkwork-clawrouter-standalone-gateway', '--test', 'database_config_router'],
      env,
      settings,
    ),
    cargoStep(
      'app api session route tests',
      ['test', '-p', 'sdkwork-clawrouter-standalone-gateway', '--test', 'app_session_route'],
      env,
      settings,
    ),
    cargoStep(
      'app api model ranking route tests',
      ['test', '-p', 'sdkwork-clawrouter-standalone-gateway', '--test', 'model_rankings_route'],
      env,
      settings,
    ),
  ];
}

function buildGatewaySteps(env, settings) {
  return [
    cargoStep('gateway health tests', ['test', '-p', 'sdkwork-clawrouter-cloud-gateway', '--test', 'health'], env, settings),
    cargoStep(
      'gateway edge server tests',
      ['test', '-p', 'sdkwork-clawrouter-cloud-gateway', '--test', 'edge_server'],
      env,
      settings,
    ),
    cargoStep(
      'gateway database router integration tests',
      ['test', '-p', 'sdkwork-clawrouter-cloud-gateway', '--test', 'database_config_router'],
      env,
      settings,
    ),
    cargoStep(
      'gateway provider passthrough route tests',
      ['test', '-p', 'sdkwork-clawrouter-cloud-gateway', '--test', 'provider_passthrough_route'],
      env,
      settings,
    ),
    cargoStep(
      'gateway provider adapter invocation tests',
      ['test', '-p', 'sdkwork-clawrouter-cloud-gateway', '--test', 'provider_adapter_invocation'],
      env,
      settings,
    ),
    cargoStep(
      'gateway OpenAI relay route tests',
      [
        'test',
        '-p',
        'sdkwork-clawrouter-cloud-gateway',
        '--test',
        'openai_chat_relay_route',
        '--test',
        'openai_embeddings_relay_route',
        '--test',
        'openai_responses_relay_route',
      ],
      env,
      settings,
    ),
  ];
}

function buildProductRelaySteps(env, settings) {
  return [
    cargoStep(
      'product OpenAI-compatible HTTP relay tests',
      [
        'test',
        '-p',
        'sdkwork-clawrouter-router-service',
        '--test',
        'openai_compatible_http_relay',
        '--test',
        'openai_compatible_chat_stream_http_relay',
        '--test',
        'openai_compatible_embeddings_http_relay',
        '--test',
        'openai_compatible_responses_http_relay',
      ],
      env,
      settings,
    ),
    cargoStep(
      'product secret-ref relay tests',
      [
        'test',
        '-p',
        'sdkwork-clawrouter-router-service',
        '--test',
        'secret_ref_openai_compatible_http_relay',
        '--test',
        'secret_ref_openai_compatible_chat_stream_http_relay',
        '--test',
        'secret_ref_openai_compatible_embeddings_http_relay',
        '--test',
        'secret_ref_openai_compatible_responses_http_relay',
      ],
      env,
      settings,
    ),
    cargoStep(
      'product provider adapter API tests',
      [
        'test',
        '-p',
        'sdkwork-clawrouter-router-service',
        '--test',
        'openai_chat_adapter_api',
        '--test',
        'openai_embeddings_adapter_api',
        '--test',
        'openai_responses_adapter_api',
      ],
      env,
      settings,
    ),
  ];
}

function buildRuntimeSteps(env, settings) {
  return [
    cargoStep(
      'runtime integration package group',
      [
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
      ],
      env,
      settings,
    ),
  ];
}

function buildFullSteps(env, settings) {
  const runtimePackages = [
    'sdkwork-clawrouter-router-service',
    'sdkwork-clawrouter-cloud-gateway',
    'sdkwork-clawrouter-admin-gateway',
    'sdkwork-clawrouter-standalone-gateway',
    'sdkwork-claw-installer',
  ];
  return [
    cargoStep(
      'rust workspace support tests',
      [
        'test',
        '--workspace',
        ...runtimePackages.flatMap((packageName) => ['--exclude', packageName]),
      ],
      env,
      settings,
    ),
    ...runtimePackages.map((packageName) =>
      cargoStep(
        `${packageName} all target tests`,
        ['test', '-p', packageName, '--all-targets'],
        env,
        settings,
      ),
    ),
  ];
}

function buildRustTestPlan(settings, { env = process.env, platform = process.platform, cwd = process.cwd() } = {}) {
  const profile = settings.profile || 'quick';
  if (!PROFILES.has(profile)) {
    throw new Error(`Unsupported rust test profile: ${profile}`);
  }
  const targetDir = normalizeTargetDir(profile, settings.targetDir, platform);
  const stepEnv = buildCargoEnv(env, {
    targetDir,
    buildJobs: settings.buildJobs,
  });
  const normalizedChangedFiles = collectAutoChangedFiles({
    changedFiles: settings.changedFiles ?? [],
    staged: settings.staged ?? false,
    baseRef: settings.baseRef ?? null,
  }, cwd);
  const planSettings = { ...settings, profile, changedFiles: normalizedChangedFiles };
  if (profile === 'auto') {
    const autoTargetSteps = buildAutoTargetSteps(normalizedChangedFiles, stepEnv, planSettings, cwd);
    if (autoTargetSteps) {
      return {
        profile,
        resolvedProfile: 'auto-targets',
        targetDir,
        steps: autoTargetSteps,
      };
    }
    const autoResolution = resolveAutoProfile(normalizedChangedFiles);
    const delegatedPlan = buildRustTestPlan(
      { ...planSettings, profile: autoResolution.resolvedProfile },
      { env, platform, cwd },
    );
    return {
      profile,
      resolvedProfile: autoResolution.resolvedProfile,
      targetDir,
      steps: delegatedPlan.steps,
    };
  }
  const steps = {
    smoke: buildSmokeSteps,
    quick: buildQuickSteps,
    'admin-api': buildAdminApiSteps,
    'app-api': buildAppApiSteps,
    gateway: buildGatewaySteps,
    'product-relay': buildProductRelaySteps,
    runtime: buildRuntimeSteps,
    full: buildFullSteps,
  }[profile](stepEnv, planSettings);
  return { profile, targetDir, steps };
}

function commandLine(step) {
  return `${step.command} ${step.args.join(' ')}`;
}

function runStep(step, { dryRun = false } = {}) {
  if (dryRun) {
    console.log(commandLine(step));
    return Promise.resolve();
  }

  const startedAt = Date.now();
  console.error(`[run-claw-router-rust-tests] ${step.label}: ${commandLine(step)}`);
  return new Promise((resolve, reject) => {
    const child = spawn(step.command, step.args, {
      cwd: process.cwd(),
      env: step.env,
      stdio: 'inherit',
      windowsHide: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${step.label} exited with signal ${signal}`));
        return;
      }
      if ((code ?? 1) !== 0) {
        reject(new Error(`${step.label} exited with code ${code}`));
        return;
      }
      const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.error(`[run-claw-router-rust-tests] ${step.label}: completed in ${elapsedSeconds}s`);
      resolve();
    });
  });
}

async function main() {
  const settings = parseArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    return;
  }
  const plan = buildRustTestPlan(settings);
  for (const step of plan.steps) {
    await runStep(step, { dryRun: settings.dryRun });
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  main().catch((error) => {
    console.error(`[run-claw-router-rust-tests] ${error.message}`);
    process.exit(1);
  });
}

export {
  buildCargoEnv,
  buildRustTestPlan,
  collectAutoChangedFiles,
  commandLine,
  normalizeTargetDir,
  parseArgs,
};
