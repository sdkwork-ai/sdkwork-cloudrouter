#!/usr/bin/env node

import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  productionGatewayBinaryPath,
} from './claw-router-production-artifacts.mjs';
import { ensureClawRouterBrowserProductionEnv } from './dev/claw-router-application-env.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

function pnpmCommand(platform = process.platform) {
  return platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function cargoCommand(platform = process.platform) {
  return platform === 'win32' ? 'cargo.exe' : 'cargo';
}

function printHelp() {
  console.log(`Usage: node scripts/build-claw-router-production.mjs [options]

Build production portal assets and the Rust standalone gateway release binary.

Options:
  --dry-run       Print the build plan without executing commands.
  -h, --help      Show this help.
`);
}

function parseProductionBuildArgs(argv) {
  const settings = {
    help: false,
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg === '--') {
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
      default:
        throw new Error(`Unsupported production build option: ${arg}`);
    }
  }

  return settings;
}

function createProductionBuildPlan(
  _settings = { help: false, dryRun: false },
  env = process.env,
  platform = process.platform,
  root = workspaceRoot,
) {
  return [
    {
      label: 'gateway OpenAPI schema generation',
      command: 'python',
      args: ['-B', '-m', 'tools.clawrouter_gateway_openapi_generator'],
      env,
      cwd: root,
    },
    {
      label: 'app SDK runtime build',
      command: pnpmCommand(platform),
      args: ['--dir', 'sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi', 'build'],
      env,
      cwd: root,
      attempts: 2,
    },
    {
      label: 'backend SDK runtime build',
      command: pnpmCommand(platform),
      args: ['--dir', 'sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi', 'build'],
      env,
      cwd: root,
      attempts: 2,
    },
    {
      label: 'open SDK runtime build',
      command: pnpmCommand(platform),
      args: ['--dir', 'sdks/clawrouter-open-sdk/clawrouter-open-sdk-typescript/generated/server-openapi', 'build'],
      env,
      cwd: root,
      attempts: 2,
    },
    {
      label: 'portal production assets',
      command: pnpmCommand(platform),
      args: ['--dir', 'apps/sdkwork-clawrouter-pc', 'build'],
      env,
      cwd: root,
    },
    {
      label: 'SDK archive artifacts',
      command: 'node',
      args: ['scripts/archive-claw-router-sdks.mjs'],
      env,
      cwd: root,
    },
    {
      label: 'Rust standalone gateway release binary',
      command: cargoCommand(platform),
      args: [
        'build',
        '-p',
        'sdkwork-api-clawrouter-standalone-gateway',
        '--bin',
        'sdkwork-api-clawrouter-standalone-gateway',
        '--release',
      ],
      env,
      cwd: root,
    },
  ];
}

function renderProductionBuildPlan(
  plan,
  env = process.env,
  platform = process.platform,
  root = workspaceRoot,
) {
  return [
    '[build-production] Build Plan',
    ...plan.map((step) => `[build-production]   ${step.label}: ${step.command} ${step.args.join(' ')}`),
    `[build-production]   SDK archive root: ${path.join(root, 'apps', 'sdkwork-clawrouter-pc', 'dist', 'sdk-archives')}`,
    `[build-production]   Rust standalone gateway binary: ${productionGatewayBinaryPath({
      env,
      platform,
      workspaceRoot: root,
    })}`,
  ];
}

function runStepOnce(step, attempt = 1, attempts = 1) {
  return new Promise((resolve, reject) => {
    const retryLabel = attempts > 1 ? ` (attempt ${attempt}/${attempts})` : '';
    console.error(`[build-production] ${step.label}${retryLabel}: ${step.command} ${step.args.join(' ')}`);
    const child = spawn(step.command, step.args, {
      cwd: step.cwd,
      env: step.env,
      stdio: 'inherit',
      shell: process.platform === 'win32' && step.command.endsWith('.cmd'),
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
      resolve();
    });
  });
}

async function runStep(step) {
  const attempts = Math.max(1, Number(step.attempts ?? 1));
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await runStepOnce(step, attempt, attempts);
      return;
    } catch (error) {
      lastError = error;
      if (attempt >= attempts) {
        break;
      }
      console.error(`[build-production] ${step.label} failed; retrying once to recover from transient toolchain process exits`);
    }
  }
  throw lastError;
}

async function main(argv = process.argv.slice(2)) {
  const settings = parseProductionBuildArgs(argv);
  if (settings.help) {
    printHelp();
    return;
  }

  const plan = createProductionBuildPlan(settings, process.env, process.platform, workspaceRoot);
  for (const line of renderProductionBuildPlan(plan, process.env, process.platform, workspaceRoot)) {
    console.log(line);
  }
  if (settings.dryRun) {
    return;
  }
  ensureClawRouterBrowserProductionEnv({ workspaceRoot });
  for (const step of plan) {
    await runStep(step);
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  main().catch((error) => {
    console.error(`[build-production] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

export {
  cargoCommand,
  createProductionBuildPlan,
  main,
  parseProductionBuildArgs,
  pnpmCommand,
  renderProductionBuildPlan,
};
