#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ensureClawRouterBrowserDevelopmentEnv, ensureClawRouterBrowserProductionEnv } from './dev/claw-router-application-env.mjs';
import {
  resolveDefaultDevEnvFilePath,
  resolveWorkspaceDevDatabaseEnv,
} from './dev/claw-router-dev-database-env.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function pnpmCommand(platform = process.platform) {
  return platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function shellForPnpm(platform = process.platform) {
  return platform === 'win32';
}

function toPortablePath(value) {
  return value.replaceAll(path.sep, '/');
}

function appendForwardArgs(args, extraArgs) {
  return extraArgs.length > 0 ? [...args, ...extraArgs] : args;
}

function hasForwardedDatabaseUrl(extraArgs) {
  return extraArgs.includes('--database-url');
}

function defaultDevEnvFileForWorkspace(workspaceRoot) {
  return resolveDefaultDevEnvFilePath(workspaceRoot);
}

function installCandidatesForMode(mode) {
  switch (mode) {
    case 'client':
    case 'desktop':
    case 'service':
    case 'server':
    case 'browser':
    case 'check':
      return [toPortablePath(path.join('apps', 'sdkwork-clawrouter-pc'))];
    default:
      return [];
  }
}

function portalCommandShimCandidates(absoluteDir) {
  return [
    path.join(absoluteDir, 'node_modules', '.bin', 'vite'),
    path.join(absoluteDir, 'node_modules', '.bin', 'vite.cmd'),
    path.join(absoluteDir, 'node_modules', '.bin', 'vite.ps1'),
  ];
}

function portalDependenciesAreReady(absoluteDir) {
  if (!existsSync(path.join(absoluteDir, 'node_modules'))) {
    return false;
  }

  return portalCommandShimCandidates(absoluteDir).some((candidate) => existsSync(candidate));
}

function resolveProductLaunchEnv({
  mode,
  workspaceRoot,
  baseLaunchEnv,
}) {
  if (mode === 'check') {
    ensureClawRouterBrowserProductionEnv({
      workspaceRoot,
      env: baseLaunchEnv,
    });
    return baseLaunchEnv;
  }

  return {
    ...baseLaunchEnv,
    ...ensureClawRouterBrowserDevelopmentEnv({
      workspaceRoot,
      env: baseLaunchEnv,
    }).mergedEnv,
  };
}

export function parseClawRouterProductArgs(argv) {
  const result = {
    mode: 'desktop',
    install: false,
    dryRun: false,
    help: false,
    devEnvFile: undefined,
    extraArgs: [],
  };

  let modeSet = false;
  let forwardOnly = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (forwardOnly) {
      if (arg === '--') {
        continue;
      }
      result.extraArgs.push(arg);
      continue;
    }
    if (arg === '--') {
      forwardOnly = true;
      continue;
    }
    if (arg === '--install') {
      result.install = true;
      continue;
    }
    if (arg === '--dry-run') {
      result.dryRun = true;
      continue;
    }
    if (arg === '--dev-env-file') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--dev-env-file requires a path');
      }
      result.devEnvFile = value;
      index += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      if (modeSet) {
        result.extraArgs.push(arg);
      } else {
        result.help = true;
      }
      continue;
    }
    if (!modeSet && !arg.startsWith('-')) {
      result.mode = arg;
      modeSet = true;
      continue;
    }
    result.extraArgs.push(arg);
  }

  return result;
}

function portalDesktopEnv(env) {
  return {
    ...env,
    SDKWORK_CLAW_DEPLOYMENT_MODE: 'desktop',
  };
}

function portalServiceEnv(env) {
  return {
    ...portalDesktopEnv(env),
    SDKWORK_CLAW_SERVICE_MODE: '1',
    SDKWORK_CLAW_PORTAL_START_HIDDEN: '1',
  };
}

function resolveLaunchEnv({
  env,
  workspaceRoot,
  devEnvFile,
  extraArgs,
}) {
  const resolved = resolveWorkspaceDevDatabaseEnv({
    env,
    workspaceRoot,
    devEnvFile,
    forwardedDatabaseUrl: hasForwardedDatabaseUrl(extraArgs),
    defaultDatabase: 'postgresql',
  });
  return {
    ...resolved.mergedEnv,
    ...resolved.env,
  };
}

function workspaceDevelopmentStep({
  workspaceRoot,
  label,
  env,
  extraArgs,
  clientOnly = false,
  platform,
  nodeCommand,
}) {
  return {
    label,
    command: nodeCommand,
    args: [
      path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs'),
      ...(clientOnly ? ['--client-only'] : []),
      ...extraArgs,
    ],
    cwd: workspaceRoot,
    env,
    shell: false,
    windowsHide: platform === 'win32',
  };
}

export function createClawRouterProductLaunchPlan({
  workspaceRoot = path.resolve(__dirname, '..'),
  mode = 'desktop',
  install = false,
  platform = process.platform,
  env = process.env,
  devEnvFile = undefined,
  extraArgs = [],
} = {}) {
  const portalRelativeDir = toPortablePath(path.join('apps', 'sdkwork-clawrouter-pc'));
  const portalAbsoluteDir = path.join(workspaceRoot, portalRelativeDir);
  const pnpm = pnpmCommand(platform);
  const shell = shellForPnpm(platform);
  const nodeCommand = process.execPath;
  const plan = [];
  const baseLaunchEnv = mode === 'client' || mode === 'desktop'
    ? { ...env }
    : resolveLaunchEnv({ env, workspaceRoot, devEnvFile, extraArgs });
  const launchEnv = resolveProductLaunchEnv({
    mode,
    workspaceRoot,
    baseLaunchEnv,
  });

  for (const relativeDir of installCandidatesForMode(mode)) {
    const absoluteDir = path.join(workspaceRoot, relativeDir);
    if (!install && portalDependenciesAreReady(absoluteDir)) {
      continue;
    }

    plan.push({
      label: 'portal install',
      command: pnpm,
      args: ['--dir', relativeDir, 'install'],
      cwd: workspaceRoot,
      env: launchEnv,
      shell,
      windowsHide: platform === 'win32',
    });
  }

  switch (mode) {
    case 'client':
      plan.push(workspaceDevelopmentStep({
        workspaceRoot,
        label: 'client development workspace',
        env: launchEnv,
        extraArgs,
        clientOnly: true,
        platform,
        nodeCommand,
      }));
      return plan;
    case 'desktop':
      plan.push(workspaceDevelopmentStep({
        workspaceRoot,
        label: 'desktop development workspace',
        env: portalDesktopEnv(launchEnv),
        extraArgs,
        clientOnly: true,
        platform,
        nodeCommand,
      }));
      return plan;
    case 'service':
      plan.push(workspaceDevelopmentStep({
        workspaceRoot,
        label: 'service development workspace',
        env: portalServiceEnv(launchEnv),
        extraArgs,
        platform,
        nodeCommand,
      }));
      return plan;
    case 'server':
      plan.push(workspaceDevelopmentStep({
        workspaceRoot,
        label: 'server development workspace',
        env: launchEnv,
        extraArgs,
        platform,
        nodeCommand,
      }));
      return plan;
    case 'plan':
      plan.push({
        label: 'server development plan',
        command: nodeCommand,
        args: [
          path.join(workspaceRoot, 'scripts', 'dev', 'start-workspace.mjs'),
          '--dry-run',
          ...extraArgs,
        ],
        cwd: workspaceRoot,
        env: launchEnv,
        shell: false,
        windowsHide: platform === 'win32',
      });
      return plan;
    case 'browser':
      plan.push({
        label: 'portal browser runtime',
        command: pnpm,
        args: appendForwardArgs(['--dir', portalRelativeDir, 'dev:browser'], extraArgs),
        cwd: workspaceRoot,
        env: launchEnv,
        shell,
        windowsHide: platform === 'win32',
      });
      return plan;
    case 'check':
      plan.push({
        label: 'portal check',
        command: pnpm,
        args: ['--dir', portalRelativeDir, 'check'],
        cwd: workspaceRoot,
        env: launchEnv,
        shell,
        windowsHide: platform === 'win32',
      });
      return plan;
    default:
      throw new Error(
        `Unsupported claw router application mode: ${mode}. Expected one of client, desktop, service, server, plan, check, browser.`,
      );
  }
}

function printHelp() {
  console.log(`Usage: node scripts/run-claw-router-application.mjs [mode] [options] [mode-args...]

Start sdkwork-clawrouter through a root pnpm-compatible entrypoint.

Modes:
  client   Start the sdkwork-api-cloud-gateway-backed portal client workspace
  desktop  Start the sdkwork-api-cloud-gateway-backed desktop client workspace (default)
  service  Start the full install-checked workspace with service-mode environment flags
  server   Start the all-in-one Rust edge runtime plus the portal dev server
  plan     Print the resolved server development URLs and command plan
  check    Run the portal product check
  browser  Start only the standalone portal browser dev server

Options:
  --install              Run portal pnpm install before starting
  --dev-env-file <path>  Load a dotenv-style local dev environment file before starting
  --dry-run              Print the planned commands without running them
  -h, --help             Show this help

Database profiles:
  pnpm dev:browser starts the topology-aware integrated product server workspace (default profile: standalone.unified-process.development).
  pnpm dev:desktop starts the desktop dev workspace with PostgreSQL and standalone topology by default.
  Desktop packages and first-run local user data use SQLite under ~/.sdkwork/router/data.
  Use pnpm dev:browser:sqlite or pnpm dev:desktop:sqlite to validate explicit SQLite behavior.
  See docs/topology-standard.md for the full standard command matrix.

Examples:
  pnpm dev
  pnpm dev:browser
  pnpm dev:desktop
  pnpm dev:browser:sqlite
  pnpm topology:plan:server
`);
}

function formatCommand(step) {
  return `${step.command} ${step.args.join(' ')}`;
}

async function printDryRun(step) {
  console.error(`[run-claw-router-application] ${formatCommand(step)}`);

  const startWorkspacePath = path.join(step.cwd, 'scripts', 'dev', 'start-workspace.mjs');
  if (step.command === process.execPath && path.resolve(step.args[0] ?? '') === startWorkspacePath) {
    const workspaceModule = await import(pathToFileURL(startWorkspacePath).href);
    const forwardedArgs = step.args.slice(1).filter((arg) => arg !== '--dry-run');
    const previousEnv = {};
    for (const [name, value] of Object.entries(step.env ?? {})) {
      previousEnv[name] = process.env[name];
      process.env[name] = value;
    }
    try {
      const settings = workspaceModule.parseWorkspaceArgs([
        ...forwardedArgs,
        '--dry-run',
      ]);
      const plan = workspaceModule.buildWorkspaceCommandPlan(settings, {
        workspaceRoot: step.cwd,
      });
      for (const line of workspaceModule.renderWorkspaceDryRun(settings, plan)) {
        console.log(line);
      }
    } finally {
      for (const [name, value] of Object.entries(previousEnv)) {
        if (value === undefined) {
          delete process.env[name];
        } else {
          process.env[name] = value;
        }
      }
    }
  }
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

async function main() {
  const settings = parseClawRouterProductArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    return;
  }

  const plan = createClawRouterProductLaunchPlan({
    mode: settings.mode,
    install: settings.install,
    devEnvFile: settings.devEnvFile,
    extraArgs: settings.extraArgs,
  });

  for (const step of plan) {
    if (settings.dryRun) {
      await printDryRun(step);
      continue;
    }

    console.error(`[run-claw-router-application] ${formatCommand(step)}`);
    await runStep(step);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(`[run-claw-router-application] ${error.message}`);
    process.exit(1);
  });
}
