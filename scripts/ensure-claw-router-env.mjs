#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { ensureClawRouterEnvForLifecycle } from './dev/claw-router-application-env.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_WORKSPACE_ROOT = path.resolve(__dirname, '..');

function printHelp() {
  console.log(`Usage: node scripts/ensure-claw-router-env.mjs [options]

Ensures SDKWork-standard env profiles with generated SDKWORK_ACCESS_TOKEN values.

Lifecycles:
  dev           apps/sdkwork-clawrouter-pc/.env.development
  build         apps/sdkwork-clawrouter-pc/.env.production
  start         .env.release and apps/sdkwork-clawrouter-pc/.env.production
  all           development, production, and release profiles

Options:
  --lifecycle <dev|build|start|all>   Default: dev
  --workspace-root <path>             Repository root
  --deployment-profile <profile>      Default: standalone
  --dry-run                           Resolve merged env without writing files
  --help, -h                          Show this help
`);
}

function parseArgs(argv = []) {
  const options = {
    lifecycle: 'dev',
    workspaceRoot: DEFAULT_WORKSPACE_ROOT,
    deploymentProfile: 'standalone',
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--lifecycle':
        options.lifecycle = argv[index + 1] ?? options.lifecycle;
        index += 1;
        break;
      case '--workspace-root':
        options.workspaceRoot = path.resolve(argv[index + 1] ?? options.workspaceRoot);
        index += 1;
        break;
      case '--deployment-profile':
        options.deploymentProfile = argv[index + 1] ?? options.deploymentProfile;
        index += 1;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`unknown option: ${arg}`);
    }
  }

  return options;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[ensure-claw-router-env] ${error.message}`);
    printHelp();
    process.exit(1);
  }

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const results = ensureClawRouterEnvForLifecycle(options.lifecycle, {
    workspaceRoot: options.workspaceRoot,
    deploymentProfile: options.deploymentProfile,
    dryRun: options.dryRun,
  });

  console.log('[ensure-claw-router-env] application env ready');
  console.log(JSON.stringify({
    lifecycle: options.lifecycle,
    profiles: Object.fromEntries(
      Object.entries(results).map(([name, result]) => [
        name,
        {
          profileFilePath: result.profileFilePath,
          changed: result.changed,
          created: result.created,
          hasAccessToken: Boolean(result.mergedEnv?.SDKWORK_ACCESS_TOKEN),
        },
      ]),
    ),
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}

export {
  DEFAULT_WORKSPACE_ROOT,
  main,
  parseArgs,
};
