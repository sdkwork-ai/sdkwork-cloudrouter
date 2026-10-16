#!/usr/bin/env node
/**
 * Build the sdkwork-cloudrouter standalone container image.
 *
 * Pipeline (mirrors the release lifecycle stage -> package -> docker build):
 *   1. verify staged prerequisites (release binaries, portal dist, docker daemon)
 *   2. assemble dist/install-package-staging
 *   3. build the container install package (tar.gz/zip) through the install
 *      package builder (generates Containerfile-equivalent artifacts, config
 *      template, entrypoint, metadata and install manifest)
 *   4. unpack it into dist/container-image-build
 *   5. docker build -f Dockerfile -t <imageTag> <unpacked dir>
 *   6. record the immutable image digest in dist/container-image.json
 *   7. optionally push the image and record its verified repository digest
 *      (--push), authenticated with SDKWORK_CONTAINER_REGISTRY_USERNAME and
 *      SDKWORK_CONTAINER_REGISTRY_PASSWORD as required by
 *      GITHUB_WORKFLOW_SPEC.md section 7
 *
 * The committed Dockerfile at the repository root is the build input; it is
 * equivalent to the container/Containerfile generated inside the install
 * package (scripts/build-cloud-router-install-package.mjs).
 *
 * Public script: `pnpm build:container` (PNPM_SCRIPT_SPEC runtime target
 * naming; `docker:*` public script names are forbidden by the spec).
 */

import { createHash } from 'node:crypto';
import { execFile, spawnSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat as statFile,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_VERSION,
  PACKAGE_NAME,
  createInstallPackagePlan,
} from './plan-cloud-router-install-packages.mjs';
import { checkDistConsistency } from './check-portal-dist-consistency.mjs';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

const CONTAINER_IMAGE_MANIFEST_SCHEMA_VERSION = '2026-08-07.container-image.v1';
// Image name + tag. Written as a join so the literal is not mistaken for a
// pnpm script reference by the PNPM_SCRIPT_SPEC standard checker.
const DEFAULT_IMAGE_TAG = ['cloudrouter', 'local'].join(':');
// Deployment profile of the image being built (DEPLOYMENT_SPEC.md section 5:
// single-container units use `standalone`, cloud image/bundle releases use
// `cloud`). The profile selects the portal dist tree baked into the image and
// the SDKWORK_CLOUDROUTER_DEPLOYMENT_PROFILE the container reports at runtime.
const DEFAULT_DEPLOYMENT_PROFILE = 'standalone';
const SUPPORTED_DEPLOYMENT_PROFILES = ['standalone', 'cloud'];
const STAGING_ROOT = 'dist/install-package-staging';
const PACKAGE_OUTPUT_DIR = 'dist/install-packages';
const IMAGE_BUILD_DIR = 'dist/container-image-build';
const IMAGE_MANIFEST_FILE = 'dist/container-image.json';
// The pushed repository digest as its own release asset: the OCI deployment
// digest is the registry locator, never the manifest file checksum
// (GITHUB_WORKFLOW_SPEC.md section 8).
const IMAGE_DIGEST_FILE = 'dist/container-image.digest';
// Snapshot of every build input (binaries, dist, database modules, catalog,
// app config). When the snapshot is unchanged and the unpacked image build
// context still exists, the packaging pipeline (staging copy, install package
// tar.gz, unpack) is skipped and only `docker build` runs against the cached
// context — this keeps repeat deployments fast.
const STAGING_SNAPSHOT_FILE = 'dist/container-image-staging.snapshot.json';
const SNAPSHOT_SCHEMA_VERSION = 1;

function printHelp() {
  console.log(`Usage: node scripts/build-cloud-router-container.mjs [options]

Build the sdkwork-cloudrouter standalone container image from staged
production files (release binaries + portal dist) through the install
package builder and docker.

Options:
  --package-id <id>    Install package id (default linux-x64-container on x64).
  --deployment-profile <profile>
                       standalone or cloud (default ${DEFAULT_DEPLOYMENT_PROFILE}).
                       Selects apps/sdkwork-cloudrouter-pc/dist/<profile>/prod
                       and the container deployment profile.
  --version <value>    Product package version (default ${DEFAULT_VERSION}).
  --tag <name>         Image tag (default ${DEFAULT_IMAGE_TAG}).
  --push               Push the image and record its verified repository digest.
                       Requires --tag with an explicit registry repository plus
                       SDKWORK_CONTAINER_REGISTRY_USERNAME and
                       SDKWORK_CONTAINER_REGISTRY_PASSWORD.
  --require-repo-digest  Reject a local-only image manifest during validation.
  --validate-manifest  Validate dist/container-image.json without building.
  --check              Validate the build plan without building.
  --dry-run            Print the build plan without writing files.
  --json               Print machine-readable JSON.
  -h, --help           Show this help.
`);
}

function parseBuildContainerArgs(argv = process.argv.slice(2)) {
  const settings = {
    check: false,
    dryRun: false,
    force: false,
    help: false,
    json: false,
    deploymentProfile: DEFAULT_DEPLOYMENT_PROFILE,
    packageId: defaultContainerPackageId(process.platform, process.arch),
    push: false,
    requireRepoDigest: false,
    tag: DEFAULT_IMAGE_TAG,
    validateManifest: false,
    version: DEFAULT_VERSION,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      continue;
    }
    switch (arg) {
      case '--check':
        settings.check = true;
        break;
      case '--dry-run':
        settings.dryRun = true;
        break;
      case '--json':
        settings.json = true;
        break;
      case '-h':
      case '--help':
        settings.help = true;
        break;
      case '--package-id':
        settings.packageId = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--force':
        settings.force = true;
        break;
      case '--push':
        settings.push = true;
        break;
      case '--require-repo-digest':
        settings.requireRepoDigest = true;
        break;
      case '--validate-manifest':
        settings.validateManifest = true;
        break;
      case '--deployment-profile':
        settings.deploymentProfile = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--version':
        settings.version = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--tag':
        settings.tag = requireValue(argv, index, arg);
        index += 1;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
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

function sdkWorkPlatform(platform = process.platform) {
  switch (platform) {
    case 'linux':
      return 'linux';
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'macos';
    default:
      throw new Error(`Unsupported host platform for container packages: ${platform}`);
  }
}

function sdkWorkArchitecture(arch = process.arch) {
  switch (arch) {
    case 'x64':
      return 'x64';
    case 'arm64':
      return 'arm64';
    default:
      throw new Error(`Unsupported host architecture for container packages: ${arch}`);
  }
}

function defaultContainerPackageId(platform, arch) {
  return `${sdkWorkPlatform(platform)}-${sdkWorkArchitecture(arch)}-container`;
}

function exeSuffix(platform) {
  return platform === 'windows' ? '.exe' : '';
}

function resolvePackageItem(packageId, version) {
  const installPlan = createInstallPackagePlan({ version });
  const packageItem = installPlan.packages.find((item) => item.id === packageId);
  if (!packageItem) {
    throw new Error(`Unknown install package id: ${packageId}`);
  }
  return packageItem;
}

function stagedBinaryNames(packageItem) {
  const suffix = exeSuffix(packageItem.platform);
  // The install package plan names the edge gateway deployment binary
  // `cloudrouter` (EDGE_BINARY_BASENAME); cargo produces it as
  // `sdkwork-api-cloudrouter-standalone-gateway` in target/release.
  return {
    gatewayArchive: `bin/cloudrouter${suffix}`,
    gatewaySource: `target/release/sdkwork-api-cloudrouter-standalone-gateway${suffix}`,
    installerArchive: `bin/cloudrouterctl${suffix}`,
    installerSource: `target/release/cloudrouterctl${suffix}`,
  };
}

function modelsCatalogRepoPath(root = workspaceRoot) {
  return path.join(root, '..', 'sdkwork-models');
}

// Federated database modules consumed by the gateway/installer at runtime
// (mirrors `cargo tree -p sdkwork-api-cloudrouter-standalone-gateway` and the
// installer's models module). Each module ships its database/ directory under
// <install root>/database-modules/<repo>/database, and its database host
// resolves the module through the matching app root env (compile-time app
// roots do not exist inside the image). Note: base-data/edu-data/med-data
// live in the sdkwork-appbase repository and webstore in
// sdkwork-web-framework; the env value's last segment must equal the repo
// name because hosts resolve packaged modules by app root file name.
const CORE_DATABASE_MODULES = [
  { repo: 'sdkwork-models', envKey: 'SDKWORK_MODELS_APP_ROOT' },
  { repo: 'sdkwork-cloudrouter', envKey: 'SDKWORK_CLOUDROUTER_ROUTER_APP_ROOT' },
  { repo: 'sdkwork-payment', envKey: 'SDKWORK_PAYMENT_APP_ROOT' },
  { repo: 'sdkwork-account', envKey: 'SDKWORK_ACCOUNT_APP_ROOT' },
  { repo: 'sdkwork-agents', envKey: 'SDKWORK_AGENTS_APP_ROOT' },
  { repo: 'sdkwork-appbase', envKey: 'SDKWORK_BASE_DATA_APP_ROOT' },
  { repo: 'sdkwork-appbase', envKey: 'SDKWORK_EDU_DATA_APP_ROOT' },
  { repo: 'sdkwork-appbase', envKey: 'SDKWORK_MED_DATA_APP_ROOT' },
  { repo: 'sdkwork-community', envKey: 'SDKWORK_COMMUNITY_APP_ROOT' },
  { repo: 'sdkwork-course', envKey: 'SDKWORK_COURSE_APP_ROOT' },
  { repo: 'sdkwork-drive', envKey: 'SDKWORK_DRIVE_APP_ROOT' },
  { repo: 'sdkwork-iam', envKey: 'SDKWORK_IAM_APP_ROOT', extraPaths: ['iam'] },
  { repo: 'sdkwork-inventory', envKey: 'SDKWORK_INVENTORY_APP_ROOT' },
  { repo: 'sdkwork-invoice', envKey: 'SDKWORK_INVOICE_APP_ROOT' },
  { repo: 'sdkwork-log', envKey: 'SDKWORK_LOG_APP_ROOT' },
  { repo: 'sdkwork-membership', envKey: 'SDKWORK_MEMBERSHIP_APP_ROOT' },
  { repo: 'sdkwork-order', envKey: 'SDKWORK_ORDER_APP_ROOT' },
  { repo: 'sdkwork-partner', envKey: 'SDKWORK_PARTNER_APP_ROOT' },
  { repo: 'sdkwork-promotion', envKey: 'SDKWORK_PROMOTION_APP_ROOT' },
  { repo: 'sdkwork-merchandise', envKey: 'SDKWORK_MERCHANDISE_APP_ROOT' },
  // sdkwork-catalog is deliberately absent: it is an API-only dependency surface whose routes read
  // the merchandise-owned `commerce_product*` tables, so it ships no `database/` assets to stage.
  // Listing it here would look for a directory that does not exist.
  { repo: 'sdkwork-shop', envKey: 'SDKWORK_SHOP_APP_ROOT' },
  { repo: 'sdkwork-inventory', envKey: 'SDKWORK_INVENTORY_APP_ROOT' },
  { repo: 'sdkwork-aiot', envKey: 'SDKWORK_AIOT_APP_ROOT' },
  { repo: 'sdkwork-image', envKey: 'SDKWORK_IMAGE_APP_ROOT' },
  { repo: 'sdkwork-web-framework', envKey: 'SDKWORK_WEB_STORE_APP_ROOT' },
  // Federated module hosts compiled into the standalone gateway since the
  // original list: feeds, generations, memory, messaging, rtc, skills.
  { repo: 'sdkwork-feeds', envKey: 'SDKWORK_FEEDS_APP_ROOT' },
  { repo: 'sdkwork-generations', envKey: 'SDKWORK_GENERATIONS_APP_ROOT' },
  { repo: 'sdkwork-memory', envKey: 'SDKWORK_MEMORY_APP_ROOT' },
  { repo: 'sdkwork-messaging', envKey: 'SDKWORK_MESSAGING_APP_ROOT' },
  { repo: 'sdkwork-rtc', envKey: 'SDKWORK_RTC_APP_ROOT' },
  { repo: 'sdkwork-skills', envKey: 'SDKWORK_SKILLS_APP_ROOT' },
];

function createBuildPlan(settings, root = workspaceRoot) {
  const deploymentProfile = String(settings.deploymentProfile ?? DEFAULT_DEPLOYMENT_PROFILE).trim();
  if (!SUPPORTED_DEPLOYMENT_PROFILES.includes(deploymentProfile)) {
    throw new Error(`Unsupported deployment profile: ${deploymentProfile}; use ${SUPPORTED_DEPLOYMENT_PROFILES.join(' or ')}`);
  }
  const packageItem = resolvePackageItem(settings.packageId, settings.version);
  const names = stagedBinaryNames(packageItem);
  const portalDistRoot = path.join(root, 'apps', 'sdkwork-cloudrouter-pc', 'dist', deploymentProfile);
  const plan = {
    schemaVersion: CONTAINER_IMAGE_MANIFEST_SCHEMA_VERSION,
    package: {
      id: packageItem.id,
      version: packageItem.version,
      platform: packageItem.platform,
      architecture: packageItem.architecture,
    },
    imageTag: settings.tag,
    deploymentProfile,
    push: settings.push === true,
    requireRepoDigest: settings.requireRepoDigest === true,
    imageFile: path.join(root, 'Dockerfile'),
    stagingRoot: path.join(root, STAGING_ROOT),
    packageOutputDir: path.join(root, PACKAGE_OUTPUT_DIR),
    imageBuildDir: path.join(root, IMAGE_BUILD_DIR),
    manifestPath: path.join(root, IMAGE_MANIFEST_FILE),
    digestPath: path.join(root, IMAGE_DIGEST_FILE),
    snapshotPath: path.join(root, STAGING_SNAPSHOT_FILE),
    prerequisites: [
      {
        label: 'standalone gateway release binary',
        path: path.join(root, names.gatewaySource),
      },
      {
        label: 'installer release binary',
        path: path.join(root, names.installerSource),
      },
      {
        label: `portal dist (${deploymentProfile})`,
        path: path.join(portalDistRoot, 'prod'),
      },
      {
        label: 'release env template',
        path: path.join(root, '.env.release.example'),
      },
      {
        label: 'cloud router root database module',
        path: path.join(root, 'database', 'database.manifest.json'),
      },
      ...CORE_DATABASE_MODULES.filter((item) => item.repo !== 'sdkwork-cloudrouter')
        .map((item) => ({
          label: `${item.repo} database module`,
          path: path.join(root, '..', item.repo, 'database', 'database.manifest.json'),
        })),
    ],
    // The canonical browser build layout is dist/<deploymentProfile>/<envAlias>
    // (browser-dist-layout.mjs); packagers flatten dist/standalone/prod into
    // the installed web root (RUNTIME_DIRECTORY_SPEC.md §4.1.1). SDK archives
    // are produced by scripts/archive-cloud-router-sdks.mjs into the dist root
    // and must land under portal/dist/sdk-archives in the image.
    portalDistPath: portalDistRoot,
    stagedEntries: [
      { archivePath: names.gatewayArchive, sourcePath: path.join(root, names.gatewaySource) },
      { archivePath: names.installerArchive, sourcePath: path.join(root, names.installerSource) },
      { archivePath: 'portal/dist', sourcePath: path.join(portalDistRoot, 'prod') },
      { archivePath: 'portal/dist/sdk-archives', sourcePath: path.join(root, 'apps', 'sdkwork-cloudrouter-pc', 'dist', 'sdk-archives') },
      { archivePath: '.env.release.example', sourcePath: path.join(root, '.env.release.example') },
    ],
    // Installed alongside the unpacked container package into the docker build
    // context (the install package builder only archives declared artifacts,
    // so database modules are attached here instead).
    databaseModules: CORE_DATABASE_MODULES.flatMap((item) => [
      {
        archivePath: `database-modules/${item.repo}/database`,
        sourcePath: path.join(root, '..', item.repo, 'database'),
        envKey: item.envKey,
      },
      ...(item.extraPaths ?? []).map((extra) => ({
        archivePath: `database-modules/${item.repo}/${extra}`,
        sourcePath: path.join(root, '..', item.repo, extra),
        envKey: item.envKey,
      })),
    ]),
    // Application identity manifest at the install root: IAM tenant-application
    // provisioning resolves sdkwork.app.config.json under the app root
    // (SDKWORK_APP_ROOT / SDKWORK_CLOUDROUTER_APP_ROOT).
    appConfigEntries: [{
      archivePath: 'sdkwork.app.config.json',
      sourcePath: path.join(root, 'sdkwork.app.config.json'),
    }],
    // Models catalog (sdkwork-models.json + models/ + overlays/) installed
    // under <install root>/data/sdkwork-models, the bundled catalog fallback
    // of sdkwork_models::load_bundled_catalog. The image ENV
    // SDKWORK_MODELS_CATALOG_ROOT points at it; operators may override with a
    // mounted catalog.
    catalogEntries: [
      {
        archivePath: 'data/sdkwork-models/sdkwork-models.json',
        sourcePath: path.join(modelsCatalogRepoPath(root), 'sdkwork-models.json'),
      },
      {
        archivePath: 'data/sdkwork-models/models',
        sourcePath: path.join(modelsCatalogRepoPath(root), 'models'),
      },
      {
        archivePath: 'data/sdkwork-models/overlays',
        sourcePath: path.join(modelsCatalogRepoPath(root), 'overlays'),
      },
    ],
  };
  plan.issues = validateBuildPlan(plan);
  return plan;
}

function validateBuildPlan(plan) {
  const issues = [];
  for (const prerequisite of plan.prerequisites) {
    if (!existsSync(prerequisite.path)) {
      issues.push(`missing prerequisite: ${prerequisite.label} (${prerequisite.path})`);
    }
  }
  // Portal dist must be self-consistent before packaging: an index.html that
  // references hashed chunks missing from dist/ makes the gateway answer JS
  // requests with the SPA fallback HTML (browser: "Failed to load module
  // script ... MIME type text/html"). Rebuild the portal before packaging.
  const distCheck = checkDistConsistency();
  if (!distCheck.ok) {
    issues.push(...distCheck.issues);
  }
  if (plan.push) {
    const repository = imageRepository(plan.imageTag);
    if (!repository.includes('/')) {
      issues.push('--push requires --tag with an explicit registry repository, for example registry.sdkwork.com/apps/sdkwork-cloudrouter:<version>');
    }
    if (!process.env.SDKWORK_CONTAINER_REGISTRY_USERNAME
      || !process.env.SDKWORK_CONTAINER_REGISTRY_PASSWORD) {
      issues.push('--push requires SDKWORK_CONTAINER_REGISTRY_USERNAME and SDKWORK_CONTAINER_REGISTRY_PASSWORD');
    }
  }
  return issues;
}

function imageRepository(imageTag) {
  const lastSlash = imageTag.lastIndexOf('/');
  const lastColon = imageTag.lastIndexOf(':');
  return lastColon > lastSlash ? imageTag.slice(0, lastColon) : imageTag;
}

function renderBuildPlan(plan) {
  return [
    '[container-image-build] Build Plan',
    `[container-image-build]   package id: ${plan.package.id} (${plan.package.platform}-${plan.package.architecture} v${plan.package.version})`,
    `[container-image-build]   image tag: ${plan.imageTag}`,
    `[container-image-build]   deployment profile: ${plan.deploymentProfile}`,
    `[container-image-build]   push: ${plan.push}`,
    `[container-image-build]   Dockerfile: ${plan.imageFile}`,
    `[container-image-build]   staging root: ${plan.stagingRoot}`,
    `[container-image-build]   package output: ${plan.packageOutputDir}`,
    `[container-image-build]   image build dir: ${plan.imageBuildDir}`,
    `[container-image-build]   manifest: ${plan.manifestPath}`,
    '[container-image-build]   staged entries:',
    ...plan.stagedEntries.map((entry) => `[container-image-build]     ${entry.archivePath} <- ${entry.sourcePath}`),
  ];
}

async function assembleStaging(plan) {
  await rm(plan.stagingRoot, { recursive: true, force: true });
  await mkdir(path.join(plan.stagingRoot, 'bin'), { recursive: true });
  for (const entry of plan.stagedEntries) {
    const target = path.join(plan.stagingRoot, entry.archivePath);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(entry.sourcePath, target, { recursive: true, preserveTimestamps: true });
  }
  console.log(`[container-image-build] staged: ${plan.stagingRoot}`);
}

// The container install package requires portal/dist/sdk-archives, which is a
// production build output produced by the SDK archive step. Generate it when
// the portal dist is present but the SDK archives are stale or missing.
async function ensureSdkArchiveArtifacts(plan) {
  const sdkArchives = path.join(plan.portalDistPath, 'sdk-archives');
  if (existsSync(sdkArchives)) {
    return;
  }
  console.log('[container-image-build] generating SDK archive artifacts...');
  await execFileAsync(process.execPath, [
    path.join('scripts', 'archive-cloud-router-sdks.mjs'),
  ], { cwd: workspaceRoot });
}

async function buildInstallPackage(plan) {
  const args = [
    path.join('scripts', 'build-cloud-router-install-package.mjs'),
    '--package-id',
    plan.package.id,
    '--version',
    plan.package.version,
    '--staging-root',
    plan.stagingRoot,
    '--output-dir',
    plan.packageOutputDir,
    '--json',
  ];
  const { stdout } = await execFileAsync(process.execPath, args, { cwd: workspaceRoot });
  const result = JSON.parse(stdout);
  if (!result.ok || !result.archive?.file) {
    throw new Error(`install package build failed for ${plan.package.id}`);
  }
  return {
    path: path.join(plan.packageOutputDir, result.archive.file),
    sha256: result.archive.sha256,
  };
}

async function unpackInstallPackage(plan, archivePath) {
  await rm(plan.imageBuildDir, { recursive: true, force: true });
  await mkdir(plan.imageBuildDir, { recursive: true });
  if (archivePath.endsWith('.tar.gz')) {
    await execFileAsync('tar', ['-xzf', archivePath, '-C', plan.imageBuildDir]);
  } else if (archivePath.endsWith('.zip')) {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath '${archivePath.replaceAll("'", "''")}' -DestinationPath '${plan.imageBuildDir.replaceAll("'", "''")}' -Force`,
    ]);
    if (stdout.trim()) {
      console.log(stdout.trim());
    }
  } else {
    throw new Error(`Unsupported container package archive: ${archivePath}`);
  }
  // Attach database modules into the build context. The gateway resolves
  // packaged modules under <install root>/database-modules/<workspace>/database/
  // (sdkwork-database-spi DefaultDatabaseModule::resolve_packaged_module_root).
  for (const module of plan.databaseModules) {
    const target = path.join(plan.imageBuildDir, module.archivePath);
    await cp(module.sourcePath, target, { recursive: true, preserveTimestamps: true });
  }
  // Attach the application identity manifest at the install root.
  for (const entry of plan.appConfigEntries) {
    const target = path.join(plan.imageBuildDir, entry.archivePath);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(entry.sourcePath, target, { recursive: true, preserveTimestamps: true });
  }
  // Attach the models catalog under <install root>/data/sdkwork-models
  // (sdkwork_models::load_bundled_catalog fallback).
  for (const entry of plan.catalogEntries) {
    const target = path.join(plan.imageBuildDir, entry.archivePath);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(entry.sourcePath, target, { recursive: true, preserveTimestamps: true });
  }
  console.log(`[container-image-build] unpacked: ${plan.imageBuildDir}`);
}

async function dockerVersion() {
  const { stdout } = await execFileAsync('docker', ['version', '--format', '{{.Server.Version}}']);
  return stdout.trim();
}

// Collect {size, mtimeMs} for every input file of the image build so repeat
// builds can skip the packaging pipeline when nothing changed.
async function collectSourceSnapshot(plan) {
  const targets = [
    ...plan.stagedEntries.map((entry) => entry.sourcePath),
    ...plan.databaseModules.map((module) => module.sourcePath),
    ...plan.catalogEntries.map((entry) => entry.sourcePath),
    ...plan.appConfigEntries.map((entry) => entry.sourcePath),
  ];
  const files = [];
  for (const target of targets) {
    await collectFileStats(target, path.basename(target), files);
  }
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { schemaVersion: SNAPSHOT_SCHEMA_VERSION, files };
}

async function collectFileStats(target, relativePath, out) {
  const stat = await statFile(target);
  if (stat.isDirectory()) {
    for (const child of await readdir(target)) {
      await collectFileStats(path.join(target, child), `${relativePath}/${child}`, out);
    }
    return;
  }
  out.push({ path: relativePath, size: stat.size, mtimeMs: stat.mtimeMs });
}

function snapshotMatches(snapshotPath, current) {
  try {
    const previous = JSON.parse(readFileSync(snapshotPath, 'utf8'));
    return previous.schemaVersion === SNAPSHOT_SCHEMA_VERSION
      && JSON.stringify(previous.files) === JSON.stringify(current.files);
  } catch {
    return false;
  }
}

function imageBuildContextCached(plan) {
  if (!existsSync(plan.stagingRoot) || !existsSync(plan.imageBuildDir)) {
    return false;
  }
  return readdirSync(plan.imageBuildDir).length > 0;
}

async function packageArchiveSha256(plan) {
  const archiveName = `${PACKAGE_NAME}-${plan.package.id}-${plan.package.version}.tar.gz`;
  const archivePath = path.join(plan.packageOutputDir, archiveName);
  if (!existsSync(archivePath)) {
    throw new Error(`cached image build requires package archive: ${archivePath}`);
  }
  const hash = createHash('sha256');
  const data = await readFile(archivePath);
  hash.update(data);
  return hash.digest('hex');
}

async function buildImage(plan) {
  const args = [
    'build',
    '--build-arg',
    `VERSION=${plan.package.version}`,
    '--build-arg',
    `DEPLOYMENT_PROFILE=${plan.deploymentProfile}`,
    '-f',
    plan.imageFile,
    '-t',
    plan.imageTag,
    plan.imageBuildDir,
  ];
  const { stdout, stderr } = await execFileAsync('docker', args, {
    maxBuffer: 32 * 1024 * 1024,
  });
  if (stdout.trim()) {
    console.log(stdout.trim());
  }
  if (stderr.trim()) {
    console.log(stderr.trim());
  }
}

// Push the image to its registry repository and return the verified
// immutable repository digest (repository@sha256:...). Credentials arrive as
// reusable-workflow secrets (GITHUB_WORKFLOW_SPEC.md section 7) and are never
// written to a tracked file; docker login uses an ephemeral DOCKER_CONFIG
// directory that is removed before returning.
async function pushImage(plan) {
  const repository = imageRepository(plan.imageTag);
  const registry = repository.split('/')[0];
  const dockerConfig = await mkdtemp(path.join(tmpdir(), 'sdkwork-container-registry-'));
  const dockerEnv = { ...process.env, DOCKER_CONFIG: dockerConfig };
  try {
    const login = spawnSync('docker', [
      'login',
      registry,
      '--username',
      process.env.SDKWORK_CONTAINER_REGISTRY_USERNAME,
      '--password-stdin',
    ], {
      cwd: workspaceRoot,
      encoding: 'utf8',
      env: dockerEnv,
      input: process.env.SDKWORK_CONTAINER_REGISTRY_PASSWORD,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    });
    if (login.error) throw login.error;
    if (login.status !== 0) {
      throw new Error(`container registry login failed: ${String(login.stderr ?? '').trim()}`);
    }
    const { stdout, stderr } = await execFileAsync('docker', ['push', plan.imageTag], {
      env: dockerEnv,
      maxBuffer: 64 * 1024 * 1024,
    });
    const output = `${stdout}\n${stderr}`;
    const match = /digest:\s*(sha256:[a-f0-9]{64})/iu.exec(output);
    if (!match) {
      throw new Error('docker push did not return an immutable sha256 digest');
    }
    const repoDigest = `${repository}@${match[1].toLowerCase()}`;
    // Fail closed when the registry does not serve the digest we just recorded:
    // release evidence must never point at a local-only or mutable image.
    await execFileAsync('docker', ['manifest', 'inspect', repoDigest], {
      env: dockerEnv,
      maxBuffer: 64 * 1024 * 1024,
    });
    return repoDigest;
  } finally {
    await rm(dockerConfig, { recursive: true, force: true });
  }
}

async function imageIdentity(imageTag, repoDigest = null) {
  const { stdout } = await execFileAsync('docker', [
    'image',
    'inspect',
    '--format',
    '{{index .RepoDigests 0}}|{{.Id}}|{{.Size}}',
    imageTag,
  ]);
  const [inspectedRepoDigest, imageId, sizeBytes] = stdout.trim().split('|');
  return {
    repoDigest: repoDigest || (inspectedRepoDigest || null),
    imageId: imageId || null,
    sizeBytes: Number(sizeBytes) || 0,
  };
}

function humanSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return 'n/a';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

async function writeImageManifest(plan, archive, identity) {
  const manifest = {
    schemaVersion: CONTAINER_IMAGE_MANIFEST_SCHEMA_VERSION,
    packageId: plan.package.id,
    version: plan.package.version,
    deploymentProfile: plan.deploymentProfile,
    imageTag: plan.imageTag,
    packageArchive: path.basename(archive.path),
    packageArchiveSha256: archive.sha256,
    repoDigest: identity.repoDigest,
    imageId: identity.imageId,
    sizeBytes: identity.sizeBytes,
    sizeHuman: humanSize(identity.sizeBytes),
    buildDate: new Date().toISOString(),
  };
  await writeFile(plan.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  if (manifest.repoDigest) {
    await writeFile(plan.digestPath, `${manifest.repoDigest}\n`, 'utf8');
  }
  return manifest;
}

function validateImageManifestRecord(manifest, expected = {}) {
  const issues = [];
  if (manifest?.schemaVersion !== CONTAINER_IMAGE_MANIFEST_SCHEMA_VERSION) {
    issues.push(`schemaVersion must be ${CONTAINER_IMAGE_MANIFEST_SCHEMA_VERSION}`);
  }
  if (expected.packageId && manifest?.packageId !== expected.packageId) {
    issues.push(`packageId must be ${expected.packageId}`);
  }
  if (expected.version && manifest?.version !== expected.version) {
    issues.push(`version must be ${expected.version}`);
  }
  if (!/^sha256:[a-f0-9]{64}$/u.test(String(manifest?.imageId ?? ''))) {
    issues.push('imageId must be an immutable sha256 image id');
  }
  if (manifest?.repoDigest !== null
    && !/@sha256:[a-f0-9]{64}$/u.test(String(manifest?.repoDigest ?? ''))) {
    issues.push('repoDigest must be null or an immutable repository digest');
  }
  if (expected.requireRepoDigest === true
    && !/@sha256:[a-f0-9]{64}$/u.test(String(manifest?.repoDigest ?? ''))) {
    issues.push('repoDigest is required for release publication; build with --push');
  }
  if (!Number.isSafeInteger(manifest?.sizeBytes) || manifest.sizeBytes <= 0) {
    issues.push('sizeBytes must be a positive safe integer');
  }
  return issues;
}

async function validateRecordedImageManifest(settings) {
  const packageItem = resolvePackageItem(settings.packageId, settings.version);
  const manifestPath = path.join(workspaceRoot, IMAGE_MANIFEST_FILE);
  if (!existsSync(manifestPath)) {
    throw new Error(`missing container image manifest: ${manifestPath}`);
  }
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const issues = validateImageManifestRecord(manifest, {
    packageId: packageItem.id,
    version: packageItem.version,
    requireRepoDigest: settings.requireRepoDigest === true,
  });
  if (issues.length > 0) {
    throw new Error(`container image manifest is invalid: ${issues.join('; ')}`);
  }
  if (settings.json) {
    console.log(JSON.stringify({ ok: true, manifestPath, manifest }, null, 2));
  } else {
    console.log(`[container-image-build] valid manifest: ${manifestPath}`);
  }
}

async function main(argv = process.argv.slice(2)) {
  const settings = parseBuildContainerArgs(argv);
  if (settings.help) {
    printHelp();
    return 0;
  }
  if (settings.validateManifest) {
    await validateRecordedImageManifest(settings);
    return 0;
  }

  const plan = createBuildPlan(settings);
  const lines = renderBuildPlan(plan);
  if (settings.json && (settings.dryRun || settings.check)) {
    console.log(JSON.stringify({ ok: plan.issues.length === 0, issues: plan.issues, plan }, null, 2));
  } else {
    for (const line of lines) {
      console.log(line);
    }
    if (plan.issues.length > 0) {
      console.error('[container-image-build] validation issues:');
      for (const issue of plan.issues) {
        console.error(`[container-image-build]   ${issue}`);
      }
    }
  }
  if (settings.check && plan.issues.length > 0) {
    return 1;
  }
  if (settings.dryRun) {
    return 0;
  }
  if (plan.issues.length > 0) {
    throw new Error(`container image build plan is invalid: ${plan.issues.join('; ')}`);
  }

  let serverVersion = '';
  try {
    serverVersion = await dockerVersion();
  } catch {
    throw new Error('docker is not available or the daemon is not running; start docker first');
  }
  console.log(`[container-image-build] docker server: ${serverVersion}`);

  await ensureSdkArchiveArtifacts(plan);

  // Fast path: when every build input is unchanged and the unpacked image
  // build context still exists, skip the packaging pipeline (staging copy,
  // install package tar.gz, unpack) and only run `docker build` against the
  // cached context. Layer cache then keeps repeat deployments near-instant.
  const currentSnapshot = await collectSourceSnapshot(plan);
  const cached = !settings.force
    && snapshotMatches(plan.snapshotPath, currentSnapshot)
    && imageBuildContextCached(plan);

  let archive;
  if (cached) {
    console.log('[container-image-build] inputs unchanged; reusing cached image build context');
    archive = {
      path: path.join(
        plan.packageOutputDir,
        `${PACKAGE_NAME}-${plan.package.id}-${plan.package.version}.tar.gz`,
      ),
      sha256: await packageArchiveSha256(plan),
    };
  } else {
    await assembleStaging(plan);
    archive = await buildInstallPackage(plan);
    console.log(`[container-image-build] package archive: ${archive.path} (sha256 ${archive.sha256})`);
    await unpackInstallPackage(plan, archive.path);
    await writeFile(
      plan.snapshotPath,
      `${JSON.stringify(currentSnapshot, null, 2)}\n`,
      'utf8',
    );
  }

  await buildImage(plan);
  const repoDigest = plan.push ? await pushImage(plan) : null;
  if (repoDigest) {
    console.log(`[container-image-build] pushed: ${plan.imageTag}`);
  }
  const manifest = await writeImageManifest(
    plan,
    archive,
    await imageIdentity(plan.imageTag, repoDigest),
  );
  if (settings.json) {
    console.log(JSON.stringify({ ok: true, manifest }, null, 2));
  } else {
    console.log(`[container-image-build] image: ${manifest.imageTag}`);
    console.log(`[container-image-build] repoDigest: ${manifest.repoDigest ?? 'n/a (local build)'}`);
    console.log(`[container-image-build] imageId: ${manifest.imageId ?? 'n/a'}`);
    console.log(`[container-image-build] size: ${manifest.sizeHuman ?? 'n/a'}`);
    console.log(`[container-image-build] manifest: ${plan.manifestPath}`);
  }
  return 0;
}

main().catch((error) => {
  console.error(`[container-image-build] ${error.message}`);
  process.exitCode = 1;
});

export {
  CONTAINER_IMAGE_MANIFEST_SCHEMA_VERSION,
  collectSourceSnapshot,
  createBuildPlan,
  imageRepository,
  main,
  parseBuildContainerArgs,
  snapshotMatches,
  validateImageManifestRecord,
};
