import { existsSync, mkdirSync, readFileSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MODELS_ROOT = path.join(REPO_ROOT, '..', 'sdkwork-models');
const UTILS_PACKAGE_ROOT = path.resolve(
  REPO_ROOT,
  '..',
  'sdkwork-utils',
  'packages',
  'sdkwork-utils-typescript',
);
const UTILS_LINK_PATH = path.join(MODELS_ROOT, 'node_modules', '@sdkwork', 'utils');

function ensureDirectorySymlink(targetPath, sourcePath) {
  if (existsSync(path.join(targetPath, 'package.json'))) {
    return;
  }
  mkdirSync(path.dirname(targetPath), { recursive: true });
  symlinkSync(sourcePath, targetPath, process.platform === 'win32' ? 'junction' : 'dir');
}

/**
 * Resolve the on-disk entry that "@sdkwork/utils/crypto" actually loads.
 *
 * The package publishes TypeScript sources through its "exports" map (Node loads
 * them through native type stripping), so a hard-coded "dist" path would report
 * the package as unbuilt even when it is perfectly consumable.
 */
function resolveUtilsCryptoEntry(utilsPackageRoot) {
  const manifestPath = path.join(utilsPackageRoot, 'package.json');
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read the @sdkwork/utils manifest at ${manifestPath}: ${error.message}`);
  }

  const entry = manifest.exports?.['./crypto'];
  const relativeEntry = typeof entry === 'string'
    ? entry
    : entry?.import ?? entry?.default ?? entry?.types;
  if (!relativeEntry) {
    throw new Error(
      `@sdkwork/utils exposes no "./crypto" entry in ${manifestPath}, `
      + 'but the sdkwork-models catalog tooling imports "@sdkwork/utils/crypto".',
    );
  }

  return path.resolve(utilsPackageRoot, relativeEntry);
}

export function ensureModelsCatalogDeps({
  repoRoot = REPO_ROOT,
  modelsRoot = MODELS_ROOT,
  utilsPackageRoot = UTILS_PACKAGE_ROOT,
} = {}) {
  if (!existsSync(path.join(modelsRoot, 'package.json'))) {
    throw new Error(
      `Missing sdkwork-models catalog at ${modelsRoot}. `
      + 'Ensure ../sdkwork-models is cloned as a sibling repository.',
    );
  }
  if (!existsSync(path.join(utilsPackageRoot, 'package.json'))) {
    throw new Error(
      `Missing @sdkwork/utils package at ${utilsPackageRoot}. `
      + 'Clone sdkwork-utils next to sdkwork-cloudrouter.',
    );
  }
  const utilsCryptoEntry = resolveUtilsCryptoEntry(utilsPackageRoot);
  if (!existsSync(utilsCryptoEntry)) {
    throw new Error(
      `@sdkwork/utils resolves "./crypto" to ${utilsCryptoEntry}, which does not exist. `
      + 'Ensure the sibling sdkwork-utils checkout is complete.',
    );
  }

  const linkPath = path.join(modelsRoot, 'node_modules', '@sdkwork', 'utils');
  ensureDirectorySymlink(linkPath, utilsPackageRoot);
  return {
    repoRoot,
    modelsRoot,
    utilsPackageRoot,
    utilsCryptoEntry,
    utilsLinkPath: linkPath,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  ensureModelsCatalogDeps();
}
