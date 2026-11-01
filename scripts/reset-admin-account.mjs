#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  mergeRuntimeConfigEnv,
  parseStartProductionArgs,
  prepareStartProductionRuntimeConfig,
} from './start-cloud-router-production.mjs';
import {
  loadCloudRouterDevEnvFile,
  resolveCloudRouterDevDatabaseEnv,
  resolveDefaultDevEnvFilePath,
} from './dev/cloud-router-dev-database-env.mjs';
import {
  normalizeCloudRouterLifecycleEnvironment,
  resolveCloudRouterBootstrapAdminEnvOverrides,
  resolveCloudRouterEnvironmentAdminAccount,
} from './lib/cloud-router-environment-admin.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

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

export function parseResetAdminArgs(argv = []) {
  const settings = {
    help: false,
    dryRun: false,
    mode: 'dev',
    environment: 'development',
    username: null,
    displayName: null,
    email: null,
    password: null,
    configFile: null,
    devEnvFile: null,
    databaseUrl: null,
    databaseMaxConnections: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--':
        break;
      case '--help':
      case '-h':
        settings.help = true;
        break;
      case '--dry-run':
        settings.dryRun = true;
        break;
      case '--mode':
        settings.mode = normalizeMode(requireValue(argv, index, arg));
        index += 1;
        break;
      case '--environment':
        settings.environment = normalizeCloudRouterLifecycleEnvironment(requireValue(argv, index, arg));
        index += 1;
        break;
      case '--username':
        settings.username = requireValue(argv, index, arg).trim();
        index += 1;
        break;
      case '--display-name':
        settings.displayName = requireValue(argv, index, arg).trim();
        index += 1;
        break;
      case '--email':
        settings.email = requireValue(argv, index, arg).trim();
        index += 1;
        break;
      case '--password':
        settings.password = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--config-file':
        settings.configFile = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--dev-env-file':
        settings.devEnvFile = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--database-url':
        settings.databaseUrl = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--database-max-connections':
        settings.databaseMaxConnections = requireValue(argv, index, arg);
        index += 1;
        break;
      default:
        throw new Error(`Unsupported admin reset option: ${arg}`);
    }
  }

  const identity = resolveAdminIdentity(settings);
  settings.username = identity.username;
  settings.displayName = identity.displayName;
  settings.email = identity.email;
  validateText(settings.username, '--username');
  validateText(settings.displayName, '--display-name');
  validateText(settings.email, '--email');
  return settings;
}

function resolveAdminIdentity(settings) {
  const account = resolveCloudRouterEnvironmentAdminAccount(settings.environment);
  return {
    username: settings.username ?? account.username,
    displayName: settings.displayName ?? account.displayName,
    email: settings.email ?? account.email,
  };
}

function normalizeMode(value) {
  const mode = String(value ?? '').trim().toLowerCase();
  if (mode !== 'dev' && mode !== 'release') {
    throw new Error('--mode must be dev or release');
  }
  return mode;
}

function validateText(value, flag) {
  if (!String(value ?? '').trim()) {
    throw new Error(`${flag} must not be blank`);
  }
}

function resetPassword(settings, env) {
  const password = String(
    settings.password ?? env.SDKWORK_CLOUDROUTER_ADMIN_RESET_PASSWORD ?? '',
  );
  if (!password.trim()) {
    throw new Error(
      'admin reset password is required. Pass --password or set SDKWORK_CLOUDROUTER_ADMIN_RESET_PASSWORD.',
    );
  }
  return password;
}

function installerArgs(settings, identity) {
  return [
    'run',
    '-p',
    'sdkwork-cloudrouter-installer',
    '--',
    'reset-admin',
    '--username',
    identity.username,
    '--display-name',
    identity.displayName,
    '--email',
    identity.email,
  ];
}

function devResetEnv(settings, env, root) {
  // Match `pnpm dev` behavior: when no explicit dev-env-file is provided, auto-detect
  // `config/host/postgres.env` (or `config/host/postgres.env.example`) from the workspace root. This keeps
  // reset-admin pointed at the same database the dev server bootstrapped IAM into.
  const devEnvFile = settings.devEnvFile ?? resolveDefaultDevEnvFilePath(root);
  const devEnv = {
    ...env,
    ...loadCloudRouterDevEnvFile(devEnvFile, { workspaceRoot: root }),
  };
  const resolvedDatabase = resolveCloudRouterDevDatabaseEnv({
    env: {
      ...devEnv,
      ...(settings.databaseUrl ? { SDKWORK_DATABASE_URL: settings.databaseUrl } : {}),
      ...(settings.databaseMaxConnections
        ? { SDKWORK_DATABASE_MAX_CONNECTIONS: settings.databaseMaxConnections }
        : {}),
    },
    defaultDatabase: 'postgresql',
  });
  if (resolvedDatabase.kind !== 'postgresql') {
    throw new Error('admin reset requires PostgreSQL because server data is authoritative');
  }
  const databaseUrl = resolvedDatabase.databaseUrl;
  const databaseMaxConnections = settings.databaseMaxConnections
    ?? resolvedDatabase.env.SDKWORK_DATABASE_MAX_CONNECTIONS
    ?? devEnv.SDKWORK_DATABASE_MAX_CONNECTIONS;
  return {
    ...devEnv,
    ...resolvedDatabase.env,
    SDKWORK_DATABASE_URL: databaseUrl,
    SDKWORK_CLOUDROUTER_DEPLOYMENT_MODE: env.SDKWORK_CLOUDROUTER_DEPLOYMENT_MODE ?? 'server',
    SDKWORK_CLOUDROUTER_INSTALL_SEED_PROFILE: env.SDKWORK_CLOUDROUTER_INSTALL_SEED_PROFILE ?? 'commercial',
    ...(databaseMaxConnections ? { SDKWORK_DATABASE_MAX_CONNECTIONS: databaseMaxConnections } : {}),
  };
}

function releaseRuntimeConfigSettings(settings) {
  const args = ['--deployment-mode', 'server'];
  if (settings.configFile) {
    args.push('--config-file', settings.configFile);
  }
  if (settings.databaseUrl) {
    args.push('--database-url', settings.databaseUrl);
  }
  if (settings.databaseMaxConnections) {
    args.push('--database-max-connections', settings.databaseMaxConnections);
  }
  return parseStartProductionArgs(args);
}

export function createResetAdminPlan({
  settings = parseResetAdminArgs([]),
  workspaceRoot: root = workspaceRoot,
  platform = process.platform,
  env = process.env,
  writeRuntimeConfig = true,
} = {}) {
  const password = resetPassword(settings, env);
  const identity = resolveAdminIdentity(settings);
  const environmentOverrides = resolveCloudRouterBootstrapAdminEnvOverrides(settings.environment);
  let stepEnv;
  let runtimeConfig = null;

  if (settings.mode === 'release') {
    runtimeConfig = prepareStartProductionRuntimeConfig({
      baseEnv: env,
      settings: releaseRuntimeConfigSettings(settings),
      platform,
      write: writeRuntimeConfig,
    });
    if (runtimeConfig.blockingIssue) {
      throw new Error(runtimeConfig.blockingIssue.message);
    }
    stepEnv = {
      ...mergeRuntimeConfigEnv(env, runtimeConfig),
      ...environmentOverrides,
      SDKWORK_CLOUDROUTER_INSTALL_SEED_PROFILE: env.SDKWORK_CLOUDROUTER_INSTALL_SEED_PROFILE ?? 'commercial',
    };
  } else {
    stepEnv = {
      ...devResetEnv(settings, env, root),
      ...environmentOverrides,
    };
  }

  stepEnv = {
    ...stepEnv,
    SDKWORK_CLOUDROUTER_ADMIN_RESET_PASSWORD: password,
  };

  return {
    mode: settings.mode,
    environment: settings.environment,
    identity,
    runtimeConfig,
    steps: [
      {
        name: 'reset-admin',
        command: cargoCommand(platform),
        args: installerArgs(settings, identity),
        cwd: root,
        env: stepEnv,
        shell: false,
        windowsHide: platform === 'win32',
      },
    ],
  };
}

function printHelp() {
  console.log(`Usage: node scripts/reset-admin-account.mjs --mode <dev|release> --password <password> [options]

Reset the Cloud Router admin account password through the installer database layer.

Each lifecycle environment uses an independent bootstrap admin identity:
  development -> admin-dev@sdkwork.com
  test        -> admin-test@sdkwork.com
  staging     -> admin-staging@sdkwork.com
  production  -> admin@sdkwork.com

Options:
  --mode <dev|release>          dev uses config/host/postgres.env; release uses PostgreSQL runtime config
  --environment <lifecycle>     development, test, staging, or production (default development)
  --username <username>         Admin username override
  --display-name <name>         Admin display name override
  --email <email>               Admin email identity override
  --password <password>         New admin password; may also be set with SDKWORK_CLOUDROUTER_ADMIN_RESET_PASSWORD
  --config-file <path>          Release runtime TOML path
  --dev-env-file <path>         Dev PostgreSQL dotenv file such as config/host/postgres.env
  --database-url <url>          PostgreSQL database override
  --database-max-connections <n>
  --dry-run                     Print the command without executing it
  -h, --help                    Show this help

Examples:
  pnpm admin:reset:dev -- --password "Admin-Dev-Password-2026!"
  pnpm admin:reset:staging -- --password "Admin-Staging-Password-2026!"
  pnpm admin:reset:release -- --password "Admin-Release-Password-2026!"
  SDKWORK_CLOUDROUTER_ADMIN_RESET_PASSWORD="Admin-Release-Password-2026!" pnpm admin:reset:release
`);
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

async function main(argv = process.argv.slice(2)) {
  const settings = parseResetAdminArgs(argv);
  if (settings.help) {
    printHelp();
    return;
  }
  const plan = createResetAdminPlan({
    settings,
    writeRuntimeConfig: !settings.dryRun,
  });
  for (const step of plan.steps) {
    console.error(`[reset-admin] ${formatCommand(step)}`);
    if (settings.dryRun) {
      continue;
    }
    await runStep(step);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(`[reset-admin] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
