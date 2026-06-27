import { readFileSync, writeFileSync, readdirSync, renameSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY = 'sdkwork-claw-router';
const CANONICAL = 'sdkwork-clawrouter';
const SKIP_DIRS = new Set(['node_modules', '.git', 'target', 'dist', '.pnpm-store']);
const SKIP_FILES = new Set([
  path.join(root, 'tools', 'sdkwork_standard_alignment_guardian.py'),
  path.join(root, 'specs', 'naming-migration.manifest.json'),
  path.join(root, 'scripts', 'replace-legacy-repository-stem.mjs'),
]);
const TEXT_EXTENSIONS = new Set([
  '.json',
  '.md',
  '.yaml',
  '.yml',
  '.ts',
  '.tsx',
  '.rs',
  '.toml',
  '.mjs',
  '.py',
  '.sql',
  '.lock',
  '.service',
  '.txt',
  '.html',
  '.css',
  '.scss',
  '.xml',
  '.properties',
  '.env',
  '.sh',
  '.bat',
  '.ps1',
  '.csv',
  '.graphql',
  '.proto',
  '.java',
  '.kt',
  '.swift',
  '.cs',
  '.go',
  '.dart',
  '.rb',
  '.php',
  '.vue',
  '.svelte',
  '.jsx',
  '.cjs',
  '.mts',
  '.cts',
]);

function walk(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(absolute, files);
      continue;
    }
    if (SKIP_FILES.has(absolute)) {
      continue;
    }
    const ext = path.extname(entry.name);
    if (!TEXT_EXTENSIONS.has(ext)) {
      continue;
    }
    files.push(absolute);
  }
  return files;
}

function replaceContent() {
  let changed = 0;
  for (const filePath of walk(root)) {
    const content = readFileSync(filePath, 'utf8');
    if (!content.includes(LEGACY)) {
      continue;
    }
    writeFileSync(filePath, content.replaceAll(LEGACY, CANONICAL), 'utf8');
    changed += 1;
  }
  return changed;
}

function collectRenameTargets(dir, targets = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return targets;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }
    const absolute = path.join(dir, entry.name);
    if (entry.name.includes(LEGACY)) {
      targets.push(absolute);
    }
    if (entry.isDirectory()) {
      collectRenameTargets(absolute, targets);
    }
  }
  return targets;
}

function renamePaths() {
  const targets = collectRenameTargets(root).sort((a, b) => b.length - a.length);
  let renamed = 0;
  for (const absolute of targets) {
    if (!existsSync(absolute)) {
      continue;
    }
    const parent = path.dirname(absolute);
    const nextName = path.basename(absolute).replaceAll(LEGACY, CANONICAL);
    const nextPath = path.join(parent, nextName);
    if (nextPath === absolute || existsSync(nextPath)) {
      continue;
    }
    renameSync(absolute, nextPath);
    renamed += 1;
    console.log(`renamed ${path.relative(root, absolute)} -> ${path.relative(root, nextPath)}`);
  }
  return renamed;
}

const contentChanged = replaceContent();
const pathsRenamed = renamePaths();
console.log(`Replaced ${LEGACY} -> ${CANONICAL} in ${contentChanged} files`);
console.log(`Renamed ${pathsRenamed} path(s)`);
