#!/usr/bin/env node

// Validates a packaged Cloud Router cloud web bundle ZIP for one lifecycle
// environment (test | production):
//   - the archive exists and contains index.html plus non-empty assets
//   - index.html injects the /runtime-env.js script (host-provided runtime env)
//   - every /assets/* and script/css reference in index.html resolves inside
//     the archive (no stale chunk references)
//
// Usage:
//   node scripts/validate-cloud-router-web-artifacts.mjs
//     [--environment <test|production>] [--version <version>]
//     [--output-dir <dir>] [--check] [--json]

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const SUPPORTED_ENVIRONMENTS = ['test', 'production'];
const DEFAULT_OUTPUT_DIR = path.join('dist', 'install-packages');
const RUNTIME_ENV_SCRIPT_PATH = '/runtime-env.js';

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
    outputDir: undefined,
    check: false,
    json: false,
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
      case '--output-dir':
        settings.outputDir = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--check':
        settings.check = true;
        break;
      case '--json':
        settings.json = true;
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
  settings.outputDir = settings.outputDir
    ? path.resolve(REPO_ROOT, settings.outputDir)
    : path.resolve(REPO_ROOT, DEFAULT_OUTPUT_DIR);
  return settings;
}

function printHelp() {
  console.log(`Usage: node scripts/validate-cloud-router-web-artifacts.mjs [options]

Validates the packaged Cloud Router cloud web bundle ZIP.

Options:
  --environment <test|production>  Lifecycle environment (default production)
  --version <version>              Release version (default $env:SDKWORK_PACKAGE_VERSION)
  --output-dir <dir>               Output directory (default dist/install-packages)
  --check                          Fail with exit code 1 on violations
  --json                           Print the validation report as JSON
  -h, --help                       Show this help
`);
}

function archiveNameFor(environment, version) {
  return environment === 'test'
    ? `cloudrouter-web-test-${version}.zip`
    : `cloudrouter-web-${version}.zip`;
}

// createZip (scripts/archive-cloud-router-sdks.mjs) writes stored (uncompressed)
// entries, so the central directory + local headers are enough to list names
// and data without a compression library.
function readZipEntries(zipData) {
  const end = zipData.length;
  let eocdOffset = -1;
  for (let offset = end - 22; offset >= Math.max(0, end - 22 - 65536); offset -= 1) {
    if (zipData.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) {
    throw new Error('invalid zip: end-of-central-directory record not found');
  }
  const entryCount = zipData.readUInt16LE(eocdOffset + 10);
  const centralOffset = zipData.readUInt32LE(eocdOffset + 16);
  const entries = new Map();
  let cursor = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (zipData.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error(`invalid zip: bad central directory header at offset ${cursor}`);
    }
    const nameLength = zipData.readUInt16LE(cursor + 28);
    const extraLength = zipData.readUInt16LE(cursor + 30);
    const commentLength = zipData.readUInt16LE(cursor + 32);
    const localOffset = zipData.readUInt32LE(cursor + 42);
    const name = zipData
      .subarray(cursor + 46, cursor + 46 + nameLength)
      .toString('utf8');
    entries.set(name, { name, localOffset });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  for (const entry of entries.values()) {
    const header = zipData.readUInt32LE(entry.localOffset);
    if (header !== 0x04034b50) {
      throw new Error(`invalid zip: bad local file header for ${entry.name}`);
    }
    const nameLength = zipData.readUInt16LE(entry.localOffset + 26);
    const dataOffset = entry.localOffset + 30 + nameLength;
    entry.data = zipData.subarray(dataOffset);
  }
  return entries;
}

function collectAssetReferences(html) {
  const references = new Set();
  const pattern = /(?:src|href)="(\/(?:assets\/[^"?#]+|[^"?#]+\.(?:js|css)))"/gu;
  for (const match of html.matchAll(pattern)) {
    references.add(match[1]);
  }
  return [...references].sort();
}

function validateArchive(archivePath) {
  const issues = [];
  const report = {
    archivePath,
    exists: existsSync(archivePath),
    entries: [],
    references: [],
    runtimeEnvInjected: false,
  };
  if (!report.exists) {
    return { ok: false, issues: [`missing cloud web bundle archive: ${archivePath}`], report };
  }

  const zipData = readFileSync(archivePath);
  let entries;
  try {
    entries = readZipEntries(zipData);
  } catch (error) {
    return {
      ok: false,
      issues: [`invalid cloud web bundle archive: ${error instanceof Error ? error.message : String(error)}`],
      report,
    };
  }

  const entryNames = [...entries.keys()];
  report.entries = entryNames;
  if (!entries.has('index.html')) {
    return { ok: false, issues: ['cloud web bundle archive is missing index.html'], report };
  }

  const html = entries.get('index.html').data.toString('utf8');
  report.runtimeEnvInjected = html.includes(`src="${RUNTIME_ENV_SCRIPT_PATH}"`);
  if (!report.runtimeEnvInjected) {
    issues.push(`index.html must inject the ${RUNTIME_ENV_SCRIPT_PATH} runtime env script`);
  }

  const references = collectAssetReferences(html).filter(
    (reference) => reference !== RUNTIME_ENV_SCRIPT_PATH,
  );
  report.references = references;
  for (const reference of references) {
    const normalized = reference.startsWith('/') ? reference.slice(1) : reference;
    if (!entries.has(normalized)) {
      issues.push(`index.html references missing archive entry ${reference}`);
    }
  }
  for (const entry of entries.values()) {
    if (entry.data.length === 0 && entry.name.endsWith('/')) {
      continue;
    }
    if (entry.data.length === 0) {
      issues.push(`archive entry is empty: ${entry.name}`);
    }
  }
  return { ok: issues.length === 0, issues, report };
}

function main() {
  const settings = parseArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    return;
  }

  const archivePath = path.join(
    settings.outputDir,
    archiveNameFor(settings.environment, settings.version),
  );
  const result = validateArchive(archivePath);
  if (settings.json) {
    console.log(JSON.stringify({ ...result, issues: result.issues }, null, 2));
  } else {
    for (const issue of result.issues) {
      console.error(`error: ${issue}`);
    }
    if (result.ok) {
      console.log(
        `cloud web bundle ok: ${archivePath} (${result.report.entries.length} files, runtime-env injected: ${result.report.runtimeEnvInjected})`,
      );
    }
  }
  if (settings.check && !result.ok) {
    process.exitCode = 1;
  }
}

main();
