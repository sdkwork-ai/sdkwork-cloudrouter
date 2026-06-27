#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_VERSION,
  INTERNAL_PROJECT_NAME,
  RUNTIME_DISPLAY_NAME,
  createInstallPackagePlan,
} from './plan-claw-router-install-packages.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');
const DOWNLOAD_CATALOG_SCHEMA_VERSION = '2026-05-18.sdkwork-download-catalog.v1';
const DEFAULT_DOWNLOAD_CATALOG_PATH = path.join(
  workspaceRoot,
  'apps',
  'sdkwork-clawrouter-pc',
  'packages',
  'sdkwork-clawrouter-pc-home',
  'src',
  'downloads',
  'claw-router-downloads.json',
);
const DEFAULT_RELEASE_REPOSITORY = 'https://github.com/Sdkwork-Cloud/sdkwork-clawrouter';
const DEFAULT_CHANNEL = 'stable';
const DOWNLOAD_CDN_BASE_URL_ENV = 'CLAWROUTER_DOWNLOAD_CDN_BASE_URL';
const DOWNLOAD_ARTIFACT_PLATFORMS = Object.freeze(['linux', 'windows', 'macos']);
const DOWNLOAD_ARTIFACT_ARCHITECTURES = Object.freeze(['x64', 'arm64']);
const DOWNLOAD_ARTIFACT_DEPLOYMENT_MODES = Object.freeze(['archive', 'service', 'desktop']);

function printHelp() {
  console.log(`Usage: node scripts/update-claw-router-downloads.mjs [options]

Generate or check the homepage release download JSON file.

Options:
  --check                   Fail when the checked-in JSON is stale.
  --output <path>           Output JSON path (default ${path.relative(workspaceRoot, DEFAULT_DOWNLOAD_CATALOG_PATH)}).
  --version <value>         Product release version (default ${DEFAULT_VERSION}).
  --release-tag <value>     Release tag (default v<version>).
  --release-base-url <url>  Release asset base URL (default GitHub release download URL).
  --cdn-base-url <url>      Optional CDN asset base URL; omitted by default.
  --generated-at <iso>      Deterministic generatedAt timestamp.
  --json                    Print machine-readable status.
  -h, --help                Show this help.
`);
}

function parseArgs(argv = process.argv.slice(2)) {
  const settings = {
    check: false,
    cdnBaseUrl: process.env[DOWNLOAD_CDN_BASE_URL_ENV] ?? null,
    generatedAt: null,
    help: false,
    json: false,
    output: DEFAULT_DOWNLOAD_CATALOG_PATH,
    releaseBaseUrl: null,
    releaseTag: null,
    version: DEFAULT_VERSION,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      continue;
    }
    switch (arg) {
      case '--cdn-base-url':
        settings.cdnBaseUrl = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--check':
        settings.check = true;
        break;
      case '--generated-at':
        settings.generatedAt = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--json':
        settings.json = true;
        break;
      case '--output':
        settings.output = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--release-base-url':
        settings.releaseBaseUrl = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--release-tag':
        settings.releaseTag = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--version':
        settings.version = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--help':
      case '-h':
        settings.help = true;
        break;
      default:
        throw new Error(`Unsupported downloads updater option: ${arg}`);
    }
  }

  return settings;
}

function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function normalizeVersion(version) {
  const normalized = String(version ?? '').trim();
  if (!/^[0-9A-Za-z][0-9A-Za-z._-]*$/u.test(normalized)) {
    throw new Error('version must be a non-empty package-safe value');
  }
  return normalized;
}

function normalizeReleaseTag(releaseTag, version) {
  const normalized = String(releaseTag ?? `v${version}`).trim();
  if (!/^v?[0-9A-Za-z][0-9A-Za-z._-]*$/u.test(normalized)) {
    throw new Error('release tag must be a non-empty package-safe tag');
  }
  return normalized;
}

function normalizeGeneratedAt(generatedAt, version) {
  const explicit = String(generatedAt ?? '').trim();
  if (explicit) {
    const date = new Date(explicit);
    if (!Number.isFinite(date.getTime())) {
      throw new Error('--generated-at must be a valid timestamp');
    }
    return date.toISOString();
  }

  return `${version.replace(/[^0-9A-Za-z._-]/gu, '-')}.release`;
}

function normalizeReleaseBaseUrl(releaseBaseUrl, releaseTag) {
  const fallback = `${DEFAULT_RELEASE_REPOSITORY}/releases/download/${releaseTag}`;
  const normalized = String(releaseBaseUrl ?? fallback).trim().replace(/\/+$/u, '');
  if (!normalized || normalized.includes('?') || normalized.includes('#')) {
    throw new Error('release base URL must not contain query or fragment');
  }
  if (normalized.startsWith('/')) {
    if (normalized.startsWith('//')) {
      throw new Error('release base URL must be HTTP/HTTPS or root-relative');
    }
    return normalized;
  }

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('release base URL must be HTTP/HTTPS or root-relative');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('release base URL must be HTTP/HTTPS or root-relative');
  }
  return normalized;
}

function normalizeOptionalDownloadBaseUrl(baseUrl, label) {
  const normalized = String(baseUrl ?? '').trim().replace(/\/+$/u, '');
  if (!normalized) {
    return null;
  }
  if (normalized.includes('?') || normalized.includes('#')) {
    throw new Error(`${label} must not contain query or fragment`);
  }
  if (normalized.startsWith('/')) {
    if (normalized.startsWith('//')) {
      throw new Error(`${label} must be HTTP/HTTPS or root-relative`);
    }
    return normalized || '/';
  }

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${label} must be HTTP/HTTPS or root-relative`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${label} must be HTTP/HTTPS or root-relative`);
  }
  return normalized;
}

function joinUrl(baseUrl, fileName) {
  return `${baseUrl.replace(/\/+$/u, '')}/${encodeURIComponent(fileName)}`;
}

function downloadSources(fileName, releaseBaseUrl, cdnBaseUrl) {
  if (!cdnBaseUrl) {
    return undefined;
  }

  return [
    {
      href: joinUrl(releaseBaseUrl, fileName),
      id: 'github',
      label: 'GitHub',
      primary: true,
    },
    {
      href: joinUrl(cdnBaseUrl, fileName),
      id: 'cdn',
      label: 'CDN',
    },
  ];
}

function createArtifactAction({
  action,
  cdnBaseUrl,
  fileName,
  releaseBaseUrl,
}) {
  const {
    architecture,
    ctaLabel,
    id,
    label,
    platform,
    releaseTag,
    version,
  } = action;
  const sources = downloadSources(fileName, releaseBaseUrl, cdnBaseUrl);

  return {
    ...(architecture ? { architecture } : {}),
    ...(ctaLabel ? { ctaLabel } : {}),
    fileName,
    href: joinUrl(releaseBaseUrl, fileName),
    id,
    label,
    platform,
    releaseTag,
    version,
    ...(sources ? { sources } : {}),
  };
}

function desktopPackageActions(packages, releaseBaseUrl, releaseTag, cdnBaseUrl) {
  return packages
    .filter((packageItem) => packageItem.deploymentMode === 'desktop')
    .map((packageItem) => createArtifactAction({
      action: {
        architecture: packageItem.architecture,
        id: `desktop-${packageItem.platform}-${packageItem.architecture}`,
        label: `${platformLabel(packageItem.platform)} ${packageItem.architecture}`,
        platform: packageItem.platform,
        releaseTag,
        version: packageItem.version,
      },
      cdnBaseUrl,
      fileName: nativeInstallerFileName(packageItem),
      releaseBaseUrl,
    }));
}

function serverPackageActions(packages, releaseBaseUrl, releaseTag, cdnBaseUrl) {
  const serverPackages = packages.filter((packageItem) => ['linux', 'windows', 'macos'].includes(packageItem.platform));
  const serviceActions = serverPackages
    .filter((packageItem) => packageItem.deploymentMode === 'service')
    .map((packageItem) => createArtifactAction({
      action: {
        architecture: packageItem.architecture,
        ...(packageItem.platform === 'linux' && packageItem.architecture === 'x64' ? { ctaLabel: 'Get Server Edition' } : {}),
        id: `server-${packageItem.platform}-${packageItem.architecture}`,
        label: `${platformLabel(packageItem.platform)} ${packageItem.architecture} Service`,
        platform: packageItem.platform,
        releaseTag,
        version: packageItem.version,
      },
      cdnBaseUrl,
      fileName: nativeInstallerFileName(packageItem),
      releaseBaseUrl,
    }));
  const archiveActions = serverPackages
    .filter((packageItem) => packageItem.deploymentMode === 'archive')
    .map((packageItem) => createArtifactAction({
      action: {
        architecture: packageItem.architecture,
        id: `server-${packageItem.platform}-archive-${packageItem.architecture}`,
        label: `${platformLabel(packageItem.platform)} ${packageItem.architecture} ${packageItem.platform === 'windows' ? 'Zip' : 'Tarball'}`,
        platform: packageItem.platform,
        releaseTag,
        version: packageItem.version,
      },
      cdnBaseUrl,
      fileName: packageItem.archiveName,
      releaseBaseUrl,
    }));

  return [
    ...serviceActions,
    ...archiveActions,
    {
      disabled: true,
      href: '',
      id: 'server-docker',
      label: 'Docker Image',
      platform: 'docker',
      unavailableLabel: 'Docker Image coming soon',
    },
    {
      disabled: true,
      href: '',
      id: 'server-helm',
      label: 'Helm Chart',
      platform: 'helm',
      unavailableLabel: 'Helm Chart coming soon',
    },
  ];
}

function mobilePackageActions() {
  return [
    {
      disabled: true,
      href: '',
      id: 'mobile-ios',
      label: 'iOS',
      platform: 'ios',
      unavailableLabel: 'iOS coming soon',
    },
    {
      disabled: true,
      href: '',
      id: 'mobile-android',
      label: 'Android',
      platform: 'android',
      unavailableLabel: 'Android coming soon',
    },
  ];
}

function platformLabel(platform) {
  if (platform === 'macos') {
    return 'macOS';
  }
  if (platform === 'windows') {
    return 'Windows';
  }
  if (platform === 'linux') {
    return 'Linux';
  }
  return platform;
}

function nativeInstallerFileName(packageItem) {
  if (packageItem.platform === 'linux') {
    return packageItem.archiveName.replace(/\.(zip|tar\.gz)$/u, '.deb');
  }
  if (packageItem.platform === 'macos') {
    return packageItem.archiveName.replace(/\.(zip|tar\.gz)$/u, '.pkg');
  }
  if (packageItem.platform === 'windows') {
    return packageItem.archiveName.replace(/\.(zip|tar\.gz)$/u, '.msi');
  }
  throw new Error(`Unsupported native installer platform: ${packageItem.platform}`);
}

function stableSortActions(actions) {
  const platformOrder = new Map([
    ['macos', 0],
    ['windows', 1],
    ['linux', 2],
    ['docker', 3],
    ['helm', 4],
    ['ios', 5],
    ['android', 6],
  ]);
  const architectureOrder = new Map([
    ['x64', 0],
    ['arm64', 1],
  ]);

  return [...actions].sort((left, right) => {
    const platformDelta = (platformOrder.get(left.platform) ?? 99) - (platformOrder.get(right.platform) ?? 99);
    if (platformDelta !== 0) {
      return platformDelta;
    }
    const architectureDelta = (architectureOrder.get(left.architecture) ?? 99) - (architectureOrder.get(right.architecture) ?? 99);
    if (architectureDelta !== 0) {
      return architectureDelta;
    }
    return left.id.localeCompare(right.id);
  });
}

function createClawRouterDownloadCatalog({
  cdnBaseUrl = null,
  generatedAt = null,
  releaseBaseUrl = null,
  releaseTag = null,
  version = DEFAULT_VERSION,
} = {}) {
  const normalizedVersion = normalizeVersion(version);
  const normalizedReleaseTag = normalizeReleaseTag(releaseTag, normalizedVersion);
  const normalizedReleaseBaseUrl = normalizeReleaseBaseUrl(releaseBaseUrl, normalizedReleaseTag);
  const normalizedCdnBaseUrl = normalizeOptionalDownloadBaseUrl(cdnBaseUrl, 'CDN base URL');
  const plan = createInstallPackagePlan({
    version: normalizedVersion,
    platforms: [...DOWNLOAD_ARTIFACT_PLATFORMS],
    architectures: [...DOWNLOAD_ARTIFACT_ARCHITECTURES],
    deploymentModes: [...DOWNLOAD_ARTIFACT_DEPLOYMENT_MODES],
  });
  const packages = plan.packages;

  return {
    schemaVersion: DOWNLOAD_CATALOG_SCHEMA_VERSION,
    generatedAt: normalizeGeneratedAt(generatedAt, normalizedVersion),
    product: {
      id: INTERNAL_PROJECT_NAME,
      name: RUNTIME_DISPLAY_NAME,
      version: normalizedVersion,
      releaseTag: normalizedReleaseTag,
      releaseUrl: `${DEFAULT_RELEASE_REPOSITORY}/releases/tag/${normalizedReleaseTag}`,
      channel: DEFAULT_CHANNEL,
    },
    cards: [
      {
        actions: stableSortActions(desktopPackageActions(packages, normalizedReleaseBaseUrl, normalizedReleaseTag, normalizedCdnBaseUrl)),
        description: 'For developers and local environments. Includes a full graphical interface, visual API building, integrated Playground, and one-click app testing.',
        icon: 'desktop',
        id: 'claw-router-desktop',
        kind: 'desktop',
        primaryActionStrategy: 'detected-platform',
        title: 'Claw Router Desktop',
        tone: 'brand',
      },
      {
        actions: stableSortActions(serverPackageActions(packages, normalizedReleaseBaseUrl, normalizedReleaseTag, normalizedCdnBaseUrl)),
        description: 'For production deployments. Optimized for headless execution, extreme throughput, containerization (Docker), and large-scale enterprise routing.',
        icon: 'server',
        id: 'claw-router-server',
        kind: 'server',
        primaryActionId: 'server-linux-x64',
        title: 'Claw Router Server',
        tone: 'server',
      },
      {
        actions: stableSortActions(mobilePackageActions()),
        description: 'Track routing health, account activity, and model usage from a mobile companion built for operators and builders.',
        icon: 'mobile',
        id: 'claw-router-mobile',
        kind: 'mobile',
        primaryActionStrategy: 'detected-platform',
        title: 'Claw Router Mobile',
        tone: 'mobile',
      },
    ],
  };
}

function serializeCatalog(catalog) {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

async function updateDownloadCatalogFile({
  check = false,
  cdnBaseUrl = null,
  generatedAt = null,
  output = DEFAULT_DOWNLOAD_CATALOG_PATH,
  releaseBaseUrl = null,
  releaseTag = null,
  version = DEFAULT_VERSION,
} = {}) {
  const catalog = createClawRouterDownloadCatalog({
    cdnBaseUrl,
    generatedAt,
    releaseBaseUrl,
    releaseTag,
    version,
  });
  const content = serializeCatalog(catalog);
  const outputPath = path.resolve(workspaceRoot, output);

  if (check) {
    let existing = '';
    try {
      existing = await readFile(outputPath, 'utf8');
    } catch {
      return {
        catalog,
        changed: true,
        ok: false,
        outputPath,
      };
    }

    return {
      catalog,
      changed: existing !== content,
      ok: existing === content,
      outputPath,
    };
  }

  await writeFile(outputPath, content, 'utf8');
  return {
    catalog,
    changed: true,
    ok: true,
    outputPath,
  };
}

async function main(argv = process.argv.slice(2)) {
  const settings = parseArgs(argv);
  if (settings.help) {
    printHelp();
    return 0;
  }

  const result = await updateDownloadCatalogFile(settings);
  if (settings.json) {
    console.log(JSON.stringify({
      ok: result.ok,
      changed: result.changed,
      outputPath: result.outputPath,
      version: result.catalog.product.version,
      releaseTag: result.catalog.product.releaseTag,
      sourceKinds: [...new Set(result.catalog.cards.flatMap((card) =>
        card.actions.flatMap((action) => action.sources?.map((source) => source.id) ?? ['github'])
      ))],
      actionCount: result.catalog.cards.flatMap((card) => card.actions).length,
    }, null, 2));
  } else if (settings.check) {
    if (result.ok) {
      console.log(`[downloads] up to date: ${path.relative(workspaceRoot, result.outputPath)}`);
    } else {
      console.error(`[downloads] stale: ${path.relative(workspaceRoot, result.outputPath)}`);
      console.error('[downloads] run: pnpm downloads:update');
    }
  } else {
    console.log(`[downloads] written: ${path.relative(workspaceRoot, result.outputPath)}`);
  }

  return result.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    console.error(`[downloads] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

export {
  DEFAULT_DOWNLOAD_CATALOG_PATH,
  DOWNLOAD_CATALOG_SCHEMA_VERSION,
  createClawRouterDownloadCatalog,
  main,
  normalizeOptionalDownloadBaseUrl,
  normalizeReleaseBaseUrl,
  parseArgs,
  serializeCatalog,
  updateDownloadCatalogFile,
};
