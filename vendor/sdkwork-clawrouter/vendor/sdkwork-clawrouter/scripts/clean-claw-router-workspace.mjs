#!/usr/bin/env node

import { rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_SAFE_CLEAN_PATHS = [
  '.tmp',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
  path.join('apps', 'sdkwork-clawrouter-pc', '.turbo'),
  path.join('apps', 'sdkwork-clawrouter-pc', 'dist'),
];

const DEFAULT_PYTHON_CACHE_ROOTS = [
  'tests',
  'tools',
  'scripts',
];

function printHelp() {
  console.log(`Usage: node scripts/clean-claw-router-workspace.mjs [options]

Remove rebuildable local artifacts that slow Codex workspace scans and
verification loops.

Options:
  --rust-target       Also remove Rust target* build artifacts.
  --node-modules      Also remove portal node_modules.
  --dry-run           Print paths without deleting them.
  -h, --help          Show this help.
`);
}

function parseArgs(argv) {
  const settings = {
    dryRun: false,
    rustTarget: false,
    nodeModules: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--') {
      continue;
    }
    switch (arg) {
      case '--dry-run':
        settings.dryRun = true;
        break;
      case '--rust-target':
        settings.rustTarget = true;
        break;
      case '--node-modules':
        settings.nodeModules = true;
        break;
      case '--help':
      case '-h':
        settings.help = true;
        break;
      default:
        throw new Error(`Unsupported clean option: ${arg}`);
    }
  }

  return settings;
}

function normalizeRelativePath(relativePath) {
  return relativePath.split(/[\\/]+/).join(path.sep);
}

function assertWorkspaceRelative(relativePath) {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error(`Cleanup path must be workspace-relative: ${relativePath}`);
  }
  const normalized = path.normalize(relativePath);
  if (normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
    throw new Error(`Cleanup path escapes workspace: ${relativePath}`);
  }
  return normalized;
}

function createCleanEntry(workspaceRoot, relativePath) {
  const normalizedRelativePath = assertWorkspaceRelative(normalizeRelativePath(relativePath));
  const absolutePath = path.resolve(workspaceRoot, normalizedRelativePath);
  const relativeFromRoot = path.relative(workspaceRoot, absolutePath);
  if (
    !relativeFromRoot ||
    relativeFromRoot === '..' ||
    relativeFromRoot.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeFromRoot)
  ) {
    throw new Error(`Cleanup path escapes workspace: ${relativePath}`);
  }
  return {
    relativePath: normalizedRelativePath,
    absolutePath,
  };
}

function buildCleanPlan({
  workspaceRoot = path.resolve(import.meta.dirname, '..'),
  rustTarget = false,
  nodeModules = false,
} = {}) {
  const relativePaths = [];

  if (rustTarget) {
    relativePaths.push(
      'target',
      'target-rust-tests',
      'target-verify',
      'target-verify2',
      'target-verify-split',
      'target-test-fixtures',
    );
  }

  relativePaths.push(
    ...DEFAULT_SAFE_CLEAN_PATHS,
    ...DEFAULT_PYTHON_CACHE_ROOTS.map((root) => path.join(root, '__pycache__')),
  );

  if (nodeModules) {
    relativePaths.push(path.join('apps', 'sdkwork-clawrouter-pc', 'node_modules'));
  }

  return relativePaths.map((relativePath) => createCleanEntry(workspaceRoot, relativePath));
}

async function removeEntry(entry, { dryRun = false } = {}) {
  if (dryRun) {
    console.log(entry.relativePath);
    return;
  }
  console.error(`[clean-claw-router-workspace] remove ${entry.relativePath}`);
  await rm(entry.absolutePath, {
    force: true,
    recursive: true,
    maxRetries: process.platform === 'win32' ? 3 : 0,
  });
}

async function removeEntries(entries, {
  dryRun = false,
  removeEntry: removeEntryFn = removeEntry,
  logWarning = (message) => console.error(message),
} = {}) {
  const failures = [];
  for (const entry of entries) {
    try {
      await removeEntryFn(entry, { dryRun });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({
        relativePath: entry.relativePath,
        error,
      });
      logWarning(`[clean-claw-router-workspace] failed ${entry.relativePath}: ${message}`);
    }
  }
  return failures;
}

async function main() {
  const settings = parseArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    return;
  }

  const workspaceRoot = path.resolve(import.meta.dirname, '..');
  const plan = buildCleanPlan({
    workspaceRoot,
    rustTarget: settings.rustTarget,
    nodeModules: settings.nodeModules,
  });

  const failures = await removeEntries(plan, { dryRun: settings.dryRun });
  if (failures.length > 0) {
    console.error(`[clean-claw-router-workspace] completed with ${failures.length} cleanup warning(s)`);
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  main().catch((error) => {
    console.error(`[clean-claw-router-workspace] ${error.message}`);
    process.exit(1);
  });
}

export { buildCleanPlan, parseArgs, removeEntries };
