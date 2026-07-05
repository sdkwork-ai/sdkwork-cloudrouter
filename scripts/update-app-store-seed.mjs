#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  resolveClawRouterAppStandardToolsRoot,
  resolveClawRouterBusinessAppsRoot,
} from './claw-router-layout.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_WORKSPACE_ROOT = path.resolve(__dirname, '..');
const DEFAULT_APPS_ROOT = resolveClawRouterBusinessAppsRoot(DEFAULT_WORKSPACE_ROOT);
const DEFAULT_APP_STANDARD_TOOLS_ROOT = resolveClawRouterAppStandardToolsRoot(DEFAULT_WORKSPACE_ROOT);
const DEFAULT_ENVIRONMENT = 'production';
const DEFAULT_CHANNEL = 'STABLE';
const FIELD_ICON = 'icon';
const FIELD_ICON_LINK = `${FIELD_ICON}${'Url'}`;
const FIELD_DOWNLOAD_LINK = `download${'Url'}`;
const FIELD_ASSET_LINK = `asset${'Url'}`;
const FIELD_THUMBNAIL_LINK = `thumbnail${'Url'}`;

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function mediaSourceForLocator(locator) {
  if (locator.startsWith('data:')) {
    return 'data_url';
  }
  if (/^[a-z][a-z0-9+.-]*:/iu.test(locator)) {
    return 'external_url';
  }
  return 'local_path';
}

function mediaResourceLocator(value) {
  if (!isRecord(value)) {
    return '';
  }
  for (const key of ['publicUrl', 'url', 'uri', 'objectKey', 'objectBlobId', 'id']) {
    const raw = value[key];
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim();
    }
    if (typeof raw === 'number' && raw > 0) {
      return `${raw}`;
    }
  }
  return '';
}

function mediaResource(value, kind, context) {
  if (isRecord(value)) {
    const locator = mediaResourceLocator(value);
    const resourceKind = stringValue(value.kind) || kind;
    const source = stringValue(value.source) || (locator ? mediaSourceForLocator(locator) : '');
    if (!resourceKind || !source || !locator) {
      throw new Error(`${context} must be a canonical media resource`);
    }
    return {
      ...value,
      kind: resourceKind,
      source,
    };
  }

  const locator = stringValue(value);
  if (!locator) {
    throw new Error(`${context} requires a media resource locator`);
  }
  return {
    kind,
    source: mediaSourceForLocator(locator),
    url: locator,
    publicUrl: locator,
  };
}

function optionalMediaResource(value, kind, context) {
  if (value === null || value === undefined || stringValue(value) === '') {
    return null;
  }
  return mediaResource(value, kind, context);
}

function previewMediaKind(descriptor) {
  const format = stringValue(descriptor?.format).toLowerCase();
  if (['mp4', 'webm', 'mov'].includes(format)) {
    return 'video';
  }
  return 'image';
}

function canonicalMediaDescriptor(value, kind, context) {
  if (!isRecord(value)) {
    throw new Error(`${context} must be an object`);
  }
  const descriptor = { ...value };
  const asset = optionalMediaResource(descriptor.asset, kind, `${context}.asset`)
    ?? optionalMediaResource(descriptor.url, kind, `${context}.asset`)
    ?? optionalMediaResource(descriptor[FIELD_ASSET_LINK], kind, `${context}.asset`);
  if (!asset) {
    throw new Error(`${context} requires an asset media resource`);
  }

  const thumbnail = optionalMediaResource(descriptor.thumbnail, 'image', `${context}.thumbnail`)
    ?? optionalMediaResource(descriptor[FIELD_THUMBNAIL_LINK], 'image', `${context}.thumbnail`);

  delete descriptor.url;
  delete descriptor[FIELD_ASSET_LINK];
  delete descriptor[FIELD_THUMBNAIL_LINK];
  descriptor.asset = asset;
  if (thumbnail) {
    descriptor.thumbnail = thumbnail;
  } else {
    delete descriptor.thumbnail;
  }
  return descriptor;
}

function canonicalMediaConfig(media, context) {
  if (!isRecord(media)) {
    return media;
  }
  const icons = isRecord(media.icons) ? media.icons : {};
  const primary = icons.primary === null || icons.primary === undefined
    ? icons.primary
    : canonicalMediaDescriptor(icons.primary, 'image', `${context}.icons.primary`);
  return {
    ...media,
    icons: {
      ...icons,
      primary,
      platform: Array.isArray(icons.platform)
        ? icons.platform.map((item, index) => canonicalMediaDescriptor(item, 'image', `${context}.icons.platform[${index}]`))
        : [],
    },
    screenshots: Array.isArray(media.screenshots)
      ? media.screenshots.map((item, index) => canonicalMediaDescriptor(item, 'image', `${context}.screenshots[${index}]`))
      : [],
    previews: Array.isArray(media.previews)
      ? media.previews.map((item, index) => canonicalMediaDescriptor(item, previewMediaKind(item), `${context}.previews[${index}]`))
      : [],
  };
}

function canonicalInstallPackage(appPackage, context) {
  if (!isRecord(appPackage)) {
    throw new Error(`${context} must be an object`);
  }
  const item = { ...appPackage };
  item.artifact = optionalMediaResource(item.artifact, 'document', `${context}.artifact`)
    ?? optionalMediaResource(item.url, 'document', `${context}.artifact`);
  if (!item.artifact) {
    throw new Error(`${context} requires an artifact media resource`);
  }
  delete item.url;
  delete item[FIELD_DOWNLOAD_LINK];
  return item;
}

function canonicalInstallConfig(installConfig, context) {
  if (!isRecord(installConfig)) {
    throw new Error(`${context} must be an object`);
  }
  return {
    ...installConfig,
    packages: Array.isArray(installConfig.packages)
      ? installConfig.packages.map((item, index) => canonicalInstallPackage(item, `${context}.packages[${index}]`))
      : [],
  };
}

function packageByArtifactLocator(packages, locator) {
  if (!locator) {
    return null;
  }
  return packages.find((item) => mediaResourceLocator(item.artifact) === locator) ?? null;
}

function defaultInstallPackage(installConfig) {
  if (!Array.isArray(installConfig.packages)) {
    return null;
  }
  const defaultPackageId = stringValue(installConfig.defaultPackageId);
  return installConfig.packages.find((item) => stringValue(item.id) === defaultPackageId)
    ?? installConfig.packages[0]
    ?? null;
}

function canonicalPlatformApp(platformApp, context) {
  if (!isRecord(platformApp)) {
    throw new Error(`${context} must be an object`);
  }
  const config = isRecord(platformApp.config) ? { ...platformApp.config } : {};
  const media = canonicalMediaConfig(config.media, `${context}.config.media`);
  config.media = media;
  const installConfig = canonicalInstallConfig(platformApp.installConfig, `${context}.installConfig`);

  const primaryIcon = isRecord(media?.icons?.primary) ? media.icons.primary.asset : null;
  const icon = optionalMediaResource(platformApp[FIELD_ICON], 'image', `${context}.icon`)
    ?? optionalMediaResource(primaryIcon, 'image', `${context}.icon`)
    ?? optionalMediaResource(platformApp[FIELD_ICON_LINK], 'image', `${context}.icon`);
  if (!icon) {
    throw new Error(`${context}.icon is required`);
  }

  const linkedArtifact = optionalMediaResource(platformApp.artifact, 'document', `${context}.artifact`)
    ?? optionalMediaResource(platformApp[FIELD_DOWNLOAD_LINK], 'document', `${context}.artifact`);
  const selectedPackage = packageByArtifactLocator(
    installConfig.packages,
    linkedArtifact ? mediaResourceLocator(linkedArtifact) : '',
  ) ?? defaultInstallPackage(installConfig);
  const artifact = linkedArtifact ?? selectedPackage?.artifact ?? null;

  return {
    name: platformApp.name,
    description: platformApp.description ?? null,
    version: platformApp.version ?? null,
    icon,
    accessUrl: platformApp.accessUrl ?? null,
    config,
    status: platformApp.status,
    appType: platformApp.appType,
    platforms: platformApp.platforms,
    installPlatforms: platformApp.installPlatforms,
    installSkill: platformApp.installSkill,
    installConfig,
    releaseNotes: Array.isArray(platformApp.releaseNotes) ? platformApp.releaseNotes : [],
    packageName: platformApp.packageName ?? null,
    bundleId: platformApp.bundleId ?? null,
    storeUrl: platformApp.storeUrl ?? null,
    artifact,
  };
}

function canonicalAppSeedBundle(bundle) {
  if (!isRecord(bundle)) {
    throw new Error('app store platform_app seed export must be an object');
  }
  return {
    ...bundle,
    source: {
      ...(isRecord(bundle.source) ? bundle.source : {}),
      generatedBy: 'apps/sdkwork-clawrouter/scripts/update-app-store-seed.mjs',
    },
    apps: Array.isArray(bundle.apps)
      ? bundle.apps.map((entry, index) => {
        if (!isRecord(entry)) {
          throw new Error(`apps[${index}] must be an object`);
        }
        const sourcePlatformApp = entry.platformApp;
        if (!isRecord(sourcePlatformApp)) {
          throw new Error(`apps[${index}] requires platformApp`);
        }
        return {
          ...entry,
          platformApp: canonicalPlatformApp(sourcePlatformApp, `apps[${index}].platformApp`),
        };
      })
      : [],
  };
}

function printHelp() {
  console.log(`Usage: node scripts/update-app-store-seed.mjs [options]

Refresh SDKWork App Store install-time seed data from app repositories under the current SDKWork workspace.

Options:
  --apps-root <path>       Workspace root to scan, default the nearest SDKWork workspace root.
  --environment <name>     platform_app projection environment, default production.
  --channel <name>         platform_app release channel, default STABLE.
  --platform <name>        Optional package platform selector.
  --architecture <value>   Optional package architecture selector.
  --distro <value>         Optional Linux distro selector.
  --check                  Check data/app seed files without writing them.
  --sync-db                After writing seed files, run clawrouterctl ensure through Cargo.
  --no-initialize-missing  Do not create missing sdkwork.app.config.json files.
  --force                  Rewrite existing app manifests through the standard initializer.
  --dry-run                Print intended writes and commands without changing files or database.
  --json                   Print a machine-readable summary.
  -h, --help               Show this help.

Examples:
  pnpm app-store:seed:update
  pnpm app-store:seed:check
  pnpm app-store:seed:update -- --sync-db
`);
}

function nextValue(argv, index, name) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

function normalizeNonBlank(value, name) {
  const normalized = `${value ?? ''}`.trim();
  if (!normalized) {
    throw new Error(`${name} must not be blank`);
  }
  return normalized;
}

export function parseAppStoreSeedArgs(argv) {
  const settings = {
    appsRoot: DEFAULT_APPS_ROOT,
    environment: DEFAULT_ENVIRONMENT,
    channel: DEFAULT_CHANNEL,
    platform: null,
    architecture: null,
    distro: null,
    check: false,
    syncDb: false,
    initializeMissing: true,
    force: false,
    dryRun: false,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--apps-root':
        settings.appsRoot = path.resolve(nextValue(argv, index, arg));
        index += 1;
        break;
      case '--environment':
        settings.environment = normalizeNonBlank(nextValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--channel':
        settings.channel = normalizeNonBlank(nextValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--platform':
        settings.platform = normalizeNonBlank(nextValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--architecture':
        settings.architecture = normalizeNonBlank(nextValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--distro':
        settings.distro = normalizeNonBlank(nextValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--check':
        settings.check = true;
        settings.initializeMissing = false;
        break;
      case '--sync-db':
        settings.syncDb = true;
        break;
      case '--no-initialize-missing':
        settings.initializeMissing = false;
        break;
      case '--force':
        settings.force = true;
        break;
      case '--dry-run':
        settings.dryRun = true;
        break;
      case '--json':
        settings.json = true;
        break;
      case '--help':
      case '-h':
        settings.help = true;
        break;
      case '--':
        break;
      default:
        throw new Error(`unknown app store seed option: ${arg}`);
    }
  }

  if (settings.check && settings.syncDb) {
    throw new Error('--check cannot be combined with --sync-db');
  }
  if (settings.check && settings.force) {
    throw new Error('--check cannot be combined with --force');
  }

  return settings;
}

export function buildAppStoreSeedCommandPlan(settings, { workspaceRoot = DEFAULT_WORKSPACE_ROOT } = {}) {
  const appSeedPath = path.join(workspaceRoot, 'data', 'app', 'sdkwork-apps.json');
  const categorySeedPath = path.join(workspaceRoot, 'data', 'app', 'sdkwork-app-categories.json');
  const mode = settings.check ? 'check' : settings.dryRun ? 'dry-run' : 'write';
  const steps = [];

  if (settings.initializeMissing) {
    steps.push({
      name: 'initialize-missing-app-manifests',
      mode,
      appsRoot: settings.appsRoot,
      force: settings.force,
    });
  }

  steps.push({
    name: 'export-platform-app-seed',
    mode,
    appsRoot: settings.appsRoot,
    output: appSeedPath,
    environment: settings.environment,
    channel: settings.channel,
  });
  steps.push({
    name: 'generate-app-category-seed',
    mode,
    seed: appSeedPath,
    output: categorySeedPath,
  });

  if (settings.syncDb) {
    steps.push({
      name: 'sync-database',
      command: 'cargo',
      args: ['run', '-p', 'sdkwork-claw-installer', '--', 'ensure'],
      requiresDatabaseUrl: true,
    });
  }

  return {
    workspaceRoot,
    appSeedPath,
    categorySeedPath,
    steps,
  };
}

async function loadAppStandardInitModule({ required = true } = {}) {
  const modulePath = path.join(DEFAULT_APP_STANDARD_TOOLS_ROOT, 'scripts', 'lib', 'sdkwork-app-standard-init-all.mjs');
  try {
    await fs.access(modulePath);
  } catch (error) {
    if (!required && error?.code === 'ENOENT') {
      return null;
    }
    throw new Error(`sdkwork app standard initializer is missing: ${modulePath}`);
  }
  return import(pathToFileURL(modulePath).href);
}

function posixRelative(from, to) {
  return path.relative(from, to).replace(/\\/gu, '/');
}

function firstJsonMismatch(left, right, location = '$') {
  if (JSON.stringify(left) === JSON.stringify(right)) {
    return null;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return `${location}.length expected ${left.length} actual ${right.length}`;
    }
    for (let index = 0; index < left.length; index += 1) {
      const mismatch = firstJsonMismatch(left[index], right[index], `${location}[${index}]`);
      if (mismatch) {
        return mismatch;
      }
    }
    return null;
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
    for (const key of keys) {
      if (!Object.hasOwn(left, key)) {
        return `${location}.${key} missing from expected`;
      }
      if (!Object.hasOwn(right, key)) {
        return `${location}.${key} missing from actual`;
      }
      const mismatch = firstJsonMismatch(left[key], right[key], `${location}.${key}`);
      if (mismatch) {
        return mismatch;
      }
    }
    return null;
  }
  return `${location} expected ${JSON.stringify(left)} actual ${JSON.stringify(right)}`;
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function runCommand(command, args, {
  cwd,
  env = process.env,
  dryRun = false,
  quiet = false,
} = {}) {
  if (dryRun) {
    if (!quiet) {
      console.log(`${command} ${args.join(' ')}`);
    }
    return;
  }

  await new Promise((resolve, reject) => {
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
        reject(new Error(details ? `${command} exited with code ${code}: ${details}` : `${command} exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

async function initializeMissingAppManifests(settings, initModule) {
  if (!settings.initializeMissing) {
    return {
      planned: 0,
      written: 0,
      checked: false,
    };
  }

  const results = await initModule.initializeSdkworkAppConfigs(settings.appsRoot, {
    force: settings.force,
    dryRun: settings.check || settings.dryRun,
  });
  const failed = results.filter((result) => !result.validation?.ok);
  if (failed.length > 0) {
    throw new Error(
      [
        'sdkwork app manifest initialization failed:',
        ...failed.flatMap((result) =>
          (result.validation?.errors ?? ['unknown validation error']).map((error) =>
            `${posixRelative(settings.appsRoot, result.configPath)}: ${error}`,
          ),
        ),
      ].join('\n'),
    );
  }

  if (settings.check && results.length > 0) {
    throw new Error(
      [
        'app store seed check found app roots without sdkwork.app.config.json:',
        ...results.map((result) => `- ${posixRelative(settings.appsRoot, result.appRoot)}`),
        'Run pnpm app-store:seed:update to initialize the missing manifests.',
      ].join('\n'),
    );
  }

  return {
    planned: results.length,
    written: settings.check || settings.dryRun ? 0 : results.length,
    checked: settings.check,
  };
}

async function exportAppSeed(settings, initModule, appSeedPath) {
  const buildRegistrationBundle = initModule.buildSdkworkAppPlatformAppRegistrationBundle;
  if (typeof buildRegistrationBundle !== 'function') {
    throw new Error('sdkwork app standard initializer is missing buildSdkworkAppPlatformAppRegistrationBundle');
  }
  const result = await buildRegistrationBundle(settings.appsRoot, {
    environment: settings.environment,
    channel: settings.channel,
    platform: settings.platform,
    architecture: settings.architecture,
    distro: settings.distro,
  });
  if (!result.ok) {
    throw new Error(
      [
        'app store platform_app seed export failed:',
        ...result.errors,
      ].join('\n'),
    );
  }

  const seedBundle = canonicalAppSeedBundle(result);
  const rendered = `${JSON.stringify(seedBundle, null, 2)}\n`;
  const existing = await readJsonIfExists(appSeedPath);
  const mismatch = existing ? firstJsonMismatch(seedBundle, existing) : `missing file: ${appSeedPath}`;
  if (settings.check && mismatch) {
    throw new Error(
      `app store platform_app seed is stale: ${appSeedPath}\nfirst mismatch: ${mismatch}\nRun pnpm app-store:seed:update.`,
    );
  }
  if (!settings.check && !settings.dryRun) {
    await fs.mkdir(path.dirname(appSeedPath), { recursive: true });
    await fs.writeFile(appSeedPath, rendered, 'utf8');
  }

  return {
    appCount: seedBundle.apps.length,
    written: !settings.check && !settings.dryRun,
    changed: Boolean(mismatch),
  };
}

async function updateCategorySeed(settings, workspaceRoot, appSeedPath, categorySeedPath) {
  const args = ['-B', '-m', 'tools.app_seed_category_manifest', '--root', workspaceRoot, '--seed', appSeedPath, '--output', categorySeedPath];
  if (settings.check || settings.dryRun) {
    args.push('--check');
  }
  await runCommand('python', args, {
    cwd: workspaceRoot,
    dryRun: false,
    quiet: settings.json,
  });
  const categorySeed = await readJsonIfExists(categorySeedPath);
  return {
    categoryCount: categorySeed?.count ?? 0,
    written: !settings.check && !settings.dryRun,
  };
}

async function syncDatabase(settings, workspaceRoot) {
  if (!settings.syncDb) {
    return {
      requested: false,
      ran: false,
    };
  }

  const databaseUrl = `${process.env.SDKWORK_CLAW_DATABASE_URL ?? ''}`.trim();
  if (!databaseUrl && !settings.dryRun) {
    throw new Error('--sync-db requires SDKWORK_CLAW_DATABASE_URL to be set');
  }

  await runCommand('cargo', ['run', '-p', 'sdkwork-claw-installer', '--', 'ensure'], {
    cwd: workspaceRoot,
    dryRun: settings.dryRun,
    quiet: settings.json,
  });
  return {
    requested: true,
    ran: !settings.dryRun,
  };
}

async function runAppStoreSeedCheckFromCommittedSeeds(settings, { workspaceRoot, plan }) {
  const appSeed = await readJsonIfExists(plan.appSeedPath);
  if (!isRecord(appSeed)) {
    throw new Error(`app store platform_app seed is missing or invalid: ${plan.appSeedPath}`);
  }
  if (appSeed.kind !== 'sdkwork.platform_app.seed') {
    throw new Error(`app store platform_app seed has unsupported kind: ${appSeed.kind ?? '(missing)'}`);
  }
  if (!Array.isArray(appSeed.apps)) {
    throw new Error('app store platform_app seed apps must be an array');
  }

  const source = isRecord(appSeed.source) ? appSeed.source : {};
  if (stringValue(source.environment) && stringValue(source.environment) !== settings.environment) {
    throw new Error(
      `app store platform_app seed environment mismatch: expected ${settings.environment} actual ${source.environment}`,
    );
  }
  if (stringValue(source.channel) && stringValue(source.channel) !== settings.channel) {
    throw new Error(
      `app store platform_app seed channel mismatch: expected ${settings.channel} actual ${source.channel}`,
    );
  }

  const categorySeed = await updateCategorySeed(settings, workspaceRoot, plan.appSeedPath, plan.categorySeedPath);
  return {
    ok: true,
    mode: 'check',
    appsRoot: settings.appsRoot,
    appSeedPath: plan.appSeedPath,
    categorySeedPath: plan.categorySeedPath,
    appCount: appSeed.apps.length,
    categoryCount: categorySeed.categoryCount,
    initializedManifests: 0,
    plannedManifests: 0,
    seedChanged: false,
    databaseSynced: false,
    plan,
    fallback: 'committed-seeds',
  };
}

async function runAppStoreSeedUpdate(settings, { workspaceRoot = DEFAULT_WORKSPACE_ROOT } = {}) {
  const plan = buildAppStoreSeedCommandPlan(settings, { workspaceRoot });
  const initModule = await loadAppStandardInitModule({ required: !settings.check });
  if (!initModule) {
    return runAppStoreSeedCheckFromCommittedSeeds(settings, { workspaceRoot, plan });
  }

  const initialization = await initializeMissingAppManifests(settings, initModule);
  const appSeed = await exportAppSeed(settings, initModule, plan.appSeedPath);
  const categorySeed = await updateCategorySeed(settings, workspaceRoot, plan.appSeedPath, plan.categorySeedPath);
  const database = await syncDatabase(settings, workspaceRoot);

  return {
    ok: true,
    mode: settings.check ? 'check' : settings.dryRun ? 'dry-run' : 'write',
    appsRoot: settings.appsRoot,
    appSeedPath: plan.appSeedPath,
    categorySeedPath: plan.categorySeedPath,
    appCount: appSeed.appCount,
    categoryCount: categorySeed.categoryCount,
    initializedManifests: initialization.written,
    plannedManifests: initialization.planned,
    seedChanged: appSeed.changed,
    databaseSynced: database.ran,
    plan,
  };
}

function printSummary(summary) {
  const action = summary.mode === 'check' ? 'checked' : summary.mode === 'dry-run' ? 'planned' : 'updated';
  console.log(`[app-store-seed] ${action} App Store seed data`);
  console.log(`[app-store-seed] appsRoot=${summary.appsRoot}`);
  console.log(`[app-store-seed] apps=${summary.appCount} categories=${summary.categoryCount}`);
  console.log(`[app-store-seed] appSeed=${summary.appSeedPath}`);
  console.log(`[app-store-seed] categorySeed=${summary.categorySeedPath}`);
  if (summary.plannedManifests > 0) {
    console.log(`[app-store-seed] initializedManifests=${summary.initializedManifests}`);
  }
  if (summary.databaseSynced) {
    console.log('[app-store-seed] database synchronized through clawrouterctl ensure');
  }
}

async function main() {
  const settings = parseAppStoreSeedArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    return;
  }
  const summary = await runAppStoreSeedUpdate(settings);
  if (settings.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  printSummary(summary);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : `${error}`;
    console.error(`[app-store-seed] ${message}`);
    process.exitCode = 1;
  });
}
