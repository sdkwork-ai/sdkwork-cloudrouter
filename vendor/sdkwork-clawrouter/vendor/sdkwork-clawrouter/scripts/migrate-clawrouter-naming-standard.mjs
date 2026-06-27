#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const pcRoot = path.join(root, 'apps', 'sdkwork-clawrouter-pc');

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  'target',
  'dist',
  'generated',
  '.git',
  '.pnpm-store',
]);

const SKIP_FILE_SUFFIXES = [
  'pnpm-lock.yaml',
  'Cargo.lock',
];

const REPO_IDENTITY_FILES = [
  'sdkwork.app.config.json',
  'sdkwork.workflow.json',
  'package.json',
  'specs/component.spec.json',
  'specs/naming-migration.manifest.json',
  'specs/standard-alignment.manifest.json',
  'specs/README.md',
  'specs/dependency-api-surfaces.json',
  'specs/database-store-migration.manifest.json',
  'specs/topology.spec.json',
  'apis/manifest.json',
  'AGENTS.md',
  'README.md',
  '.sdkwork/README.md',
];

function shouldSkipDir(name) {
  return SKIP_DIR_NAMES.has(name);
}

function walkFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (shouldSkipDir(entry)) {
      continue;
    }
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walkFiles(fullPath, files);
      continue;
    }
    if (SKIP_FILE_SUFFIXES.some((suffix) => entry.endsWith(suffix))) {
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

function replaceAll(text, replacements) {
  let next = text;
  for (const [from, to] of replacements) {
    next = next.split(from).join(to);
  }
  return next;
}

function updatePcPackageNames() {
  const packagesDir = path.join(pcRoot, 'packages');
  const replacements = [];
  for (const dirName of readdirSync(packagesDir)) {
    if (!dirName.startsWith('sdkwork-clawrouter-pc-')) {
      continue;
    }
    const suffix = dirName.slice('sdkwork-clawrouter-pc-'.length);
    const scopedName = `@sdkwork/clawrouter-pc-${suffix}`;
    const packageJsonPath = path.join(packagesDir, dirName, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const oldName = packageJson.name;
    packageJson.name = scopedName;
    if (packageJson.sdkwork?.workspace === 'sdkwork-clawrouter') {
      packageJson.sdkwork.workspace = 'sdkwork-clawrouter';
    }
    if (packageJson.dependencies) {
      for (const [dep, value] of Object.entries(packageJson.dependencies)) {
        if (dep.startsWith('sdkwork-clawrouter-pc-')) {
          const depSuffix = dep.slice('sdkwork-clawrouter-pc-'.length);
          delete packageJson.dependencies[dep];
          packageJson.dependencies[`@sdkwork/clawrouter-pc-${depSuffix}`] = value;
        }
      }
    }
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
    if (oldName !== scopedName) {
      replacements.push([oldName, scopedName]);
    }
  }
  return replacements.sort((a, b) => b[0].length - a[0].length);
}

function updateAppPackageJson(replacements) {
  const appPackageJsonPath = path.join(pcRoot, 'package.json');
  let text = readFileSync(appPackageJsonPath, 'utf8');
  for (const [from, to] of replacements) {
    text = text.split(from).join(to);
  }
  writeFileSync(appPackageJsonPath, text, 'utf8');
}

function updateTsconfigPaths(configPath) {
  let text = readFileSync(configPath, 'utf8');
  text = replaceAll(text, [
    ['"sdkwork-clawrouter-pc-', '"@sdkwork/clawrouter-pc-'],
  ]);
  writeFileSync(configPath, text, 'utf8');
}

function updateSourceImports(replacements) {
  const scanRoots = [
    path.join(pcRoot, 'src'),
    path.join(pcRoot, 'packages'),
    path.join(pcRoot, 'tests'),
    path.join(root, 'tools'),
    path.join(root, 'tests'),
    path.join(root, 'scripts'),
  ];
  const extensions = new Set(['.ts', '.tsx', '.mts', '.cts', '.mjs', '.js', '.json']);
  for (const scanRoot of scanRoots) {
    if (!statSync(scanRoot, { throwIfNoAccess: false })?.isDirectory()) {
      continue;
    }
    for (const filePath of walkFiles(scanRoot)) {
      const ext = path.extname(filePath);
      if (!extensions.has(ext)) {
        continue;
      }
      if (filePath.endsWith('pnpm-lock.yaml')) {
        continue;
      }
      const original = readFileSync(filePath, 'utf8');
      let next = original;
      for (const [from, to] of replacements) {
        next = next.split(`'${from}'`).join(`'${to}'`);
        next = next.split(`"${from}"`).join(`"${to}"`);
        next = next.split(`'${from}/`).join(`'${to}/`);
        next = next.split(`"${from}/`).join(`"${to}/`);
      }
      if (next !== original) {
        writeFileSync(filePath, next, 'utf8');
      }
    }
  }
}

function updateRepoIdentity() {
  for (const relativePath of REPO_IDENTITY_FILES) {
    const filePath = path.join(root, relativePath);
    try {
      const original = readFileSync(filePath, 'utf8');
      const next = replaceAll(original, [
        ['sdkwork-clawrouter', 'sdkwork-clawrouter'],
        ['Sdkwork-Cloud/sdkwork-clawrouter', 'Sdkwork-Cloud/sdkwork-clawrouter'],
      ]);
      if (next !== original) {
        writeFileSync(filePath, next, 'utf8');
      }
    } catch {
      // optional file
    }
  }
}

function updateNamingManifest() {
  const manifestPath = path.join(root, 'specs', 'naming-migration.manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.application = 'sdkwork-clawrouter';
  manifest.canonicalApplicationCode = 'clawrouter';
  manifest.legacyRepositoryStems = [
    {
      path: 'sdkwork-clawrouter',
      target: 'sdkwork-clawrouter',
      reason: 'Retired hyphenated repository stem; canonical application code and repository stem is clawrouter.',
    },
  ];
  delete manifest.legacyPcPackages;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function updateAlignmentGuardianDocstring() {
  // Guardian naming checks are maintained in tools/sdkwork_standard_alignment_guardian.py directly.
}

const packageReplacements = updatePcPackageNames();
updateAppPackageJson(packageReplacements);
updateTsconfigPaths(path.join(pcRoot, 'tsconfig.json'));
updateTsconfigPaths(path.join(pcRoot, 'tsconfig.typecheck.json'));
updateSourceImports(packageReplacements);
updateRepoIdentity();
updateNamingManifest();
updateAlignmentGuardianDocstring();

console.log(`Updated ${packageReplacements.length} PC package names to @sdkwork/clawrouter-pc-*`);
console.log('Updated repository identity manifests to sdkwork-clawrouter');
