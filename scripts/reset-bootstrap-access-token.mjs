#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
  resolveCloudRouterBootstrapCredentialPath,
  resolveCloudRouterEnvironmentAdminAccount,
} from './lib/cloud-router-environment-admin.mjs';
import {
  readCredentialBundle,
  writeCredentialBundle,
} from '@sdkwork/iam-credential-entry/node-bootstrap';

function readApplicationManifest(manifestPath) {
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');
const SDKWORK_ACCESS_TOKEN_ENV_KEY = 'SDKWORK_ACCESS_TOKEN';

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

export function parseResetBootstrapAccessTokenArgs(argv = []) {
  const settings = {
    help: false,
    dryRun: false,
    mode: 'dev',
    environment: 'development',
    writeCredential: true,
    tenantId: null,
    appId: null,
    ttlSeconds: null,
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
      case '--tenant-id':
        settings.tenantId = requireValue(argv, index, arg).trim();
        index += 1;
        break;
      case '--app-id':
        settings.appId = requireValue(argv, index, arg).trim();
        index += 1;
        break;
      case '--ttl-seconds':
        settings.ttlSeconds = requireValue(argv, index, arg).trim();
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
      case '--no-write-credential':
        settings.writeCredential = false;
        break;
      default:
        throw new Error(`Unsupported bootstrap token option: ${arg}`);
    }
  }

  return settings;
}

function normalizeMode(value) {
  const mode = String(value ?? '').trim().toLowerCase();
  if (mode !== 'dev' && mode !== 'release') {
    throw new Error('--mode must be dev or release');
  }
  return mode;
}

function installerArgs(settings, manifest) {
  const args = [
    'run',
    '-p',
    'sdkwork-cloudrouter-installer',
    '--',
    'issue-bootstrap-token',
  ];
  const tenantId = settings.tenantId ?? manifest?.backend?.tenantId;
  const appId = settings.appId ?? manifest?.backend?.appId;
  if (tenantId) {
    args.push('--tenant-id', tenantId);
  }
  if (appId) {
    args.push('--app-id', appId);
  }
  if (settings.ttlSeconds) {
    args.push('--ttl-seconds', settings.ttlSeconds);
  }
  return args;
}

function devTokenEnv(settings, env, root) {
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
    throw new Error('bootstrap token issuance requires PostgreSQL because server data is authoritative');
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

export function createResetBootstrapAccessTokenPlan({
  settings = parseResetBootstrapAccessTokenArgs([]),
  workspaceRoot: root = workspaceRoot,
  platform = process.platform,
  env = process.env,
  writeRuntimeConfig = true,
} = {}) {
  const manifest = readApplicationManifest(path.join(root, 'agent.app.config.json'));
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
      ...devTokenEnv(settings, env, root),
      ...environmentOverrides,
      SDKWORK_CLOUDROUTER_INSTALL_SEED_PROFILE: env.SDKWORK_CLOUDROUTER_INSTALL_SEED_PROFILE ?? 'commercial',
    };
  }

  delete stepEnv[SDKWORK_ACCESS_TOKEN_ENV_KEY];

  return {
    mode: settings.mode,
    environment: settings.environment,
    runtimeConfig,
    manifest,
    writeCredential: settings.writeCredential,
    steps: [
      {
        name: 'issue-bootstrap-token',
        command: cargoCommand(platform),
        args: installerArgs(settings, manifest),
        cwd: root,
        env: stepEnv,
        shell: false,
        windowsHide: platform === 'win32',
      },
    ],
  };
}

/**
 * Persist one issued bootstrap token in the user-private credential store.
 *
 * `IAM_APPLICATION_BOOTSTRAP_SPEC` section 5.4.1 keeps the token outside every
 * checkout, so this writes `~/.sdkwork/cloudrouter/credentials/<profile-id>.json`
 * and never a repository env file.
 * @param options - lifecycle, token, and dry-run flag.
 * @returns the bundle path and whether the value changed.
 */
export function writeBootstrapAccessTokenCredential({
  environment,
  accessToken,
  dryRun = false,
  homeDir,
} = {}) {
  const lifecycle = normalizeCloudRouterLifecycleEnvironment(environment);
  const credentialPath = resolveCloudRouterBootstrapCredentialPath({
    environment: lifecycle,
    ...(homeDir ? { homeDir } : {}),
  });
  const existing = readCredentialBundle(credentialPath);
  const changed = existing?.accessToken !== accessToken || existing?.environment !== lifecycle;
  if (!dryRun && changed) {
    writeCredentialBundle(credentialPath, {
      accessToken,
      environment: lifecycle,
      deploymentProfile: 'standalone',
      source: 'signed-iam-access-token',
      issuedAt: new Date().toISOString(),
    });
  }
  return [{ filePath: credentialPath, changed }];
}

function printHelp() {
  console.log(`Usage: node scripts/reset-bootstrap-access-token.mjs --mode <dev|release> --environment <lifecycle> [options]

Issue a signed bootstrap SDKWORK_ACCESS_TOKEN through the installer database layer.

Development mode expects a manually configured PostgreSQL profile (config/host/postgres.env).
Release mode expects an initialized online deployment database and runtime config.

Options:
  --mode <dev|release>          dev uses config/host/postgres.env; release uses PostgreSQL runtime config
  --environment <lifecycle>     development, test, staging, or production (default development)
  --tenant-id <tenantId>        IAM tenant override (default from agent.app.config.json)
  --app-id <appId>              IAM app override (default from agent.app.config.json)
  --ttl-seconds <seconds>       Optional token TTL override
  --config-file <path>          Release runtime TOML path
  --dev-env-file <path>         Dev PostgreSQL dotenv file such as config/host/postgres.env
  --database-url <url>          PostgreSQL database override
  --database-max-connections <n>
  --no-write-credential         Print token JSON only; do not write the credential bundle
  --dry-run                     Print the command without executing it
  -h, --help                    Show this help

Examples:
  pnpm admin:token:dev
  pnpm admin:token:staging -- --config-file /etc/sdkwork/cloudrouter/config.toml
  pnpm admin:token:release
`);
}

function formatCommand(step) {
  return `${step.command} ${step.args.join(' ')}`;
}

async function runStepCaptureJson(step) {
  return await new Promise((resolve, reject) => {
    let stdout = '';
    const child = spawn(step.command, step.args, {
      cwd: step.cwd,
      env: step.env,
      stdio: ['ignore', 'pipe', 'inherit'],
      shell: step.shell ?? false,
      windowsHide: step.windowsHide ?? process.platform === 'win32',
    });

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
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
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (error) {
        reject(new Error(`${step.name} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  });
}

async function main(argv = process.argv.slice(2)) {
  const settings = parseResetBootstrapAccessTokenArgs(argv);
  if (settings.help) {
    printHelp();
    return;
  }

  const account = resolveCloudRouterEnvironmentAdminAccount(settings.environment);
  const plan = createResetBootstrapAccessTokenPlan({
    settings,
    writeRuntimeConfig: !settings.dryRun,
  });

  for (const step of plan.steps) {
    console.error(`[reset-bootstrap-token] ${formatCommand(step)}`);
    console.error(
      `[reset-bootstrap-token] lifecycle=${plan.environment} admin=${account.username} (${account.email})`,
    );
    if (settings.dryRun) {
      continue;
    }
    const issued = await runStepCaptureJson(step);
    if (settings.writeCredential) {
      const written = writeBootstrapAccessTokenCredential({
        environment: plan.environment,
        accessToken: issued.accessToken,
      });
      for (const entry of written) {
        console.error(`[reset-bootstrap-token] wrote ${entry.filePath}${entry.changed ? '' : ' (unchanged)'}`);
      }
    }
    console.log(JSON.stringify({
      status: issued.status,
      environment: plan.environment,
      tenantId: issued.tenantId,
      appId: issued.appId,
      sessionId: issued.sessionId,
      expiresAt: issued.expiresAt,
      accessToken: issued.accessToken,
    }));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(`[reset-bootstrap-token] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
