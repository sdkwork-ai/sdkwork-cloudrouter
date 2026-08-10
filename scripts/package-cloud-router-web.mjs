#!/usr/bin/env node

// Packages the Cloud Router cloud web bundle into a release ZIP artifact for
// one lifecycle environment (test | production). The artifact is
// environment-neutral: per-environment API origins are supplied by the deploy
// host through /runtime-env.js (PORTAL_PUBLIC_*).
//
// Usage:
//   node scripts/package-cloud-router-web.mjs [--environment <test|production>]
//     [--version <version>] [--source-root <dir>] [--output-dir <dir>] [--dry-run]

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { createZip } from './archive-cloud-router-sdks.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const SUPPORTED_ENVIRONMENTS = ['test', 'production'];
const DEFAULT_SOURCE_ROOT = path.join('dist', 'cloud-web');
const DEFAULT_OUTPUT_DIR = path.join('dist', 'install-packages');
const AGGREGATE_MANIFEST_FILE = 'install-packages-manifest.json';
const WEB_BUNDLE_MANIFEST_SCHEMA_VERSION = '2026-08-10.cloud-web-bundle.v1';

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
    sourceRoot: undefined,
    outputDir: undefined,
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
      case '--source-root':
        settings.sourceRoot = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--output-dir':
        settings.outputDir = requireValue(argv, index, arg);
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
  settings.version = settings.version ?? process.env.SDKWORK_PACKAGE_VERSION;
  if (!settings.version) {
    throw new Error('--version is required (or set SDKWORK_PACKAGE_VERSION)');
  }
  settings.sourceRoot = settings.sourceRoot
    ? path.resolve(REPO_ROOT, settings.sourceRoot)
    : path.resolve(REPO_ROOT, DEFAULT_SOURCE_ROOT, settings.environment);
  settings.outputDir = settings.outputDir
    ? path.resolve(REPO_ROOT, settings.outputDir)
    : path.resolve(REPO_ROOT, DEFAULT_OUTPUT_DIR);
  return settings;
}

function printHelp() {
  console.log(`Usage: node scripts/package-cloud-router-web.mjs [options]

Packages the Cloud Router cloud web bundle into dist/install-packages.

Options:
  --environment <test|production>  Lifecycle environment (default production)
  --version <version>              Release version (default $env:SDKWORK_PACKAGE_VERSION)
  --source-root <dir>              Bundle source root (default dist/cloud-web/<environment>)
  --output-dir <dir>               Output directory (default dist/install-packages)
  --dry-run                        Print the resolved package plan without writing
  -h, --help                       Show this help
`);
}

function walkDirectory(dir, root, entries, usedPaths) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.relative(root, absolutePath).replaceAll(path.sep, '/');
    if (entry.isDirectory()) {
      walkDirectory(absolutePath, root, entries, usedPaths);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (usedPaths.has(relativePath)) {
      throw new Error(`duplicate web bundle archive path: ${relativePath}`);
    }
    usedPaths.add(relativePath);
    entries.push({
      relativePath,
      data: readFileSync(absolutePath),
      sourcePath: absolutePath,
    });
  }
}

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

function archiveNameFor(environment, version) {
  return environment === 'test'
    ? `cloudrouter-web-test-${version}.zip`
    : `cloudrouter-web-${version}.zip`;
}

async function main() {
  const settings = parseArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    return;
  }

  const archiveName = archiveNameFor(settings.environment, settings.version);
  const archivePath = path.join(settings.outputDir, archiveName);
  const manifestPath = path.join(
    settings.outputDir,
    archiveName.replace(/\.zip$/u, '.manifest.json'),
  );

  console.log(`[package-cloud-router-web] environment=${settings.environment}`);
  console.log(`[package-cloud-router-web] source=${settings.sourceRoot}`);
  console.log(`[package-cloud-router-web] archive=${archivePath}`);
  if (settings.dryRun) {
    return;
  }

  const entries = [];
  walkDirectory(settings.sourceRoot, settings.sourceRoot, entries, new Set());
  if (entries.length === 0) {
    throw new Error(`cloud web bundle source is empty: ${settings.sourceRoot}`);
  }
  if (!entries.some((entry) => entry.relativePath === 'index.html')) {
    throw new Error(`cloud web bundle source is missing index.html: ${settings.sourceRoot}`);
  }

  const zipData = createZip(entries);
  const checksums = Object.fromEntries(
    entries.map((entry) => [entry.relativePath, sha256(entry.data)]),
  );
  const manifest = {
    schemaVersion: WEB_BUNDLE_MANIFEST_SCHEMA_VERSION,
    kind: 'sdkwork.cloud-web-bundle',
    application: 'sdkwork-cloudrouter',
    environment: settings.environment,
    version: settings.version,
    archiveName,
    fileCount: entries.length,
    archiveSha256: sha256(zipData),
    checksums,
  };

  mkdirSync(settings.outputDir, { recursive: true });
  writeFileSync(archivePath, zipData);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const aggregateManifestPath = path.join(settings.outputDir, AGGREGATE_MANIFEST_FILE);
  let aggregate = { schemaVersion: '1', packages: [] };
  try {
    aggregate = JSON.parse(readFileSync(aggregateManifestPath, 'utf8'));
  } catch {
    // First package in this output directory; create the aggregate manifest.
  }
  const aggregateEntry = {
    packageId: settings.environment === 'test'
      ? 'web-universal-cloud-browser-test-zip'
      : 'web-universal-cloud-browser-zip',
    environment: settings.environment,
    version: settings.version,
    archiveName,
    archiveSha256: manifest.archiveSha256,
    manifest: path.basename(manifestPath),
  };
  aggregate.packages = [
    ...(aggregate.packages ?? []).filter((item) => item.archiveName !== archiveName),
    aggregateEntry,
  ];
  writeFileSync(aggregateManifestPath, `${JSON.stringify(aggregate, null, 2)}\n`);

  console.log(`[package-cloud-router-web] wrote ${archivePath} (${zipData.length} bytes, ${entries.length} files)`);
  console.log(`[package-cloud-router-web] wrote ${manifestPath}`);
  console.log(`[package-cloud-router-web] wrote ${aggregateManifestPath}`);
}

main().catch((error) => {
  console.error(`[package-cloud-router-web] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
