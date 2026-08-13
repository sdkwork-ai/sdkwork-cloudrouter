#!/usr/bin/env node

// Builds the SDKWork Cloud Router cloud web bundle for one lifecycle
// environment (test | production). The cloud bundle is the frontend-only
// artifact consumed by the cloud deployment: backend APIs are served by the
// platform cloud gateway (api-dev|test|staging.sdkwork.com / api.sdkwork.com),
// and per-environment API origins flow through the deploy host runtime env
// (/runtime-env.js PORTAL_PUBLIC_*) with the materialized .env.cloud.<env>
// profile as the build-time fallback.
//
// Usage:
//   node scripts/build-cloud-router-web.mjs [--environment <test|production>]
//     [--output-root <dir>] [--version <version>] [--dry-run]

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const SUPPORTED_ENVIRONMENTS = ['test', 'production'];
const DEFAULT_OUTPUT_ROOT = path.join('dist', 'cloud-web');

function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseArgs(argv) {
  const settings = {
    environment: 'production',
    version: undefined,
    outputRoot: undefined,
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--environment':
        settings.environment = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--version':
        settings.version = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--output-root':
        settings.outputRoot = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--dry-run':
        settings.dryRun = true;
        break;
      case '--help':
      case '-h':
        settings.help = true;
        break;
      default:
        throw new Error(`unknown option: ${arg}`);
    }
  }

  if (!SUPPORTED_ENVIRONMENTS.includes(settings.environment)) {
    throw new Error(
      `--environment must be one of ${SUPPORTED_ENVIRONMENTS.join(', ')}; got ${settings.environment}`,
    );
  }

  settings.outputRoot = settings.outputRoot
    ? path.resolve(REPO_ROOT, settings.outputRoot)
    : path.resolve(REPO_ROOT, DEFAULT_OUTPUT_ROOT, settings.environment);
  return settings;
}

function printHelp() {
  console.log(`Usage: node scripts/build-cloud-router-web.mjs [options]

Builds the Cloud Router cloud web bundle (frontend only) for one lifecycle
environment. No standalone gateway, API, or database process is built.

Options:
  --environment <test|production>  Lifecycle environment (default production)
  --version <version>              Release version recorded in the build output
  --output-root <dir>              Output root for dist/cloud-web/<environment>
  --dry-run                        Print the resolved build plan without running
  -h, --help                       Show this help
`);
}

async function runStep(step) {
  console.error(`[build-cloud-router-web] ${step.command} ${step.args.join(' ')}`);
  await new Promise((resolve, reject) => {
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
        reject(new Error(`build exited with signal ${signal}`));
        return;
      }
      if ((code ?? 1) !== 0) {
        reject(new Error(`build exited with code ${code}`));
        return;
      }
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

  const portalEnvFile = path.join(
    REPO_ROOT,
    'apps',
    'sdkwork-cloudrouter-pc',
    `.env.cloud.${settings.environment}`,
  );
  if (!existsSync(portalEnvFile)) {
    throw new Error(
      `missing materialized cloud env profile ${portalEnvFile}; `
      + 'run pnpm workflow:materialize-client-env first',
    );
  }

  const portalBuildScript = path.join(
    REPO_ROOT,
    'apps',
    'sdkwork-cloudrouter-pc',
    'scripts',
    'build-portal.mjs',
  );
  const args = [
    portalBuildScript,
    '--mode',
    `cloud.${settings.environment}`,
    '--outDir',
    settings.outputRoot,
  ];

  console.log(`[build-cloud-router-web] environment=${settings.environment}`);
  console.log(`[build-cloud-router-web] mode=cloud.${settings.environment}`);
  console.log(`[build-cloud-router-web] profile=${portalEnvFile}`);
  console.log(`[build-cloud-router-web] output=${settings.outputRoot}`);
  console.log(`[build-cloud-router-web] version=${settings.version ?? '(unset)'}`);
  if (settings.dryRun) {
    return;
  }

  await runStep({
    command: process.execPath,
    args,
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      ...(settings.version
        ? { SDKWORK_PACKAGE_VERSION: settings.version }
        : {}),
    },
  });
}

main().catch((error) => {
  console.error(`[build-cloud-router-web] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
