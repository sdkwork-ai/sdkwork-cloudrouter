import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { ensureCloudRouterBrowserProductionEnv } from '../../../scripts/dev/cloud-router-application-env.mjs';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const MAX_OLD_SPACE_SIZE_MB = 8192;
const HEAP_BOOTSTRAP_ENV = 'CLOUDROUTER_PORTAL_BUILD_HEAP_BOOTSTRAPPED';

if (process.env[HEAP_BOOTSTRAP_ENV] !== '1') {
  const result = spawnSync(
    process.execPath,
    [`--max-old-space-size=${MAX_OLD_SPACE_SIZE_MB}`, import.meta.filename, ...process.argv.slice(2)],
    {
      env: {
        ...process.env,
        [HEAP_BOOTSTRAP_ENV]: '1',
      },
      stdio: 'inherit',
    },
  );

  process.exit(result.status ?? 1);
}

process.env.NODE_ENV = "production";

function parseBuildPortalArgs(argv = process.argv.slice(2)) {
  const settings = {
    mode: 'production',
    outDir: undefined,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--mode':
        settings.mode = argv[index + 1] ?? settings.mode;
        index += 1;
        break;
      case '--outDir':
        settings.outDir = argv[index + 1];
        index += 1;
        break;
      case '--help':
      case '-h':
        settings.help = true;
        break;
      default:
        throw new Error(`Unsupported build-portal option: ${arg}`);
    }
  }

  return settings;
}

function printHelp() {
  console.log(`Usage: node scripts/build-portal.mjs [options]

Builds the Cloud Router portal production assets.

Options:
  --mode <mode>        Vite build mode (default production; cloud builds use
                       cloud.test or cloud.production to load the materialized
                       .env.cloud.<environment> profile)
  --outDir <path>      Vite build output directory (default dist)
  --dry-run            Print the resolved build settings without building.
  -h, --help           Show this help.
`);
}

const buildPortalSettings = parseBuildPortalArgs();
if (buildPortalSettings.help) {
  printHelp();
  process.exit(0);
}

// Cloud profile builds consume the materialized .env.cloud.* files only; the
// standalone/default .env.production lifecycle profile stays untouched.
if (!buildPortalSettings.mode.startsWith('cloud.')) {
  ensureCloudRouterBrowserProductionEnv({ workspaceRoot });
}

const { build } = await import("vite");

await build({
  configLoader: 'native',
  mode: buildPortalSettings.mode,
  ...(buildPortalSettings.outDir ? { outDir: buildPortalSettings.outDir } : {}),
});
