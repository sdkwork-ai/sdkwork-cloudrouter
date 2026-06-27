#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { buildReleaseEnvFilePlan } from './write-release-env.mjs';
import { currentHostArchivePackageId } from './build-claw-router-install-package.mjs';
import {
  DEFAULT_VERSION,
  createInstallPackagePlan,
  validateInstallPackagePlan,
} from './plan-claw-router-install-packages.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');
const DEFAULT_RELEASE_POSTGRES_URL = 'postgres://release-smoke.invalid:5432/sdkwork_claw_router';
const DEFAULT_RELEASE_POSTGRES_RUNTIME_URL = 'postgresql://release-smoke.invalid:5432/sdkwork_claw_router';

function printHelp() {
  console.log(`Usage: node scripts/smoke-install-package-init.mjs [options]

Validate package fast initialization without starting development services.

Options:
  --package-id <id>      Package id from install package plan.
  --package-root <dir>   Optional extracted package root to validate.
  --tmp-root <dir>       Temporary install root.
  --installer-bin <path> Optional real clawrouterctl binary to execute.
  --version <value>      Product package version (default ${DEFAULT_VERSION}).
  --check                Validate the smoke plan.
  --dry-run              Do not execute installer commands.
  --keep-tmp             Keep the temporary install root after CLI execution.
  --json                 Print machine-readable JSON.
  -h, --help             Show this help.
`);
}

function parseInstallInitSmokeArgs(argv = process.argv.slice(2)) {
  const settings = {
    check: false,
    dryRun: false,
    help: false,
    installerBin: null,
    json: false,
    keepTmp: false,
    packageId: currentHostArchivePackageId(process.platform, process.arch),
    packageRoot: null,
    tmpRoot: null,
    version: DEFAULT_VERSION,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      continue;
    }
    switch (arg) {
      case '--check':
        settings.check = true;
        break;
      case '--dry-run':
        settings.dryRun = true;
        break;
      case '--json':
        settings.json = true;
        break;
      case '--keep-tmp':
        settings.keepTmp = true;
        break;
      case '--installer-bin':
        settings.installerBin = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--package-id':
        settings.packageId = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--package-root':
        settings.packageRoot = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--tmp-root':
        settings.tmpRoot = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--version':
        settings.version = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--help':
      case '-h':
        settings.help = true;
        break;
      default:
        throw new Error(`Unsupported install init smoke option: ${arg}`);
    }
  }

  return settings;
}

function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function createInstallInitSmokePlan({
  packageId = currentHostArchivePackageId(process.platform, process.arch),
  packageRoot = null,
  tmpRoot = null,
  installerBin = null,
  version = DEFAULT_VERSION,
  root = workspaceRoot,
  requireInstaller = true,
} = {}) {
  const installPlan = createInstallPackagePlan({ version });
  const planIssues = validateInstallPackagePlan(installPlan);
  if (planIssues.length > 0) {
    throw new Error(`install package plan is invalid: ${planIssues.join('; ')}`);
  }
  const packageItem = installPlan.packages.find((item) => item.id === packageId);
  if (!packageItem) {
    throw new Error(`Unknown install package id: ${packageId}`);
  }

  const absoluteTmpRoot = path.resolve(root, tmpRoot ?? path.join('target', 'install-init-smoke', packageId));
  const absolutePackageRoot = packageRoot ? path.resolve(root, packageRoot) : absoluteTmpRoot;
  const absoluteInstallerBin = installerBin
    ? resolveInstallerBinPath(installerBin, absolutePackageRoot, root)
    : null;
  if (requireInstaller && !absoluteInstallerBin) {
    throw new Error('--installer-bin is required unless --dry-run is used');
  }

  const runtimeConfigPath = path.join(absoluteTmpRoot, 'clawrouter.toml');
  const databaseEngine = packageItem.databasePolicy.defaultEngine;
  const deploymentMode = packageItem.runtimeProfile === 'desktop' ? 'desktop' : 'server';
  const databasePath = databaseEngine === 'sqlite'
    ? path.join(absoluteTmpRoot, 'clawrouter-install-init.sqlite')
    : null;
  const databasePasswordPath = databaseEngine === 'postgresql'
    ? path.join(absoluteTmpRoot, 'database.secret')
    : null;
  const databaseUrl = databaseEngine === 'sqlite'
    ? `sqlite://${toPosixPath(databasePath)}`
    : DEFAULT_RELEASE_POSTGRES_RUNTIME_URL;
  const releaseEnvPath = path.join(absoluteTmpRoot, '.env.release');
  const modelsCatalogRoot = path.join(root, 'data', 'sdkwork-models');
  const env = createSmokeEnvironment({
    databaseUrl,
    databaseEngine,
    deploymentMode,
    releaseEnvPath,
    runtimeConfigPath,
    modelsCatalogRoot,
  });
  const installerCommand = absoluteInstallerBin ?? packageItem.installerBinaryName;
  const [databaseEnsureCommand, catalogRefreshCommand] = packageItem.initCommands;
  const releaseEnvCommand = [
    process.execPath,
    path.join(root, 'scripts', 'write-release-env.mjs'),
    '--output',
    releaseEnvPath,
    '--force',
  ];

  return {
    schemaVersion: '2026-05-15.install-init-smoke.v1',
    mode: absoluteInstallerBin ? 'real-installer' : 'contract-dry-run',
    package: packageItem,
    packageRoot: absolutePackageRoot,
    packageRootProvided: Boolean(packageRoot),
    tmpRoot: absoluteTmpRoot,
    releaseEnvPath,
    runtimeConfigPath,
    databaseEngine,
    deploymentMode,
    databasePath,
    databasePasswordPath,
    databaseUrl,
    modelsCatalogRoot,
    installerBin: absoluteInstallerBin,
    env,
    healthChecks: packageItem.healthChecks,
    steps: [
      {
        id: 'release-env-write',
        command: releaseEnvCommand.join(' '),
        executable: releaseEnvCommand[0],
        args: releaseEnvCommand.slice(1),
        env,
        writes: [releaseEnvPath],
      },
      {
        id: 'database-ensure',
        command: databaseEnsureCommand,
        executable: installerCommand,
        args: ['ensure'],
        env,
        writes: databasePath ? [databasePath] : [],
      },
      {
        id: 'catalog-refresh',
        command: catalogRefreshCommand,
        executable: installerCommand,
        args: ['refresh-catalog', '--force'],
        env,
        writes: databasePath ? [databasePath] : [],
      },
      {
        id: 'readiness-contract',
        command: packageItem.healthChecks.join(' '),
        executable: null,
        args: packageItem.healthChecks,
        env: {},
        writes: [],
      },
    ],
  };
}

function createSmokeEnvironment({ databaseUrl, databaseEngine, deploymentMode, releaseEnvPath, runtimeConfigPath, modelsCatalogRoot }) {
  const env = {
    SDKWORK_MODELS_CATALOG_ROOT: modelsCatalogRoot,
    SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL: DEFAULT_RELEASE_POSTGRES_URL,
    PORTAL_PUBLIC_SDK_BASE_URL: '/',
    PORTAL_PUBLIC_API_BASE_URL: '/v1',
    PORTAL_PUBLIC_APP_API_BASE_URL: '/app/v3/api',
    PORTAL_PUBLIC_BACKEND_API_BASE_URL: '/backend/v3/api',
    PORTAL_PUBLIC_TOOL_API_ENABLED: 'false',
    SDKWORK_CLAW_RELEASE_ENV_FILE: releaseEnvPath,
    SDKWORK_CLAW_CONFIG_FILE: runtimeConfigPath,
    SDKWORK_CLAW_DEPLOYMENT_MODE: deploymentMode,
  };
  if (databaseEngine === 'sqlite') {
    env.SDKWORK_CLAW_DATABASE_URL = databaseUrl;
    env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS = '1';
  }
  return env;
}

function validateInstallInitSmokePlan(plan) {
  const issues = [];
  if (plan.schemaVersion !== '2026-05-15.install-init-smoke.v1') {
    issues.push('schemaVersion must be 2026-05-15.install-init-smoke.v1');
  }
  if (!plan.package?.id) {
    issues.push('package id is required');
  }
  if (!plan.tmpRoot || !path.isAbsolute(plan.tmpRoot)) {
    issues.push('tmpRoot must be an absolute path');
  }
  if (!plan.releaseEnvPath || !path.isAbsolute(plan.releaseEnvPath)) {
    issues.push('releaseEnvPath must be an absolute path');
  }
  if (plan.databaseEngine === 'sqlite' && !plan.databaseUrl?.startsWith('sqlite://')) {
    issues.push('SQLite install init smoke must use sqlite://');
  }
  if (plan.databaseEngine === 'postgresql' && !plan.databaseUrl?.startsWith('postgresql://')) {
    issues.push('server install init smoke must use postgresql://');
  }
  if (plan.databaseEngine === 'postgresql' && plan.databasePath !== null) {
    issues.push('server install init smoke must not declare a SQLite database path');
  }
  if (plan.databaseEngine === 'postgresql' && !plan.databasePasswordPath) {
    issues.push('server install init smoke must declare a PostgreSQL password file path');
  }
  if (String(plan.databaseUrl).includes(':memory:')) {
    issues.push('databaseUrl must use a real temporary file, not sqlite::memory:');
  }
  if (plan.releaseEnvPath.endsWith('.env.release.example')) {
    issues.push('release env output must not target the checked-in example template');
  }
  if (plan.packageRootProvided && !existsSync(plan.packageRoot)) {
    issues.push('packageRoot must exist when provided');
  }
  if (!Array.isArray(plan.healthChecks) || !plan.healthChecks.includes('/healthz') || !plan.healthChecks.includes('/readyz')) {
    issues.push('healthChecks must include /healthz and /readyz');
  }
  if (plan.steps?.some((step) => /pnpm(\.cmd)?\s+dev|smoke:dev/u.test(step.command))) {
    issues.push('install init smoke must not start the development workspace or edge dev smoke');
  }
  for (const stepId of ['release-env-write', 'database-ensure', 'catalog-refresh', 'readiness-contract']) {
    if (!plan.steps?.some((step) => step.id === stepId)) {
      issues.push(`steps must include ${stepId}`);
    }
  }
  if (!plan.runtimeConfigPath || !path.isAbsolute(plan.runtimeConfigPath)) {
    issues.push('runtimeConfigPath must be an absolute path');
  }
  if (!plan.env?.SDKWORK_CLAW_CONFIG_FILE || !plan.env?.SDKWORK_MODELS_CATALOG_ROOT) {
    issues.push('installer environment must include config file and model catalog roots');
  }
  if (plan.databaseEngine === 'sqlite' && !plan.env?.SDKWORK_CLAW_DATABASE_URL) {
    issues.push('installer environment must include SDKWORK_CLAW_DATABASE_URL for SQLite smoke');
  }
  if (plan.mode === 'real-installer' && !plan.installerBin) {
    issues.push('real-installer mode requires installerBin');
  }
  return issues;
}

async function runInstallInitSmoke(plan, { dryRun = false } = {}) {
  const issues = validateInstallInitSmokePlan(plan);
  if (issues.length > 0) {
    throw new Error(`install init smoke plan is invalid: ${issues.join('; ')}`);
  }

  await mkdir(plan.tmpRoot, { recursive: true });
  if (!plan.packageRootProvided) {
    await mkdir(plan.packageRoot, { recursive: true });
  }
  if (plan.databasePasswordPath) {
    await writeFile(plan.databasePasswordPath, 'release-smoke-password\n', 'utf8');
  }
  await writeReleaseEnvForSmoke(plan);
  await writeRuntimeConfigForSmoke(plan);
  const releaseEnvContent = await readFile(plan.releaseEnvPath, 'utf8');
  const releaseEnv = inspectReleaseEnvContent(releaseEnvContent, plan);

  const installerReports = [];
  if (!dryRun) {
    if (!plan.installerBin) {
      throw new Error('--installer-bin is required when install init smoke is not running in dry-run mode');
    }
    if (!existsSync(plan.installerBin)) {
      throw new Error(`installer binary does not exist: ${plan.installerBin}`);
    }
    installerReports.push(await runInstallerStep(plan, 'database-ensure'));
    installerReports.push(await runInstallerStep(plan, 'catalog-refresh'));
  }

  return {
    ok: true,
    mode: plan.mode,
    packageId: plan.package.id,
    executedInstaller: installerReports.length > 0,
    releaseEnv,
    database: {
      engine: plan.databaseEngine,
      url: plan.databaseUrl,
      path: plan.databasePath,
      passwordPath: plan.databasePasswordPath,
      exists: plan.databasePath ? existsSync(plan.databasePath) : false,
      passwordFileExists: plan.databasePasswordPath ? existsSync(plan.databasePasswordPath) : false,
    },
    runtimeConfig: {
      path: plan.runtimeConfigPath,
      written: existsSync(plan.runtimeConfigPath),
    },
    installerReports,
    healthChecks: plan.healthChecks,
  };
}

async function writeReleaseEnvForSmoke(plan) {
  const envPlan = buildReleaseEnvFilePlan({
    env: plan.env,
    outputPath: plan.releaseEnvPath,
    overwrite: true,
    existingFile: existsSync(plan.releaseEnvPath),
  });
  const content = [
    envPlan.content.trimEnd(),
    `SDKWORK_CLAW_CONFIG_FILE=${quoteDotenvValue(plan.env.SDKWORK_CLAW_CONFIG_FILE)}`,
    `SDKWORK_CLAW_DEPLOYMENT_MODE=${quoteDotenvValue(plan.env.SDKWORK_CLAW_DEPLOYMENT_MODE)}`,
    `SDKWORK_MODELS_CATALOG_ROOT=${quoteDotenvValue(plan.env.SDKWORK_MODELS_CATALOG_ROOT)}`,
    '',
  ].join('\n');
  await mkdir(path.dirname(plan.releaseEnvPath), { recursive: true });
  await writeFile(plan.releaseEnvPath, content, 'utf8');
}

async function writeRuntimeConfigForSmoke(plan) {
  const databaseLines = plan.databaseEngine === 'postgresql'
    ? [
      '[database]',
      'engine = "postgresql"',
      'host = "release-smoke.invalid"',
      'port = 5432',
      'database = "sdkwork_claw_router"',
      'username = "release_smoke"',
      `password_file = "${toPosixPath(plan.databasePasswordPath)}"`,
      'ssl_mode = "require"',
      'max_connections = 16',
    ]
    : [
      '[database]',
      `engine = "${plan.databaseEngine}"`,
      `url = "${plan.databaseUrl}"`,
      'max_connections = 1',
    ];
  const content = [
    '# Generated by install init smoke. Do not commit this file.',
    ...databaseLines,
    '',
    '[paths]',
    `data_directory = "${toPosixPath(plan.tmpRoot)}"`,
    '',
    '[runtime]',
    `deployment_mode = "${plan.deploymentMode}"`,
    '',
  ].join('\n');
  await mkdir(path.dirname(plan.runtimeConfigPath), { recursive: true });
  await writeFile(plan.runtimeConfigPath, content, 'utf8');
}

function inspectReleaseEnvContent(content, plan) {
  return {
    path: plan.releaseEnvPath,
    written: true,
    containsLocalDatabaseUrl: Boolean(plan.env.SDKWORK_CLAW_DATABASE_URL)
      && content.includes(`SDKWORK_CLAW_DATABASE_URL="${plan.env.SDKWORK_CLAW_DATABASE_URL}"`),
    containsConfigFile: /^SDKWORK_CLAW_CONFIG_FILE=/mu.test(content),
    containsHostSecret: /SDKWORK_SECRET|SECRET_KEY|PRIVATE_KEY|(?<!ACCESS_)TOKEN=/u.test(content),
    containsExamplePath: content.includes('.env.release.example'),
    variableCount: content
      .split(/\r?\n/u)
      .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/u.test(line))
      .length,
  };
}

async function runInstallerStep(plan, stepId) {
  const step = plan.steps.find((item) => item.id === stepId);
  if (!step) {
    throw new Error(`missing installer step: ${stepId}`);
  }
  const result = await execFileBuffered(step.executable, step.args, {
    cwd: plan.packageRoot,
    env: {
      ...process.env,
      ...step.env,
    },
  });
  const parsed = parseJsonLine(result.stdout);
  return {
    id: step.id,
    command: step.command,
    status: result.status,
    stdout: parsed ?? result.stdout.trim(),
  };
}

function execFileBuffered(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      shell: false,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (status) => {
      if (status !== 0) {
        reject(new Error(`${command} ${args.join(' ')} exited with ${status}: ${stderr || stdout}`));
        return;
      }
      resolve({ status, stdout, stderr });
    });
  });
}

function parseJsonLine(stdout) {
  const line = String(stdout ?? '').split(/\r?\n/u).find((item) => item.trim().startsWith('{'));
  if (!line) {
    return null;
  }
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function renderInstallInitSmokePlan(plan) {
  return [
    `[install-init-smoke] package: ${plan.package.id}`,
    `[install-init-smoke] mode: ${plan.mode}`,
    `[install-init-smoke] tmpRoot: ${plan.tmpRoot}`,
    `[install-init-smoke] database: ${plan.databaseEngine} ${plan.databaseUrl}`,
    `[install-init-smoke] runtimeConfig: ${plan.runtimeConfigPath}`,
    `[install-init-smoke] releaseEnv: ${plan.releaseEnvPath}`,
    `[install-init-smoke] health: ${plan.healthChecks.join(', ')}`,
    ...plan.steps.map((step) => `[install-init-smoke]   ${step.id}: ${step.command}`),
  ];
}

function resolveInstallerBinPath(installerBin, packageRoot, root) {
  if (path.isAbsolute(installerBin)) {
    return path.resolve(installerBin);
  }
  const packageRelativePath = path.resolve(packageRoot, installerBin);
  if (existsSync(packageRelativePath)) {
    return packageRelativePath;
  }
  return path.resolve(root, installerBin);
}

async function main(argv = process.argv.slice(2)) {
  const settings = parseInstallInitSmokeArgs(argv);
  if (settings.help) {
    printHelp();
    return 0;
  }

  const plan = createInstallInitSmokePlan({
    packageId: settings.packageId,
    packageRoot: settings.packageRoot,
    tmpRoot: settings.tmpRoot,
    installerBin: settings.installerBin,
    version: settings.version,
    root: workspaceRoot,
    requireInstaller: !settings.dryRun,
  });
  const issues = validateInstallInitSmokePlan(plan);

  if (settings.json && settings.check && issues.length > 0) {
    console.log(JSON.stringify({ ok: false, issues, plan }, null, 2));
  } else if (!settings.json) {
    for (const line of renderInstallInitSmokePlan(plan)) {
      console.log(line);
    }
    if (issues.length > 0) {
      console.error('[install-init-smoke] validation issues:');
      for (const issue of issues) {
        console.error(`[install-init-smoke]   ${issue}`);
      }
    }
  }

  if (settings.check && issues.length > 0) {
    return 1;
  }

  const result = await runInstallInitSmoke(plan, { dryRun: settings.dryRun });
  if (settings.json) {
    console.log(JSON.stringify({
      ok: true,
      issues,
      plan,
      result,
    }, null, 2));
  } else {
    console.log(`[install-init-smoke] release env written: ${result.releaseEnv.path}`);
    console.log(`[install-init-smoke] installer executed: ${result.executedInstaller}`);
  }

  if (!settings.keepTmp && !settings.tmpRoot && settings.dryRun) {
    await rm(plan.tmpRoot, { recursive: true, force: true });
  }
  return 0;
}

function quoteDotenvValue(value) {
  return `"${String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replaceAll('\r', '\\r')
    .replaceAll('\n', '\\n')}"`;
}

function toPosixPath(value) {
  return path.resolve(value).replaceAll('\\', '/');
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    console.error(`[install-init-smoke] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

export {
  createInstallInitSmokePlan,
  createSmokeEnvironment,
  inspectReleaseEnvContent,
  main,
  parseInstallInitSmokeArgs,
  renderInstallInitSmokePlan,
  runInstallInitSmoke,
  validateInstallInitSmokePlan,
};
