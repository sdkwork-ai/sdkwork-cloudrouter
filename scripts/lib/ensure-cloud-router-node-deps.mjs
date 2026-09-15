import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Root `node_modules` is "settled" only when the `pnpm` linker has finished.
 * An interrupted install leaves `node_modules/.pnpm` behind while `.bin` and
 * `.modules.yaml` are still missing, so a marker that only proves "the store was
 * populated" is not enough: `pnpm exec sdkwork-app` resolves through `.bin`, and
 * that is the first command every public entrypoint runs.
 */
const LINK_MARKER = 'node_modules/.bin';
const INSTALL_STATE_MARKER = 'node_modules/.modules.yaml';
const WORKSPACE_DEP_MARKER = 'node_modules/@sdkwork/app-topology/package.json';

function topologyPackageMarker(repoRoot) {
  return path.join(repoRoot, 'node_modules', '@sdkwork', 'app-topology', 'package.json');
}

/**
 * `pnpm exec sdkwork-app` resolves the `sdkwork-app` bin produced by this
 * dependency, so its presence proves the root links are materialized.
 */
export function cloudRouterNodeDepsReady(repoRoot = DEFAULT_REPO_ROOT) {
  return existsSync(topologyPackageMarker(repoRoot))
    && existsSync(path.join(repoRoot, LINK_MARKER))
    && existsSync(path.join(repoRoot, INSTALL_STATE_MARKER));
}

/**
 * A pull that changes `pnpm-lock.yaml` invalidates the previous install. Every
 * install rewrites `.modules.yaml` at the end, so a lockfile that is newer than
 * that marker means the checkout is ahead of the installed tree.
 */
function lockfileAheadOfInstall(repoRoot) {
  const lockfile = path.join(repoRoot, 'pnpm-lock.yaml');
  const installState = path.join(repoRoot, INSTALL_STATE_MARKER);
  if (!existsSync(lockfile) || !existsSync(installState)) return false;
  return statSync(lockfile).mtimeMs > statSync(installState).mtimeMs;
}

function siblingTopologyRoot(repoRoot) {
  return path.resolve(repoRoot, '..', 'sdkwork-app-topology');
}

/**
 * The `pnpm` linker materializes every `workspace:*` dependency as a DIRECTORY
 * symlink (`symlinkDirectRootDependency`), and its isolated store links packages
 * with symlinks too. Filesystems without reparse-point support (exFAT, FAT32,
 * some network mounts) reject those calls with EISDIR/EINVAL, so the install can
 * never complete there: it dies after populating `node_modules/.pnpm` and never
 * creates `.bin`. On such a volume the failure is permanent, so detect it up
 * front instead of letting an install burn hours and leave a half-linked tree.
 */
export function directoryLinksSupported(repoRoot = DEFAULT_REPO_ROOT) {
  let probeRoot;
  try {
    probeRoot = mkdtempSync(path.join(repoRoot, '.sdkwork-link-probe-'));
    const target = path.join(probeRoot, 'target');
    mkdirSync(target);
    symlinkSync(target, path.join(probeRoot, 'link'), 'junction');
    return true;
  } catch {
    return false;
  } finally {
    if (probeRoot) {
      rmSync(probeRoot, { recursive: true, force: true });
    }
  }
}

export function ensureCloudRouterNodeDeps({ repoRoot = DEFAULT_REPO_ROOT } = {}) {
  const siblingRoot = siblingTopologyRoot(repoRoot);
  if (!existsSync(path.join(siblingRoot, 'package.json'))) {
    throw new Error(
      `Missing sibling repository sdkwork-app-topology at ${siblingRoot}. `
      + 'pnpm-workspace.yaml resolves @sdkwork/app-topology through the SDKWork workspace '
      + `layout, not a registry, so ${path.basename(repoRoot)} cannot be built from an isolated `
      + 'checkout: clone sdkwork-app-topology next to it, then retry '
      + '(PNPM_WORKSPACE_DEPENDENCY_SPEC.md section 1 and 2).',
    );
  }

  const linkIncomplete = !cloudRouterNodeDepsReady(repoRoot);
  const installStale = !linkIncomplete && lockfileAheadOfInstall(repoRoot);
  if (!linkIncomplete && !installStale) {
    return;
  }

  if (!directoryLinksSupported(repoRoot)) {
    throw new Error(
      `${repoRoot} is on a filesystem that cannot create directory links `
      + '(exFAT/FAT32 and some network mounts fail with EISDIR/EINVAL). The `pnpm` linker '
      + 'materializes every workspace:* dependency as a directory symlink, so `pnpm exec sdkwork-app` '
      + 'can never be installed here: a failed install leaves `node_modules` holding only its '
      + '`.pnpm` store, with no `.bin`. Move the checkout to an NTFS volume (or a native Linux '
      + 'filesystem when developing under WSL) and reinstall; retrying on this volume cannot '
      + 'succeed.',
    );
  }

  console.error(
    installStale
      ? '[sdkwork-cloudrouter] pnpm-lock.yaml is newer than the installed node_modules; running pnpm install ...'
      : '[sdkwork-cloudrouter] node_modules is missing or incomplete; running pnpm install ...',
  );
  console.error(
    '[sdkwork-cloudrouter] the full SDKWork workspace install takes a while on a cold store. Let it '
    + 'finish: an interrupted run leaves node_modules half-linked (store populated, no .bin), which is '
    + 'the state that makes every `pnpm exec sdkwork-app` entrypoint fail.',
  );
  // Plain `pnpm install` first: with an up-to-date lockfile the linker prints
  // "Lockfile is up to date, resolution step is skipped" and goes straight to
  // linking, which is the common path after a pull. `--no-frozen-lockfile` is
  // only the fallback for the case where the lockfile cannot satisfy the
  // workspace manifests (CI=true makes `pnpm` refuse to update it), and it is
  // never the first choice because it turns a link-only run into a full
  // registry re-resolution.
  const installArgs = ['install'];
  let install = spawnSync('pnpm', installArgs, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (install.status !== 0) {
    console.error(
      '[sdkwork-cloudrouter] pnpm install did not succeed; retrying with --no-frozen-lockfile so this '
      + 'checkout can refresh the lockfile against the workspace layout it currently has ...',
    );
    install = spawnSync('pnpm', [...installArgs, '--no-frozen-lockfile'], {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
  }
  if (install.status !== 0) {
    console.error(
      `[sdkwork-cloudrouter] pnpm install failed with exit code ${install.status}. `
      + `Fix the reported error, then run "pnpm install" in ${repoRoot}.`,
    );
    process.exit(install.status ?? 1);
  }

  if (!cloudRouterNodeDepsReady(repoRoot)) {
    throw new Error(
      `pnpm install completed but ${WORKSPACE_DEP_MARKER} is still missing. `
      + `Run "pnpm install" in ${repoRoot} and inspect the reported error.`,
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  ensureCloudRouterNodeDeps();
}
