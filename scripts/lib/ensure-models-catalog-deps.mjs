import { existsSync, mkdirSync, symlinkSync } from 'node:fs';
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

export function ensureModelsCatalogDeps({
  repoRoot = REPO_ROOT,
  modelsRoot = MODELS_ROOT,
  utilsPackageRoot = UTILS_PACKAGE_ROOT,
} = {}) {
  if (!existsSync(path.join(modelsRoot, 'package.json'))) {
    throw new Error(
      `Missing sdkwork-models catalog at ${modelsRoot}. `
      'Ensure ../sdkwork-models is cloned as a sibling repository.',
    );
  }
  if (!existsSync(path.join(utilsPackageRoot, 'package.json'))) {
    throw new Error(
      `Missing @sdkwork/utils package at ${utilsPackageRoot}. `
      + 'Clone sdkwork-utils next to sdkwork-clawrouter and build the TypeScript package.',
    );
  }
  if (!existsSync(path.join(utilsPackageRoot, 'dist', 'crypto.js'))) {
    throw new Error(
      `@sdkwork/utils is not built at ${utilsPackageRoot}. `
      + 'Run "pnpm --dir ../sdkwork-utils/packages/sdkwork-utils-typescript build".',
    );
  }

  const linkPath = path.join(modelsRoot, 'node_modules', '@sdkwork', 'utils');
  ensureDirectorySymlink(linkPath, utilsPackageRoot);
  return {
    repoRoot,
    modelsRoot,
    utilsPackageRoot,
    utilsLinkPath: linkPath,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  ensureModelsCatalogDeps();
}
