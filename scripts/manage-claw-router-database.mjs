#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { IAM_APPLICATION_BOOTSTRAP_ENV } from './lib/claw-router-topology.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

const INSTALLER_COMMANDS = new Set([
  'status',
  'install',
  'upgrade',
  'ensure',
  'refresh-catalog',
]);
const WRAPPER_OPTIONS = new Set([
  '--help',
  '-h',
  '--dry-run',
  '--deployment-mode',
  '--config-file',
  '--database-url',
  '--database-max-connections',
  '--environment',
  '--seed-profile',
  '--models-catalog-root',
]);

function cargoCommand(platform = process.platform) {
  return platform === 'win32' ? 'cargo.exe' : 'cargo';
}

function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function resolveMaybeRelativePath(value, root) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return null;
  }
  return path.isAbsolute(normalized) ? normalized : path.resolve(root, normalized);
}

function normalizeCommand(value) {
  const command = String(value ?? '').trim().toLowerCase();
  if (!command) {
    return 'ensure';
  }
  if (command === 'init') {
    return 'init';
  }
  if (INSTALLER_COMMANDS.has(command)) {
    return command;
  }
  throw new Error(
    `Unsupported database command: ${value}. Use status, init, install, upgrade, ensure, or refresh-catalog.`,
  );
}

function normalizeDeploymentMode(value, flag = '--deployment-mode') {
  const mode = String(value ?? '').trim().toLowerCase();
  if (mode !== 'server' && mode !== 'desktop') {
    throw new Error(`${flag} must be server or desktop`);
  }
  return mode;
}

function normalizePositiveInteger(value, flag) {
  const normalized = String(value ?? '').trim();
  if (!/^[1-9]\d*$/u.test(normalized)) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return normalized;
}

function normalizeDatabaseUrl(value, flag = '--database-url') {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new Error(`${flag} must not be blank`);
  }
  if (
    normalized.startsWith('sqlite:')
    || normalized.startsWith('postgres://')
    || normalized.startsWith('postgresql://')
  ) {
    return normalized;
  }
  throw new Error(`${flag} must be a PostgreSQL or SQLite connection string`);
}

function normalizeInstallerToken(value, flag, maxLength = 64) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new Error(`${flag} must not be blank`);
  }
  if (normalized.length > maxLength) {
    throw new Error(`${flag} must be ${maxLength} characters or fewer`);
  }
  if (!/^[A-Za-z0-9_-]+$/u.test(normalized)) {
    throw new Error(`${flag} must contain only letters, numbers, -, and _`);
  }
  return normalized;
}

export function parseDatabaseManagementArgs(argv = []) {
  const settings = {
    help: false,
    dryRun: false,
    command: 'ensure',
    deploymentMode: null,
    configFile: null,
    databaseUrl: null,
    databaseMaxConnections: null,
    environment: null,
    seedProfile: null,
    modelsCatalogRoot: null,
    installerArgs: [],
  };

  let commandSet = false;
  let forwardOnly = false;
  let wrapperSeparatorConsumed = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (forwardOnly) {
      settings.installerArgs.push(arg);
      continue;
    }
    if (arg === '--') {
      const next = argv[index + 1];
      if (!commandSet && next && !next.startsWith('-')) {
        wrapperSeparatorConsumed = true;
        continue;
      }
      if (!wrapperSeparatorConsumed && (!next || WRAPPER_OPTIONS.has(next))) {
        wrapperSeparatorConsumed = true;
        continue;
      }
      forwardOnly = true;
      continue;
    }
    if ((arg === '--help' || arg === '-h') && !commandSet) {
      settings.help = true;
      continue;
    }
    if (!commandSet && !arg.startsWith('-')) {
      settings.command = normalizeCommand(arg);
      commandSet = true;
      continue;
    }
    switch (arg) {
      case '--help':
      case '-h':
        settings.help = true;
        break;
      case '--dry-run':
        settings.dryRun = true;
        break;
      case '--deployment-mode':
        settings.deploymentMode = normalizeDeploymentMode(requireValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--config-file':
        settings.configFile = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--database-url':
        settings.databaseUrl = normalizeDatabaseUrl(requireValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--database-max-connections':
        settings.databaseMaxConnections = normalizePositiveInteger(
          requireValue(argv, index, arg),
          arg,
        );
        index += 1;
        break;
      case '--environment':
        settings.environment = normalizeInstallerToken(requireValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--seed-profile':
        settings.seedProfile = normalizeInstallerToken(requireValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--models-catalog-root':
        settings.modelsCatalogRoot = requireValue(argv, index, arg).trim();
        if (!settings.modelsCatalogRoot) {
          throw new Error('--models-catalog-root must not be blank');
        }
        index += 1;
        break;
      default:
        settings.installerArgs.push(arg);
        break;
    }
  }

  return settings;
}

function installerCommandFor(command) {
  return command === 'init' ? 'install' : command;
}

function stepNameFor(command) {
  return `database-${command}`;
}

function installerArgsFor(settings) {
  return [
    'run',
    '-p',
    'sdkwork-claw-installer',
    '--',
    installerCommandFor(settings.command),
    ...settings.installerArgs,
  ];
}

export function createDatabaseManagementPlan({
  settings = parseDatabaseManagementArgs([]),
  workspaceRoot: root = workspaceRoot,
  platform = process.platform,
  env = process.env,
} = {}) {
  const configFile = resolveMaybeRelativePath(settings.configFile, root);
  const stepEnv = {
    ...env,
    ...IAM_APPLICATION_BOOTSTRAP_ENV,
    SDKWORK_CLAW_DEPLOYMENT_MODE:
      settings.deploymentMode ?? env.SDKWORK_CLAW_DEPLOYMENT_MODE ?? 'server',
    ...(configFile ? { SDKWORK_CLAW_CONFIG_FILE: configFile } : {}),
    ...(settings.databaseUrl ? { SDKWORK_DATABASE_URL: settings.databaseUrl } : {}),
    ...(settings.databaseMaxConnections
      ? { SDKWORK_DATABASE_MAX_CONNECTIONS: settings.databaseMaxConnections }
      : {}),
    ...(settings.environment
      ? { SDKWORK_CLAW_INSTALL_ENVIRONMENT: settings.environment }
      : {}),
    ...(settings.seedProfile
      ? { SDKWORK_CLAW_INSTALL_SEED_PROFILE: settings.seedProfile }
      : {}),
    ...(settings.modelsCatalogRoot
      ? { SDKWORK_MODELS_CATALOG_ROOT: settings.modelsCatalogRoot }
      : {}),
  };

  return {
    command: settings.command,
    installerCommand: installerCommandFor(settings.command),
    dryRun: settings.dryRun,
    steps: [
      {
        name: stepNameFor(settings.command),
        command: cargoCommand(platform),
        args: installerArgsFor(settings),
        cwd: root,
        env: stepEnv,
        shell: false,
        windowsHide: platform === 'win32',
      },
    ],
  };
}

function redactedEnvSummary(env) {
  const keys = [
    'SDKWORK_CLAW_CONFIG_FILE',
    'SDKWORK_CLAW_DEPLOYMENT_MODE',
    'SDKWORK_DATABASE_URL',
    'SDKWORK_DATABASE_MAX_CONNECTIONS',
    'SDKWORK_CLAW_INSTALL_ENVIRONMENT',
    'SDKWORK_CLAW_INSTALL_SEED_PROFILE',
    'SDKWORK_MODELS_CATALOG_ROOT',
  ];
  return keys
    .filter((key) => env[key])
    .map((key) => `${key}=${key === 'SDKWORK_DATABASE_URL' ? redactDatabaseUrl(env[key]) : env[key]}`);
}

function redactDatabaseUrl(value) {
  const text = String(value ?? '');
  try {
    const parsed = new URL(text);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return text.replace(/:\/\/([^:@/]+):([^@/]+)@/u, '://$1:***@');
  }
}

function formatCommand(step) {
  return `${step.command} ${step.args.join(' ')}`;
}

async function runStep(step) {
  await new Promise((resolve, reject) => {
    const child = spawn(step.command, step.args, {
      cwd: step.cwd,
      env: step.env,
      stdio: 'inherit',
      shell: step.shell ?? false,
      windowsHide: step.windowsHide ?? process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${step.name} exited with signal ${signal}`));
        return;
      }
      if ((code ?? 1) !== 0) {
        reject(new Error(`${step.name} exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

function printHelp() {
  console.log(`Usage: pnpm db <command> [options] [-- <installer-options>]

Manage the Claw Router database through the Rust installer.

Commands:
  status                  Print installation and catalog status.
  init                    Initialize a new database. Alias for installer install.
  install                 Run installer install directly.
  upgrade                 Upgrade or repair an existing database.
  ensure                  Install or upgrade as needed. Default command.
  refresh-catalog         Refresh sdkwork-models catalog seed data.

Options:
  --config-file <path>            Runtime TOML file with [database].
  --deployment-mode <mode>        server or desktop. Default server.
  --database-url <url>            SQLite/PostgreSQL override.
  --database-max-connections <n>  Database pool size override.
  --environment <name>            Installation environment.
  --seed-profile <name>           Installation seed profile.
  --models-catalog-root <path>    sdkwork-models catalog root override.
  --dry-run                      Print the command and resolved environment.
  -h, --help                     Show this help.

Runtime TOML example:
  [database]
  engine = "postgresql"
  host = "db.internal"
  port = 5432
  database = "sdkwork_ai_prod"
  username = "sdkwork_ai_prod"
  password_file = "./database.secret"
  max_connections = 16

Examples:
  pnpm db:status -- --config-file ./etc/clawrouter.toml
  pnpm db:init -- --config-file ./etc/clawrouter.toml
  pnpm db:upgrade -- --config-file ./etc/clawrouter.toml
  pnpm db:refresh-catalog -- --config-file ./etc/clawrouter.toml -- --vendor openai --force
`);
}

async function main(argv = process.argv.slice(2)) {
  const settings = parseDatabaseManagementArgs(argv);
  if (settings.help) {
    printHelp();
    return;
  }
  const plan = createDatabaseManagementPlan({ settings });
  for (const step of plan.steps) {
    console.error(`[database] ${formatCommand(step)}`);
    for (const line of redactedEnvSummary(step.env)) {
      console.error(`[database]   ${line}`);
    }
    if (settings.dryRun) {
      continue;
    }
    await runStep(step);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(`[database] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
