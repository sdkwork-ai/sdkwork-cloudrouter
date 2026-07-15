#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  mergeRuntimeConfigEnv,
  parseStartProductionArgs,
  prepareStartProductionRuntimeConfig,
} from './start-claw-router-production.mjs';
import {
  loadClawRouterDevEnvFile,
  resolveClawRouterDevDatabaseEnv,
  resolveDefaultDevEnvFilePath,
} from './dev/claw-router-dev-database-env.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');
const DEFAULT_DEV_DATABASE_RELATIVE_PATH = path.join('target', 'dev', 'clawrouter.sqlite');
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_DISPLAY_NAME = 'Administrator';
const DEFAULT_ADMIN_EMAIL = 'admin@sdkwork.com';

function cargoCommand(platform = process.platform) {
  return platform === 'win32' ? 'cargo.exe' : 'cargo';
}

function toPortablePath(value) {
  return String(value ?? '').replaceAll('\\', '/');
}

function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function devDatabaseUrl(root = workspaceRoot) {
  return `sqlite://${toPortablePath(DEFAULT_DEV_DATABASE_RELATIVE_PATH)}`;
}

export function parseResetAdminArgs(argv = []) {
  const settings = {
    help: false,
    dryRun: false,
    mode: 'dev',
    username: DEFAULT_ADMIN_USERNAME,
    displayName: DEFAULT_ADMIN_DISPLAY_NAME,
    email: DEFAULT_ADMIN_EMAIL,
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

  validateText(settings.username, '--username');
  validateText(settings.displayName, '--display-name');
  validateText(settings.email, '--email');
  return settings;
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
    settings.password ?? env.SDKWORK_CLAW_ADMIN_RESET_PASSWORD ?? '',
  );
  if (!password.trim()) {
    throw new Error(
      'admin reset password is required. Pass --password or set SDKWORK_CLAW_ADMIN_RESET_PASSWORD.',
    );
  }
  return password;
}

function installerArgs(settings) {
  return [
    'run',
    '-p',
    'sdkwork-claw-installer',
    '--',
    'reset-admin',
    '--username',
    settings.username,
    '--display-name',
    settings.displayName,
    '--email',
    settings.email,
  ];
}

function devResetEnv(settings, env, root, { write = true } = {}) {
  // Match `pnpm dev` behavior: when no explicit dev-env-file is provided, auto-detect
  // `.env.postgres` (or `.env.postgres.example`) from the workspace root. This keeps
  // reset-admin pointed at the same database the dev server bootstrapped IAM into.
  // `--database-url sqlite://...` (used by admin:reset:dev:sqlite) still overrides the URL.
  const devEnvFile = settings.devEnvFile ?? resolveDefaultDevEnvFilePath(root);
  const devEnv = {
    ...env,
    ...loadClawRouterDevEnvFile(devEnvFile, { workspaceRoot: root }),
  };
  const resolvedDatabase = resolveClawRouterDevDatabaseEnv({
    env: {
      ...devEnv,
      ...(settings.databaseUrl ? { SDKWORK_CLAW_DATABASE_URL: settings.databaseUrl } : {}),
      ...(settings.databaseMaxConnections
        ? { SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS: settings.databaseMaxConnections }
        : {}),
    },
    defaultDatabase: 'none',
  });
  const databaseUrl = resolvedDatabase.databaseUrl ?? devDatabaseUrl(root);
  const databaseMaxConnections = settings.databaseMaxConnections
    ?? resolvedDatabase.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS
    ?? devEnv.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS
    ?? (String(databaseUrl).trim().toLowerCase().startsWith('sqlite:') ? '1' : null);
  if (write && databaseUrl === devDatabaseUrl(root)) {
    mkdirSync(path.dirname(path.join(root, DEFAULT_DEV_DATABASE_RELATIVE_PATH)), {
      recursive: true,
    });
  }
  return {
    ...devEnv,
    ...resolvedDatabase.env,
    SDKWORK_CLAW_DATABASE_URL: databaseUrl,
    SDKWORK_CLAW_DEPLOYMENT_MODE: env.SDKWORK_CLAW_DEPLOYMENT_MODE ?? 'server',
    SDKWORK_CLAW_INSTALL_ENVIRONMENT: env.SDKWORK_CLAW_INSTALL_ENVIRONMENT ?? 'development',
    SDKWORK_CLAW_INSTALL_SEED_PROFILE: env.SDKWORK_CLAW_INSTALL_SEED_PROFILE ?? 'commercial',
    ...(databaseMaxConnections ? { SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS: databaseMaxConnections } : {}),
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
      SDKWORK_CLAW_INSTALL_ENVIRONMENT: env.SDKWORK_CLAW_INSTALL_ENVIRONMENT ?? 'production',
      SDKWORK_CLAW_INSTALL_SEED_PROFILE: env.SDKWORK_CLAW_INSTALL_SEED_PROFILE ?? 'commercial',
    };
  } else {
    stepEnv = devResetEnv(settings, env, root, { write: writeRuntimeConfig });
  }

  stepEnv = {
    ...stepEnv,
    SDKWORK_CLAW_ADMIN_RESET_PASSWORD: password,
  };

  return {
    mode: settings.mode,
    runtimeConfig,
    steps: [
      {
        name: 'reset-admin',
        command: cargoCommand(platform),
        args: installerArgs(settings),
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

Reset the Claw Router admin account password through the installer database layer.

Options:
  --mode <dev|release>          dev uses target/dev/clawrouter.sqlite unless a database env/url is provided; release uses runtime config
  --username <username>         Admin username (default admin)
  --display-name <name>         Admin display name (default Administrator)
  --email <email>               Admin email identity (default admin@sdkwork.com)
  --password <password>         New admin password; may also be set with SDKWORK_CLAW_ADMIN_RESET_PASSWORD
  --config-file <path>          Release runtime TOML path
  --dev-env-file <path>         Dev dotenv file such as .env.postgres
  --database-url <url>          Database override
  --database-max-connections <n>
  --dry-run                     Print the command without executing it
  -h, --help                    Show this help

Examples:
  pnpm admin:reset:dev -- --password "Admin-Dev-Password-2026!"
  pnpm admin:reset:dev:sqlite -- --password "Admin-Dev-Password-2026!"
  pnpm admin:reset:dev:postgres -- --password "Admin-Dev-Password-2026!"
  pnpm admin:reset:release -- --password "Admin-Release-Password-2026!"
  SDKWORK_CLAW_ADMIN_RESET_PASSWORD="Admin-Release-Password-2026!" pnpm admin:reset:release
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
