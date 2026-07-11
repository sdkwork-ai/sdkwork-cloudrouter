import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_DEV_PROFILE_ID,
  listHealthSurfaces,
  loadTopologyProfileForWorkspace,
  REPO_ROOT,
  resolveDevProfileId,
  resolveGatewayBaseUrl,
  resolveSurfaceHttpUrl,
} from './claw-router-topology.mjs';
import { ensureClawRouterBrowserDevelopmentEnv } from '../dev/claw-router-application-env.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEGACY_MODES = new Set(['server', 'desktop', 'browser', 'plan', 'service']);
const DEFAULT_SQLITE_DATABASE_URL = 'sqlite://target/dev/clawrouter.sqlite';

function mapTargetToProductMode(target, legacyMode) {
  if (target === 'desktop') {
    return 'desktop';
  }
  if (target === 'browser-only') {
    return 'browser';
  }
  if (target === 'browser') {
    return 'server';
  }
  if (target === 'plan') {
    return 'plan';
  }
  if (target === 'service') {
    return 'service';
  }
  if (legacyMode && LEGACY_MODES.has(legacyMode)) {
    return legacyMode;
  }
  return 'server';
}

function hasPassthroughFlag(passthrough, flag) {
  return passthrough.includes(flag);
}

function applyDatabaseSettings(settings) {
  if (settings.database === 'postgres' && !settings.devEnvFile) {
    settings.devEnvFile = '.env.postgres';
  }
  if (
    settings.database === 'sqlite'
    && !hasPassthroughFlag(settings.passthrough, '--database-url')
  ) {
    settings.passthrough.push('--database-url', DEFAULT_SQLITE_DATABASE_URL);
  }
}

function parseArgs(argv) {
  const settings = {
    deploymentProfile: 'standalone',
    serviceLayout: 'unified-process',
    target: 'browser',
    database: undefined,
    legacyMode: undefined,
    devEnvFile: undefined,
    dryRun: false,
    help: false,
    passthrough: [],
    passthroughMode: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      settings.help = true;
      continue;
    }
    if (arg === '--topology') {
      throw new Error(
        '--topology is retired; use --deployment-profile (standalone|cloud) and --service-layout (unified-process|split-services)',
      );
    }
    if (arg === '--deployment-profile') {
      settings.deploymentProfile = argv[index + 1] ?? settings.deploymentProfile;
      index += 1;
      continue;
    }
    if (arg === '--hosting') {
      throw new Error(
        '--hosting is retired; use --deployment-profile (standalone or cloud)',
      );
    }
    if (arg === '--service-layout') {
      settings.serviceLayout = argv[index + 1] ?? settings.serviceLayout;
      index += 1;
      continue;
    }
    if (arg === '--distributed') {
      settings.serviceLayout = 'split-services';
      continue;
    }
    if (arg === '--target') {
      settings.target = argv[index + 1] ?? settings.target;
      index += 1;
      continue;
    }
    if (arg === '--database') {
      settings.database = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--dev-env-file') {
      settings.devEnvFile = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--dry-run') {
      settings.dryRun = true;
      continue;
    }
    if (arg === '--') {
      settings.passthroughMode = true;
      continue;
    }
    if (settings.passthroughMode) {
      settings.passthrough.push(arg);
      continue;
    }
    if (!arg.startsWith('-') && LEGACY_MODES.has(arg)) {
      settings.legacyMode = arg;
      continue;
    }
    if (!arg.startsWith('-')) {
      throw new Error(
        `Unsupported positional argument: ${arg}. Use --target instead of legacy mode names.`,
      );
    }
    settings.passthrough.push(arg);
  }

  applyDatabaseSettings(settings);
  settings.mode = mapTargetToProductMode(settings.target, settings.legacyMode);
  return settings;
}

function printHelp() {
  console.log(`Usage: node scripts/claw-router-dev.mjs [options] [-- <workspace args>]

Topology-aware Claw Router dev entry. Loads configs/topology profile env via @sdkwork/app-topology.

Options:
  --deployment-profile <standalone|cloud>           Default: standalone
  --service-layout <unified-process|split-services> Default: unified-process
  --distributed                                      Alias for --service-layout split-services
  --target <browser|browser-only|desktop|plan|service>
                                                    Default: browser (integrated product server)
  --database <postgres|sqlite>                      Optional database overlay
  --dev-env-file <path>                             Optional dotenv overlay (overrides --database postgres)
  --dry-run                                         Print resolved topology only
  --help, -h

Note: --topology is retired. Use --deployment-profile and --service-layout instead.

Examples:
  pnpm dev:browser
  pnpm dev:browser:postgres:cloud
  pnpm dev:desktop
  pnpm dev:desktop:sqlite
`);
}

function main() {
  const settings = parseArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    return;
  }

  const profileId = resolveDevProfileId(settings.deploymentProfile, settings.serviceLayout);
  const { env: mergedEnv } = loadTopologyProfileForWorkspace({
    deploymentProfile: settings.deploymentProfile,
    serviceLayout: settings.serviceLayout,
    env: process.env,
    includeIamDatabase: true,
  });

  const summary = {
    repoRoot: REPO_ROOT,
    profileId,
    defaultDevProfileId: DEFAULT_DEV_PROFILE_ID,
    deploymentProfile: settings.deploymentProfile,
    serviceLayout: settings.serviceLayout,
    target: settings.target,
    database: settings.database,
    applicationPublicHttpUrl: resolveSurfaceHttpUrl(
      mergedEnv,
      'application.public-ingress',
    ),
    applicationBackendHttpUrl: resolveSurfaceHttpUrl(
      mergedEnv,
      'application.backend-http',
    ),
    applicationOpenHttpUrl: resolveSurfaceHttpUrl(mergedEnv, 'application.open-http'),
    platformApiGatewayHttpUrl: resolveGatewayBaseUrl(mergedEnv, settings.deploymentProfile),
    healthSurfaces: listHealthSurfaces(profileId),
    mode: settings.mode,
  };

  console.log('[sdkwork-clawrouter-dev] topology profile loaded');
  console.log(JSON.stringify(summary, null, 2));

  if (settings.dryRun) {
    return;
  }

  const browserApplicationEnv = ensureClawRouterBrowserDevelopmentEnv({
    workspaceRoot: REPO_ROOT,
    env: mergedEnv,
    deploymentProfile: settings.deploymentProfile,
  });
  Object.assign(mergedEnv, browserApplicationEnv.mergedEnv);

  const workspaceArgs = [
    '--deployment-profile',
    settings.deploymentProfile,
    '--service-layout',
    settings.serviceLayout,
    ...settings.passthrough,
  ];

  const applicationArgs = [settings.mode, ...workspaceArgs];
  if (settings.devEnvFile) {
    applicationArgs.unshift('--dev-env-file', settings.devEnvFile);
  }

  const child = spawn(
    process.execPath,
    [path.join(REPO_ROOT, 'scripts', 'run-claw-router-application.mjs'), ...applicationArgs],
    {
      cwd: REPO_ROOT,
      env: mergedEnv,
      stdio: 'inherit',
      shell: false,
    },
  );

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

main();
