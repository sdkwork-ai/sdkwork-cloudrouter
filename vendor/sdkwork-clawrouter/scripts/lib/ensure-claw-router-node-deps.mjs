import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

function topologyPackageMarker(repoRoot) {
  return path.join(repoRoot, 'node_modules', '@sdkwork', 'app-topology', 'package.json');
}

function siblingTopologyRoot(repoRoot) {
  return path.resolve(repoRoot, '..', 'sdkwork-app-topology');
}

export function ensureClawRouterNodeDeps({ repoRoot = DEFAULT_REPO_ROOT } = {}) {
  const siblingRoot = siblingTopologyRoot(repoRoot);
  if (!existsSync(path.join(siblingRoot, 'package.json'))) {
    throw new Error(
      `Missing sibling repository sdkwork-app-topology at ${siblingRoot}. `
      + 'Clone sdkwork-app-topology next to sdkwork-claw-router, then run pnpm install.',
    );
  }

  if (existsSync(topologyPackageMarker(repoRoot))) {
    return;
  }

  console.error(
    '[sdkwork-clawrouter-dev] Root node_modules is missing @sdkwork/app-topology. Running pnpm install...',
  );
  const install = spawnSync('pnpm', ['install'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (install.status !== 0) {
    process.exit(install.status ?? 1);
  }

  if (!existsSync(topologyPackageMarker(repoRoot))) {
    throw new Error(
      'pnpm install completed but @sdkwork/app-topology is still missing. '
      + `Run "pnpm install" in ${repoRoot}.`,
    );
  }
}
