#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  productionGatewayBinaryPath,
} from './cloud-router-production-artifacts.mjs';
import { ensureCloudRouterBrowserProductionEnv } from './dev/cloud-router-application-env.mjs';

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
  console.log(`Usage: node scripts/build-cloud-router-production.mjs [options]

Build production portal assets and the Rust standalone gateway binary.

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
      args: ['-B', '-m', 'tools.cloudrouter_gateway_openapi_generator'],
      env,
      cwd: root,
    },
    {
      // Sibling and local workspace packages ship dist-based entries but no
      // committed dist, and `.npmrc` prefer-workspace-packages=true links the
      // source checkouts. Build each missing dist individually so fresh CI
      // checkouts resolve the same artifacts the local workspace has, while
      // populated local workspaces stay incremental.
      label: 'workspace dist-based sibling packages build',
      run: async ({ runCommand }) => {
        for (const sibling of siblingDistPackages) {
          if (directoryHasFiles(path.join(workspaceRoot, sibling.dir, sibling.distDir))) {
            console.error(`[build-production] sibling ${sibling.dir}: skipped (${sibling.distDir} already present)`);
            continue;
          }
          await runCommand(pnpmCommand(platform), ['--dir', sibling.dir, 'run', 'build'], workspaceRoot);
        }
      },
    },
    {
      label: 'app SDK runtime build',
      command: pnpmCommand(platform),
      args: ['--dir', 'sdks/cloudrouter-app-sdk/cloudrouter-app-sdk-typescript/generated/server-openapi', 'build'],
      env,
      cwd: root,
      attempts: 2,
      skip: (stepRoot = workspaceRoot) => directoryHasFiles(path.join(stepRoot, 'sdks/cloudrouter-app-sdk/cloudrouter-app-sdk-typescript/generated/server-openapi/dist')),
    },
    {
      label: 'backend SDK runtime build',
      command: pnpmCommand(platform),
      args: ['--dir', 'sdks/cloudrouter-backend-sdk/cloudrouter-backend-sdk-typescript/generated/server-openapi', 'build'],
      env,
      cwd: root,
      attempts: 2,
      skip: (stepRoot = workspaceRoot) => directoryHasFiles(path.join(stepRoot, 'sdks/cloudrouter-backend-sdk/cloudrouter-backend-sdk-typescript/generated/server-openapi', 'dist')),
    },
    {
      label: 'open SDK runtime build',
      command: pnpmCommand(platform),
      args: ['--dir', 'sdks/cloudrouter-open-sdk/cloudrouter-open-sdk-typescript/generated/server-openapi', 'build'],
      env,
      cwd: root,
      attempts: 2,
      skip: (stepRoot = workspaceRoot) => directoryHasFiles(path.join(stepRoot, 'sdks/cloudrouter-open-sdk/cloudrouter-open-sdk-typescript/generated/server-openapi', 'dist')),
    },
    {
      // Composed facade dist bundles the generated runtime output above; the
      // portal build links the facade entry points, so build them in order.
      label: 'app SDK facade build',
      command: pnpmCommand(platform),
      args: ['--dir', 'sdks/cloudrouter-app-sdk/cloudrouter-app-sdk-typescript', 'build'],
      env,
      cwd: root,
      skip: (stepRoot = workspaceRoot) => directoryHasFiles(path.join(stepRoot, 'sdks/cloudrouter-app-sdk/cloudrouter-app-sdk-typescript', 'dist')),
    },
    {
      label: 'backend SDK facade build',
      command: pnpmCommand(platform),
      args: ['--dir', 'sdks/cloudrouter-backend-sdk/cloudrouter-backend-sdk-typescript', 'build'],
      env,
      cwd: root,
      skip: (stepRoot = workspaceRoot) => directoryHasFiles(path.join(stepRoot, 'sdks/cloudrouter-backend-sdk/cloudrouter-backend-sdk-typescript', 'dist')),
    },
    {
      label: 'open SDK facade build',
      command: pnpmCommand(platform),
      args: ['--dir', 'sdks/cloudrouter-open-sdk/cloudrouter-open-sdk-typescript', 'build'],
      env,
      cwd: root,
      skip: (stepRoot = workspaceRoot) => directoryHasFiles(path.join(stepRoot, 'sdks/cloudrouter-open-sdk/cloudrouter-open-sdk-typescript', 'dist')),
    },
    {
      label: 'portal production assets',
      command: pnpmCommand(platform),
      args: ['--dir', 'apps/sdkwork-cloudrouter-pc', 'build'],
      env,
      cwd: root,
    },
    {
      label: 'SDK archive artifacts',
      command: 'node',
      args: ['scripts/archive-cloud-router-sdks.mjs'],
      env,
      cwd: root,
    },
    {
      label: 'Rust standalone gateway release binary',
      command: cargoCommand(platform),
      args: [
        'build',
        '-p',
        'sdkwork-api-cloudrouter-standalone-gateway',
        '--bin',
        'sdkwork-api-cloudrouter-standalone-gateway',
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
    ...plan.map((step) => `[build-production]   ${step.label}: ${
      typeof step.run === 'function'
        ? `( orchestrated: ${siblingDistPackages.length} dist-based workspace packages )`
        : `${step.command} ${step.args.join(' ')}`
    }`),
    `[build-production]   SDK archive root: ${path.join(root, 'apps', 'sdkwork-cloudrouter-pc', 'dist', 'sdk-archives')}`,
    `[build-production]   Rust standalone gateway binary: ${productionGatewayBinaryPath({
      env,
      platform,
      workspaceRoot: root,
    })}`,
  ];
}

function directoryHasFiles(dir) {
  try {
    return fs.readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

// Fresh CI checkouts carry no dist output; existing workspaces do. Building
// per package only when its dist is missing keeps local rebuilds incremental
// while CI builds everything from source. `distDir` is relative to the package
// root and mirrors where the package entry points actually resolve: most
// composed facades ship a top-level `dist`, while generated-runtime facades
// resolve `main`/`types` from `generated/server-openapi/dist`.
const siblingDistPackages = [
  { dir: '../sdkwork-sdk-commons/sdkwork-sdk-common-typescript', distDir: 'dist' },
  { dir: '../sdkwork-ui/sdkwork-ui-pc-react', distDir: 'dist' },
  { dir: '../sdkwork-models/sdks/sdkwork-models-app-sdk/sdkwork-models-app-sdk-typescript', distDir: 'generated/server-openapi/dist' },
  { dir: '../sdkwork-models/sdks/sdkwork-models-sdk/sdkwork-models-sdk-typescript', distDir: 'dist' },
  { dir: '../sdkwork-prompts/sdks/sdkwork-prompts-app-sdk/sdkwork-prompts-app-sdk-typescript', distDir: 'dist' },
  { dir: '../sdkwork-prompts/sdks/sdkwork-prompts-backend-sdk/sdkwork-prompts-backend-sdk-typescript', distDir: 'dist' },
  { dir: '../sdkwork-log/sdks/sdkwork-log-backend-sdk/sdkwork-log-backend-sdk-typescript', distDir: 'dist' },
];

function spawnCommand(command, args, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32' && command.endsWith('.cmd'),
      windowsHide: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited with signal ${signal}`));
        return;
      }
      if ((code ?? 1) !== 0) {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
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
  if (typeof step.run === 'function') {
    await step.run({ runCommand: (command, args, cwd) => spawnCommand(command, args, cwd, step.env) });
    return;
  }
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
  ensureCloudRouterBrowserProductionEnv({ workspaceRoot });
  for (const step of plan) {
    if (typeof step.skip === 'function' && step.skip(workspaceRoot)) {
      console.error(`[build-production] ${step.label}: skipped (dist output already present)`);
      continue;
    }
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
