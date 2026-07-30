#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const POSTGRES_TEST_DATABASE_URL = 'SDKWORK_DATABASE_URL';
const POSTGRES_TEST_PORT = 'SDKWORK_CLAW_POSTGRES_TEST_PORT';
const POSTGRES_DOCKER_COMPOSE_FILE = 'docker-compose.postgres-test.yml';
const POSTGRES_DOCKER_PROJECT = 'sdkwork-clawrouter-postgres-test';
const DEFAULT_WORKSPACE_ROOT = path.resolve(__dirname, '..');

function printHelp() {
  console.log(`Usage: node scripts/run-postgres-integration.mjs [options] [-- cargo-test-args...]

Run the sdkwork-clawrouter-router-service real Postgres transaction integration tests.

Options:
  --with-docker       Start the app-local Docker Postgres test database before cargo.
  --keep-docker       Keep the Docker Postgres test database running after cargo.
  --require-database  Fail before running cargo when ${POSTGRES_TEST_DATABASE_URL} is absent.
  --dry-run           Print the cargo command without executing it.
  -h, --help          Show this help.

Examples:
  pnpm test:postgres
  pnpm test:postgres:required
  pnpm test:postgres:docker
  pnpm test:postgres -- --nocapture
`);
}

function parseArgs(argv) {
  const result = {
    withDocker: false,
    keepDocker: false,
    requireDatabase: false,
    dryRun: false,
    help: false,
    extraArgs: [],
  };
  let forwardOnly = false;

  const applyRunnerOption = (arg) => {
    if (arg === '--require-database') {
      result.requireDatabase = true;
      return true;
    }
    if (arg === '--with-docker') {
      result.withDocker = true;
      return true;
    }
    if (arg === '--keep-docker') {
      result.keepDocker = true;
      return true;
    }
    if (arg === '--dry-run') {
      result.dryRun = true;
      return true;
    }
    if (arg === '--help' || arg === '-h') {
      result.help = true;
      return true;
    }
    return false;
  };

  for (const arg of argv) {
    if (applyRunnerOption(arg)) {
      continue;
    }
    if (arg === '--') {
      forwardOnly = true;
      continue;
    }
    if (forwardOnly) {
      if (applyRunnerOption(arg)) {
        continue;
      }
      result.extraArgs.push(arg);
      continue;
    }
    result.extraArgs.push(arg);
  }

  return result;
}

function postgresDockerTestPort(env = process.env) {
  const value = (env[POSTGRES_TEST_PORT] ?? '').trim();
  return value.length > 0 ? value : '15432';
}

function postgresDockerDatabaseUrl(env = process.env) {
  return `postgres://sdkwork_claw_test:sdkwork_claw_test_password@127.0.0.1:${postgresDockerTestPort(env)}/sdkwork_claw_test`;
}

function hasPostgresDatabaseUrl(env = process.env) {
  return (env[POSTGRES_TEST_DATABASE_URL] ?? '').trim().length > 0;
}

function postgresIntegrationCargoArgs(extraArgs = []) {
  const args = [
    'test',
    '-p',
    'sdkwork-clawrouter-router-service',
    '--test',
    'postgres_transaction_integration',
  ];
  return extraArgs.length > 0 ? [...args, '--', ...extraArgs] : args;
}

function dockerComposeFilePath(workspaceRoot = DEFAULT_WORKSPACE_ROOT) {
  return path.join(workspaceRoot, POSTGRES_DOCKER_COMPOSE_FILE);
}

function postgresDockerComposeArgs(action, workspaceRoot = DEFAULT_WORKSPACE_ROOT) {
  const baseArgs = [
    'compose',
    '-p',
    POSTGRES_DOCKER_PROJECT,
    '-f',
    dockerComposeFilePath(workspaceRoot),
  ];
  switch (action) {
    case 'up':
      return [...baseArgs, 'up', '-d', '--wait'];
    case 'down':
      return [...baseArgs, 'down', '--volumes', '--remove-orphans'];
    default:
      throw new Error(`Unsupported Postgres Docker action: ${action}`);
  }
}

function dockerAvailabilityArgs() {
  return ['version', '--format', '{{.Server.Version}}'];
}

function createPostgresIntegrationPlan(
  settings,
  env = process.env,
  workspaceRoot = DEFAULT_WORKSPACE_ROOT,
) {
  const testEnv = settings.withDocker
    ? {
        ...env,
        [POSTGRES_TEST_DATABASE_URL]: postgresDockerDatabaseUrl(env),
      }
    : env;
  const steps = [];

  if (settings.withDocker) {
    steps.push({
      label: 'docker availability check',
      command: 'docker',
      args: dockerAvailabilityArgs(),
      cwd: workspaceRoot,
      env,
      preflight: true,
      quiet: true,
    });
    steps.push({
      label: 'postgres docker up',
      command: 'docker',
      args: postgresDockerComposeArgs('up', workspaceRoot),
      cwd: workspaceRoot,
      env,
    });
  }

  steps.push({
    label: 'postgres transaction integration',
    command: 'cargo',
    args: postgresIntegrationCargoArgs(settings.extraArgs),
    cwd: workspaceRoot,
    env: testEnv,
  });

  if (settings.withDocker && !settings.keepDocker) {
    steps.push({
      label: 'postgres docker down',
      command: 'docker',
      args: postgresDockerComposeArgs('down', workspaceRoot),
      cleanup: true,
      cwd: workspaceRoot,
      env,
    });
  }

  return {
    steps,
    configured: hasPostgresDatabaseUrl(testEnv),
  };
}

function formatCommand(command, args) {
  return `${command} ${args.join(' ')}`;
}

function runCommand(
  command,
  args,
  { cwd = process.cwd(), env = process.env, dryRun = false, quiet = false } = {},
) {
  if (dryRun) {
    console.log(formatCommand(command, args));
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      windowsHide: process.platform === 'win32',
    });
    let output = '';

    if (quiet) {
      child.stdout?.on('data', (chunk) => {
        output += chunk.toString();
      });
      child.stderr?.on('data', (chunk) => {
        output += chunk.toString();
      });
    }

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited with signal ${signal}`));
        return;
      }
      if ((code ?? 1) !== 0) {
        const details = output.trim();
        reject(
          new Error(
            details
              ? `${command} exited with code ${code}: ${details}`
              : `${command} exited with code ${code}`,
          ),
        );
        return;
      }
      resolve();
    });
  });
}

function dockerUnavailableError(error) {
  const suffix = error?.message ? ` Original error: ${error.message}` : '';
  return new Error(
    `Docker engine is not available. Preflight command: docker version. Start Docker Desktop or a compatible Docker engine, then run pnpm.cmd test:postgres:docker again.${suffix}`,
  );
}

async function runPostgresIntegrationPlan(plan, { dryRun = false } = {}) {
  if (dryRun) {
    for (const step of plan.steps) {
      console.log(formatCommand(step.command, step.args));
    }
    return;
  }

  let primaryError = null;
  let cleanupEnabled = false;
  try {
    for (const step of plan.steps.filter((candidate) => !candidate.cleanup)) {
      console.error(`[postgres-integration] ${step.label}: ${formatCommand(step.command, step.args)}`);
      try {
        await runCommand(step.command, step.args, {
          cwd: step.cwd,
          env: step.env,
          quiet: step.quiet ?? false,
        });
        if (step.label === 'postgres docker up') {
          cleanupEnabled = true;
        }
      } catch (error) {
        if (step.preflight) {
          throw dockerUnavailableError(error);
        }
        throw error;
      }
    }
  } catch (error) {
    primaryError = error;
  } finally {
    for (const step of plan.steps.filter((candidate) => candidate.cleanup && cleanupEnabled)) {
      try {
        console.error(`[postgres-integration] ${step.label}: ${formatCommand(step.command, step.args)}`);
        await runCommand(step.command, step.args, {
          cwd: step.cwd,
          env: step.env,
        });
      } catch (cleanupError) {
        if (!primaryError) {
          primaryError = cleanupError;
        } else {
          console.error(`[postgres-integration] cleanup failed: ${cleanupError.message}`);
        }
      }
    }
  }

  if (primaryError) {
    throw primaryError;
  }
}

async function main() {
  const settings = parseArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    return;
  }

  const plan = createPostgresIntegrationPlan(settings);
  if (settings.requireDatabase && !plan.configured) {
    console.error(
      `[postgres-integration] ${POSTGRES_TEST_DATABASE_URL} is required for CI-grade Postgres transaction verification.`,
    );
    process.exit(2);
  }
  if (!plan.configured) {
    console.error(
      `[postgres-integration] ${POSTGRES_TEST_DATABASE_URL} is not set; Rust tests will compile and exercise the env-gated skip path.`,
    );
  }

  await runPostgresIntegrationPlan(plan, {
    dryRun: settings.dryRun,
  });
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  main().catch((error) => {
    console.error(`[postgres-integration] ${error.message}`);
    process.exit(1);
  });
}

export {
  POSTGRES_TEST_DATABASE_URL,
  createPostgresIntegrationPlan,
  dockerAvailabilityArgs,
  hasPostgresDatabaseUrl,
  parseArgs,
  postgresDockerComposeArgs,
  postgresDockerDatabaseUrl,
  postgresIntegrationCargoArgs,
};
