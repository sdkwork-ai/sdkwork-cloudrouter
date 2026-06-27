#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmod,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import {
  AGGREGATE_MANIFEST_FILE,
  PACKAGE_MANIFEST_FILE,
  createAggregateManifest,
  createGeneratedArtifactBytes,
  createInstallConfiguration,
  createInstallPackageBuildPlan,
  createPackageManifest,
  createTar,
  defaultInstallPackageOutputDir,
  defaultStagingRoot,
  modeForArchivePath,
  resolveManifestGeneratedAt,
  sha256,
  validateInstallPackageBuildPlan,
} from './build-claw-router-install-package.mjs';
import {
  DEFAULT_VERSION,
  PACKAGE_NAME,
  LINUX_SERVICE_CONFIG_ROOT,
  LINUX_SERVICE_DATA_ROOT,
  LINUX_SERVICE_LOG_ROOT,
  LINUX_SERVICE_RUNTIME_ROOT,
  LINUX_SHARED_DOC_ROOT,
  LINUX_SHARED_ROOT,
  MACOS_SHARED_DOC_ROOT,
  MACOS_SHARED_ROOT,
  MACOS_SERVICE_ROOT,
  POSIX_INSTALL_ROOT,
  RUNTIME_DISPLAY_NAME,
  USER_PRIVATE_ROUTER_ROOT,
  WINDOWS_INSTALL_ROOT,
  WINDOWS_SYSTEM_ROOT,
  artifactIdForPackage,
  createInstallPackagePlan,
  RUNTIME_CONFIG_TEMPLATE_PATH,
  validateInstallPackagePlan,
} from './plan-claw-router-install-packages.mjs';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');
const NATIVE_INSTALLER_SCHEMA_VERSION = '2026-05-16.native-installer-build.v1';
const NATIVE_INSTALL_LAYOUT_SCHEMA_VERSION = '2026-05-16.native-install-layout.v1';
const NATIVE_INSTALLER_DEPLOYMENT_MODES = Object.freeze(['service', 'desktop']);
const WINDOWS_UPGRADE_CODE = '9D40C7E8-CE6F-4AB3-9D91-1E969070D7E2';
const LINUX_NATIVE_INSTALL_ROOT = LINUX_SERVICE_RUNTIME_ROOT;
const LINUX_NATIVE_BIN_DIR = '/usr/bin';
const LINUX_NATIVE_SHARED_ROOT = LINUX_SHARED_ROOT;
const LINUX_NATIVE_SHARED_DOC_ROOT = LINUX_SHARED_DOC_ROOT;
const MACOS_NATIVE_SHARED_ROOT = MACOS_SHARED_ROOT;
const MACOS_NATIVE_SHARED_DOC_ROOT = MACOS_SHARED_DOC_ROOT;

function printHelp() {
  console.log(`Usage: node scripts/build-claw-router-native-installer.mjs [options]

Build platform-native install packages from staged production files.

Native package mapping:
  linux service/desktop   .deb
  macos service/desktop   .pkg
  windows service/desktop .msi

Options:
  --package-id <id>    service or desktop package id from install package plan.
  --all                Validate or build all native installer package ids.
  --staging-root <dir> Directory containing staged package files.
  --output-dir <dir>   Output directory (default dist/install-packages).
  --version <value>    Product package version (default ${DEFAULT_VERSION}).
  --check              Validate the native installer build plan.
  --dry-run            Print the native installer build plan without writing packages.
  --json               Print machine-readable JSON.
  -h, --help           Show this help.
`);
}

function parseNativeInstallerBuildArgs(argv = process.argv.slice(2)) {
  const settings = {
    all: false,
    check: false,
    dryRun: false,
    help: false,
    json: false,
    outputDir: null,
    packageId: currentHostNativePackageId(process.platform, process.arch),
    stagingRoot: null,
    version: DEFAULT_VERSION,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      continue;
    }
    switch (arg) {
      case '--all':
        settings.all = true;
        break;
      case '--check':
        settings.check = true;
        break;
      case '--dry-run':
        settings.dryRun = true;
        break;
      case '--json':
        settings.json = true;
        break;
      case '--package-id':
        settings.packageId = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--staging-root':
        settings.stagingRoot = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--output-dir':
        settings.outputDir = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--version':
        settings.version = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--help':
      case '-h':
        settings.help = true;
        break;
      default:
        throw new Error(`Unsupported native installer build option: ${arg}`);
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

function createNativeInstallerBuildPlan({
  packageId = currentHostNativePackageId(process.platform, process.arch),
  stagingRoot = defaultStagingRoot(workspaceRoot),
  outputDir = defaultInstallPackageOutputDir(workspaceRoot),
  version = DEFAULT_VERSION,
  root = workspaceRoot,
  requireStagedFiles = true,
} = {}) {
  const installPlan = createInstallPackagePlan({ version });
  const planIssues = validateInstallPackagePlan(installPlan);
  if (planIssues.length > 0) {
    throw new Error(`install package plan is invalid: ${planIssues.join('; ')}`);
  }

  const packageItem = installPlan.packages.find((item) => item.id === packageId);
  if (!packageItem) {
    throw new Error(`Unknown native installer package id: ${packageId}`);
  }
  if (!NATIVE_INSTALLER_DEPLOYMENT_MODES.includes(packageItem.deploymentMode)) {
    throw new Error(`${packageId} is not a native installer package; use archive builder for ${packageItem.deploymentMode}`);
  }

  const archiveBuildPlan = createInstallPackageBuildPlan({
    packageId,
    stagingRoot,
    outputDir,
    version,
    root,
    requireStagedFiles,
  });
  const absoluteOutputDir = path.resolve(root, outputDir);
  const installerName = nativeInstallerNameForPackage(packageItem);

  return {
    schemaVersion: NATIVE_INSTALLER_SCHEMA_VERSION,
    package: packageItem,
    nativeFormat: nativeInstallerFormatForPlatform(packageItem.platform),
    buildTool: nativeInstallerToolForPlatform(packageItem.platform),
    nativeInstallLayout: createNativeInstallLayout(packageItem),
    installerName,
    installerPath: path.join(absoluteOutputDir, installerName),
    manifestPath: path.join(absoluteOutputDir, installerName.replace(/\.(deb|pkg|msi)$/u, '.manifest.json')),
    aggregateManifestPath: path.join(absoluteOutputDir, AGGREGATE_MANIFEST_FILE),
    stagingRoot: archiveBuildPlan.stagingRoot,
    outputDir: absoluteOutputDir,
    archiveBuildPlan,
  };
}

function validateNativeInstallerBuildPlan(plan) {
  const issues = [];
  if (plan.schemaVersion !== NATIVE_INSTALLER_SCHEMA_VERSION) {
    issues.push(`schemaVersion must be ${NATIVE_INSTALLER_SCHEMA_VERSION}`);
  }
  if (!plan.package?.id) {
    issues.push('package id is required');
  }
  if (!NATIVE_INSTALLER_DEPLOYMENT_MODES.includes(plan.package?.deploymentMode)) {
    issues.push(`${plan.package?.id ?? '(missing id)'} must be service or desktop deployment mode`);
  }
  const expectedFormat = nativeInstallerFormatForPlatform(plan.package?.platform);
  if (plan.nativeFormat !== expectedFormat) {
    issues.push(`${plan.package?.id} nativeFormat must be ${expectedFormat}`);
  }
  if (!plan.installerPath || !plan.installerPath.endsWith(plan.installerName)) {
    issues.push('installerPath must end with installerName');
  }
  const archiveIssues = validateInstallPackageBuildPlan(plan.archiveBuildPlan ?? {});
  issues.push(...archiveIssues.map((issue) => `${plan.package?.id}: ${issue}`));
  if (plan.package?.platform === 'macos' && process.platform !== 'darwin') {
    issues.push(`${plan.package.id} .pkg build requires macOS pkgbuild; use --dry-run on non-macOS hosts`);
  }
  if (plan.package?.platform === 'windows' && process.platform !== 'win32') {
    issues.push(`${plan.package.id} .msi build requires Windows WiX tooling; use --dry-run on non-Windows hosts`);
  }
  return issues;
}

async function buildNativeInstaller(plan) {
  const issues = validateNativeInstallerBuildPlan(plan);
  if (issues.length > 0) {
    throw new Error(`native installer build plan is invalid: ${issues.join('; ')}`);
  }
  await mkdir(plan.outputDir, { recursive: true });

  const generatedAt = resolveManifestGeneratedAt();
  const packageFiles = await collectPackageFileEntries(plan.archiveBuildPlan, { generatedAt });
  if (plan.package.platform === 'linux') {
    await writeFile(plan.installerPath, createDebianPackage(plan, packageFiles.fileEntries));
  } else if (plan.package.platform === 'macos') {
    await buildMacosPkg(plan, packageFiles.fileEntries);
  } else if (plan.package.platform === 'windows') {
    await buildWindowsMsi(plan, packageFiles.fileEntries);
  } else {
    throw new Error(`Unsupported native installer platform: ${plan.package.platform}`);
  }

  const installerBytes = await readFile(plan.installerPath);
  await writeFile(plan.manifestPath, `${JSON.stringify(packageFiles.manifest, null, 2)}\n`, 'utf8');
  const installer = {
    file: path.basename(plan.installerPath),
    packageId: plan.package.id,
    version: plan.package.version,
    kind: 'native-installer',
    format: plan.nativeFormat,
    size: installerBytes.length,
    sha256: sha256(installerBytes),
  };
  const aggregateManifest = createAggregateManifest(plan, installer, { generatedAt });
  await writeFile(
    plan.aggregateManifestPath,
    `${JSON.stringify(aggregateManifest, null, 2)}\n`,
    'utf8',
  );

  return {
    installer,
    installerPath: plan.installerPath,
    manifest: packageFiles.manifest,
    manifestPath: plan.manifestPath,
    aggregateManifest,
    aggregateManifestPath: plan.aggregateManifestPath,
  };
}

async function collectPackageFileEntries(archiveBuildPlan, options = {}) {
  const artifactFiles = [];
  const generatedArtifacts = [];
  const fileEntries = [];

  for (const entry of archiveBuildPlan.entries.filter((item) => !item.generated)) {
    const data = await readFile(entry.sourcePath);
    artifactFiles.push({
      path: entry.archivePath,
      size: data.length,
      sha256: sha256(data),
    });
    fileEntries.push({
      relativePath: entry.archivePath,
      data,
      mode: entry.mode ?? modeForArchivePath(entry.archivePath),
    });
  }
  for (const entry of archiveBuildPlan.entries.filter((item) => item.generated && item.archivePath !== PACKAGE_MANIFEST_FILE)) {
    const data = createGeneratedArtifactBytes(archiveBuildPlan, entry);
    generatedArtifacts.push({
      kind: entry.generatedKind,
      path: entry.archivePath,
      size: data.length,
      sha256: sha256(data),
    });
    fileEntries.push({
      relativePath: entry.archivePath,
      data,
      mode: entry.mode ?? modeForArchivePath(entry.archivePath),
    });
  }

  const manifest = {
    ...createPackageManifest(archiveBuildPlan, artifactFiles, generatedArtifacts, options),
    nativeInstall: createNativeInstallLayout(archiveBuildPlan.package),
  };
  fileEntries.push({
    relativePath: PACKAGE_MANIFEST_FILE,
    data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
    mode: 0o644,
  });

  return {
    fileEntries: fileEntries.sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
    manifest,
  };
}

function createNativeInstallLayout(packageItem) {
  if (packageItem.platform === 'linux') {
    return createLinuxNativeInstallLayout(packageItem);
  }
  if (packageItem.platform === 'macos') {
    return createMacosNativeInstallLayout(packageItem);
  }
  if (packageItem.platform === 'windows') {
    return createWindowsNativeInstallLayout(packageItem);
  }
  throw new Error(`Unsupported native install layout platform: ${packageItem.platform}`);
}

function createBaseNativeInstallLayout(packageItem, { format, installRoot, files, service = null, permissions = [], commands = {} }) {
  return {
    schemaVersion: NATIVE_INSTALL_LAYOUT_SCHEMA_VERSION,
    packageId: packageItem.id,
    platform: packageItem.platform,
    architecture: packageItem.architecture,
    deploymentMode: packageItem.deploymentMode,
    runtimeProfile: packageItem.runtimeProfile,
    format,
    installRoot,
    files,
    service,
    permissions,
    commands,
  };
}

function createLinuxNativeInstallLayout(packageItem) {
  const isService = packageItem.deploymentMode === 'service';
  const files = {
    binary: `${LINUX_NATIVE_BIN_DIR}/${packageItem.binaryName}`,
    installer: `${LINUX_NATIVE_BIN_DIR}/${packageItem.installerBinaryName}`,
    privateBinary: `${LINUX_NATIVE_INSTALL_ROOT}/bin/${packageItem.binaryName}`,
    privateInstaller: `${LINUX_NATIVE_INSTALL_ROOT}/bin/${packageItem.installerBinaryName}`,
    portal: `${LINUX_NATIVE_INSTALL_ROOT}/portal/dist`,
    documentation: `${LINUX_NATIVE_SHARED_DOC_ROOT}/INSTALL.md`,
    installManifest: `${LINUX_NATIVE_SHARED_ROOT}/install-manifest.json`,
    releaseEnvTemplate: isService
      ? `${LINUX_SERVICE_CONFIG_ROOT}/.env.release.example`
      : `${USER_PRIVATE_ROUTER_ROOT}/config/.env.release.example`,
    runtimeConfig: isService
      ? `${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml`
      : packageItem.databasePolicy.configFile.path,
    runtimeConfigTemplate: isService
      ? `${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml.example`
      : `${LINUX_NATIVE_SHARED_ROOT}/config/clawrouter.toml.example`,
    dataDirectory: packageItem.databasePolicy.dataDirectory.path,
  };

  if (isService) {
    files.serviceEnvironment = `${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.env`;
    files.passwordFile = `${LINUX_SERVICE_CONFIG_ROOT}/database.secret`;
    files.redisPasswordFile = `${LINUX_SERVICE_CONFIG_ROOT}/redis.secret`;
    files.systemdUnit = '/lib/systemd/system/clawrouter.service';
  }

  return createBaseNativeInstallLayout(packageItem, {
    format: 'deb',
    installRoot: LINUX_NATIVE_INSTALL_ROOT,
    files,
    service: isService
      ? {
        manager: 'systemd',
        name: 'clawrouter.service',
        unitPath: '/lib/systemd/system/clawrouter.service',
        enabledOnInstall: true,
        startedOnInstall: false,
      }
      : null,
    permissions: isService
      ? [
        { path: LINUX_NATIVE_INSTALL_ROOT, owner: 'root', group: 'root', mode: '0755' },
        { path: `${LINUX_NATIVE_INSTALL_ROOT}/bin`, owner: 'root', group: 'root', mode: '0755' },
        { path: `${LINUX_NATIVE_BIN_DIR}/${packageItem.binaryName}`, owner: 'root', group: 'root', mode: '0755' },
        { path: `${LINUX_NATIVE_BIN_DIR}/${packageItem.installerBinaryName}`, owner: 'root', group: 'root', mode: '0755' },
        { path: LINUX_SERVICE_CONFIG_ROOT, owner: 'root', group: 'sdkwork', mode: '0750' },
        { path: `${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml`, owner: 'root', group: 'sdkwork', mode: '0640' },
        { path: `${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml.example`, owner: 'root', group: 'sdkwork', mode: '0640' },
        { path: `${LINUX_SERVICE_CONFIG_ROOT}/.env.release.example`, owner: 'root', group: 'sdkwork', mode: '0640' },
        { path: `${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.env`, owner: 'root', group: 'sdkwork', mode: '0640' },
        { path: `${LINUX_SERVICE_CONFIG_ROOT}/database.secret`, owner: 'root', group: 'sdkwork', mode: '0640' },
        { path: `${LINUX_SERVICE_CONFIG_ROOT}/redis.secret`, owner: 'root', group: 'sdkwork', mode: '0640' },
        { path: LINUX_SERVICE_DATA_ROOT, owner: 'sdkwork', group: 'sdkwork', mode: '0750' },
        { path: LINUX_SERVICE_LOG_ROOT, owner: 'sdkwork', group: 'sdkwork', mode: '0750' },
      ]
      : [
        { path: LINUX_NATIVE_INSTALL_ROOT, owner: 'root', group: 'root', mode: '0755' },
        { path: `${LINUX_NATIVE_INSTALL_ROOT}/bin`, owner: 'root', group: 'root', mode: '0755' },
        { path: `${LINUX_NATIVE_BIN_DIR}/${packageItem.binaryName}`, owner: 'root', group: 'root', mode: '0755' },
        { path: `${LINUX_NATIVE_BIN_DIR}/${packageItem.installerBinaryName}`, owner: 'root', group: 'root', mode: '0755' },
        { path: LINUX_NATIVE_SHARED_ROOT, owner: 'root', group: 'root', mode: '0755' },
      ],
    commands: isService
      ? {
        configure: [
          `sudo editor ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml`,
          `sudo editor ${LINUX_SERVICE_CONFIG_ROOT}/database.secret`,
        ],
        start: 'sudo systemctl start clawrouter',
        status: 'sudo systemctl status clawrouter --no-pager',
        logs: 'sudo journalctl -u clawrouter -f',
      }
      : {
        initialize: `${LINUX_NATIVE_BIN_DIR}/${packageItem.installerBinaryName} ensure`,
        start: `${LINUX_NATIVE_BIN_DIR}/${packageItem.binaryName}`,
      },
  });
}

function createMacosNativeInstallLayout(packageItem) {
  const isService = packageItem.deploymentMode === 'service';
  const configRoot = MACOS_SERVICE_ROOT;
  const sharedTemplatePath = `${MACOS_NATIVE_SHARED_ROOT}/config/clawrouter.toml.example`;
  const serviceInstallRoot = configRoot;
  const installRoot = isService ? serviceInstallRoot : POSIX_INSTALL_ROOT;
  const files = {
    binary: `${installRoot}/bin/${packageItem.binaryName}`,
    installer: `${installRoot}/bin/${packageItem.installerBinaryName}`,
    portal: `${installRoot}/portal/dist`,
    documentation: `${MACOS_NATIVE_SHARED_DOC_ROOT}/INSTALL.md`,
    installManifest: `${MACOS_NATIVE_SHARED_ROOT}/install-manifest.json`,
    releaseEnvTemplate: isService
      ? `${configRoot}/.env.release.example`
      : `${USER_PRIVATE_ROUTER_ROOT}/config/.env.release.example`,
    runtimeConfig: packageItem.databasePolicy.configFile.path,
    runtimeConfigTemplate: isService ? `${configRoot}/clawrouter.toml.example` : sharedTemplatePath,
    dataDirectory: packageItem.databasePolicy.dataDirectory.path,
  };
  if (packageItem.databasePolicy.passwordFile?.path) {
    files.passwordFile = packageItem.databasePolicy.passwordFile.path;
  }
  if (packageItem.redisPolicy.passwordFile?.path) {
    files.redisPasswordFile = packageItem.redisPolicy.passwordFile.path;
  }
  if (isService) {
    files.launchDaemon = '/Library/LaunchDaemons/com.sdkwork.clawrouter.plist';
    files.serviceRunner = `${serviceInstallRoot}/service/macos/clawrouter-service-runner`;
  }

  return createBaseNativeInstallLayout(packageItem, {
    format: 'pkg',
    installRoot,
    files,
    service: isService
      ? {
        manager: 'launchd',
        name: 'com.sdkwork.clawrouter',
        unitPath: '/Library/LaunchDaemons/com.sdkwork.clawrouter.plist',
        enabledOnInstall: false,
        startedOnInstall: false,
      }
      : null,
    permissions: isService
      ? [
        { path: configRoot, owner: 'root', group: 'wheel', mode: '0750' },
        { path: `${configRoot}/bin`, owner: 'root', group: 'wheel', mode: '0755' },
        { path: `${configRoot}/service`, owner: 'root', group: 'wheel', mode: '0755' },
        { path: `${configRoot}/service/macos`, owner: 'root', group: 'wheel', mode: '0755' },
        { path: `${configRoot}/.env.release.example`, owner: 'root', group: 'wheel', mode: '0640' },
        { path: `${configRoot}/clawrouter.toml.example`, owner: 'root', group: 'wheel', mode: '0640' },
        { path: `${configRoot}/clawrouter.toml`, owner: 'root', group: 'wheel', mode: '0640' },
        { path: LINUX_SERVICE_LOG_ROOT, owner: 'root', group: 'wheel', mode: '0750' },
        { path: '/Library/LaunchDaemons/com.sdkwork.clawrouter.plist', owner: 'root', group: 'wheel', mode: '0644' },
      ]
      : [
        { path: POSIX_INSTALL_ROOT, owner: 'root', group: 'wheel', mode: '0755' },
        { path: `${POSIX_INSTALL_ROOT}/bin`, owner: 'root', group: 'wheel', mode: '0755' },
        { path: `${MACOS_NATIVE_SHARED_ROOT}/config`, owner: 'root', group: 'wheel', mode: '0755' },
      ],
    commands: isService
      ? {
        configure: [
          `sudo editor "${packageItem.databasePolicy.configFile.path}"`,
          `sudo editor "${packageItem.databasePolicy.passwordFile.path}"`,
        ],
        start: 'sudo launchctl bootstrap system /Library/LaunchDaemons/com.sdkwork.clawrouter.plist',
        status: 'sudo launchctl print system/com.sdkwork.clawrouter',
      }
      : {
        initialize: `${POSIX_INSTALL_ROOT}/bin/${packageItem.installerBinaryName} ensure`,
        start: `${POSIX_INSTALL_ROOT}/bin/${packageItem.binaryName}`,
      },
  });
}

function createWindowsNativeInstallLayout(packageItem) {
  const isService = packageItem.deploymentMode === 'service';
  const installRoot = WINDOWS_INSTALL_ROOT;
  const files = {
    binary: `${installRoot}/bin/${packageItem.binaryName}`,
    installer: `${installRoot}/bin/${packageItem.installerBinaryName}`,
    portal: `${installRoot}/portal/dist`,
    documentation: `${installRoot}/INSTALL.md`,
    installManifest: `${installRoot}/install-manifest.json`,
    releaseEnvTemplate: `${WINDOWS_SYSTEM_ROOT}/.env.release.example`,
    runtimeConfig: packageItem.databasePolicy.configFile.path,
    runtimeConfigTemplate: `${WINDOWS_SYSTEM_ROOT}/clawrouter.toml.example`,
    dataDirectory: packageItem.databasePolicy.dataDirectory.path,
  };
  if (packageItem.databasePolicy.passwordFile?.path) {
    files.passwordFile = packageItem.databasePolicy.passwordFile.path;
  }
  if (packageItem.redisPolicy.passwordFile?.path) {
    files.redisPasswordFile = packageItem.redisPolicy.passwordFile.path;
  }
  if (isService) {
    files.serviceManifest = `${installRoot}/service/windows/clawrouter.xml`;
  }

  return createBaseNativeInstallLayout(packageItem, {
    format: 'msi',
    installRoot,
    files,
    service: isService
      ? {
        manager: 'windows-service',
        name: 'clawrouter',
        unitPath: `${installRoot}/service/windows/clawrouter.xml`,
        enabledOnInstall: false,
        startedOnInstall: false,
      }
      : null,
    permissions: [
      { path: installRoot, owner: 'SYSTEM', group: 'Administrators', mode: 'inherited-programfiles-acl' },
      { path: WINDOWS_SYSTEM_ROOT, owner: 'SYSTEM', group: 'Administrators', mode: 'inherited-programdata-acl' },
      { path: `${WINDOWS_SYSTEM_ROOT}/.env.release.example`, owner: 'SYSTEM', group: 'Administrators', mode: 'inherited-programdata-acl' },
      { path: `${WINDOWS_SYSTEM_ROOT}/clawrouter.toml.example`, owner: 'SYSTEM', group: 'Administrators', mode: 'inherited-programdata-acl' },
      ...(isService
        ? [
          { path: packageItem.databasePolicy.configFile.path, owner: 'SYSTEM', group: 'Administrators', mode: 'inherited-programdata-acl' },
          { path: packageItem.databasePolicy.passwordFile.path, owner: 'SYSTEM', group: 'Administrators', mode: 'inherited-programdata-acl' },
          { path: packageItem.redisPolicy.passwordFile.path, owner: 'SYSTEM', group: 'Administrators', mode: 'inherited-programdata-acl' },
          { path: packageItem.databasePolicy.dataDirectory.path, owner: 'SYSTEM', group: 'Administrators', mode: 'inherited-programdata-acl' },
        ]
        : [
          { path: packageItem.databasePolicy.configFile.path, owner: 'current-user', group: 'current-user', mode: 'user-profile-acl' },
          { path: packageItem.databasePolicy.dataDirectory.path, owner: 'current-user', group: 'current-user', mode: 'user-profile-acl' },
        ]),
    ],
    commands: isService
      ? {
        configure: [
          `notepad ${packageItem.databasePolicy.configFile.path}`,
          `notepad ${packageItem.databasePolicy.passwordFile.path}`,
        ],
        installService: `${installRoot}/bin/${packageItem.installerBinaryName} ensure`,
        start: 'sc.exe start clawrouter',
        status: 'sc.exe query clawrouter',
      }
      : {
        initialize: `${installRoot}/bin/${packageItem.installerBinaryName} ensure`,
        start: `${installRoot}/bin/${packageItem.binaryName}`,
      },
  });
}

function createDebianPackage(plan, fileEntries) {
  const controlTar = createTar([
    {
      relativePath: './control',
      data: Buffer.from(createDebianControl(plan), 'utf8'),
      mode: 0o644,
    },
    {
      relativePath: './postinst',
      data: Buffer.from(createDebianPostinst(plan), 'utf8'),
      mode: 0o755,
    },
    {
      relativePath: './prerm',
      data: Buffer.from(createDebianPrerm(plan), 'utf8'),
      mode: 0o755,
    },
  ]);
  const dataTar = createTar(withDebianDirectoryEntries(
    fileEntries.flatMap((entry) => debianDataEntriesForPackageFile(plan, entry)),
  ));
  return createArArchive([
    {
      name: 'debian-binary',
      data: Buffer.from('2.0\n', 'utf8'),
      mode: 0o644,
    },
    {
      name: 'control.tar.gz',
      data: gzipSync(controlTar, { mtime: 0 }),
      mode: 0o644,
    },
    {
      name: 'data.tar.gz',
      data: gzipSync(dataTar, { mtime: 0 }),
      mode: 0o644,
    },
  ]);
}

function createDebianControl(plan) {
  const packageItem = plan.package;
  return [
    `Package: ${PACKAGE_NAME}`,
    `Version: ${debianVersion(packageItem.version)}`,
    'Section: utils',
    'Priority: optional',
    `Architecture: ${debianArchitecture(packageItem.architecture)}`,
    'Maintainer: SdkWork Cloud <release@sdkwork.cloud>',
    'Homepage: https://github.com/Sdkwork-Cloud/sdkwork-clawrouter',
    `Description: ${RUNTIME_DISPLAY_NAME} edge runtime`,
    ` Native ${packageItem.deploymentMode} installer for ${packageItem.platform}-${packageItem.architecture}.`,
    ' Installs the edge gateway, installer utility, production portal assets, runtime',
    ' configuration template, and platform service metadata without packaging secrets.',
    '',
  ].join('\n');
}

function createDebianPostinst(plan) {
  if (plan.package.deploymentMode === 'desktop') {
    return createDebianDesktopPostinst(plan);
  }

  return [
    '#!/bin/sh',
    'set -e',
    'if ! getent group sdkwork >/dev/null; then',
    '  groupadd --system sdkwork',
    'fi',
    'if ! id -u sdkwork >/dev/null 2>&1; then',
    `  useradd --system --gid sdkwork --home-dir ${LINUX_SERVICE_DATA_ROOT} --shell /usr/sbin/nologin sdkwork`,
    'fi',
    `mkdir -p ${LINUX_SERVICE_CONFIG_ROOT} ${LINUX_SERVICE_DATA_ROOT} ${LINUX_SERVICE_LOG_ROOT}`,
    `chown root:root ${LINUX_NATIVE_INSTALL_ROOT} ${LINUX_NATIVE_INSTALL_ROOT}/bin ${LINUX_NATIVE_BIN_DIR}/${plan.package.binaryName} ${LINUX_NATIVE_BIN_DIR}/${plan.package.installerBinaryName}`,
    `chmod 0755 ${LINUX_NATIVE_INSTALL_ROOT} ${LINUX_NATIVE_INSTALL_ROOT}/bin ${LINUX_NATIVE_BIN_DIR}/${plan.package.binaryName} ${LINUX_NATIVE_BIN_DIR}/${plan.package.installerBinaryName}`,
    `chown root:sdkwork ${LINUX_SERVICE_CONFIG_ROOT}`,
    `chmod 0750 ${LINUX_SERVICE_CONFIG_ROOT}`,
    `if [ -f ${LINUX_SERVICE_CONFIG_ROOT}/.env.release.example ]; then`,
    `  chown root:sdkwork ${LINUX_SERVICE_CONFIG_ROOT}/.env.release.example || true`,
    `  chmod 0640 ${LINUX_SERVICE_CONFIG_ROOT}/.env.release.example || true`,
    'fi',
    `if [ -f ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml.example ]; then`,
    `  chown root:sdkwork ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml.example || true`,
    `  chmod 0640 ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml.example || true`,
    'fi',
    `chown -R sdkwork:sdkwork ${LINUX_SERVICE_DATA_ROOT} ${LINUX_SERVICE_LOG_ROOT}`,
    `chmod 0750 ${LINUX_SERVICE_DATA_ROOT} ${LINUX_SERVICE_LOG_ROOT}`,
    `if [ ! -f ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml ] && [ -f ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml.example ]; then`,
    `  cp ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml.example ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml`,
    'fi',
    `if [ -f ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml ]; then`,
    `  chown root:sdkwork ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml || true`,
    `  chmod 0640 ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml || true`,
    'fi',
    `if [ ! -f ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.env ]; then`,
    `  cat > ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.env <<'EOF'`,
    '# ClawRouter service environment.',
    '# Created by the Debian package for service process overrides.',
    `# Keep secrets in ${LINUX_SERVICE_CONFIG_ROOT}/*.secret or protected TOML, not in PORTAL_PUBLIC_* values.`,
    `# Runtime defaults live in ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml; use this file only for explicit process overrides.`,
    'SDKWORK_CLAW_DEPLOYMENT_MODE=server',
    `SDKWORK_CLAW_CONFIG_FILE=${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml`,
    'EOF',
    'fi',
    `if [ -f ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.env ]; then`,
    `  chown root:sdkwork ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.env || true`,
    `  chmod 0640 ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.env || true`,
    'fi',
    `if [ ! -f ${LINUX_SERVICE_CONFIG_ROOT}/database.secret ]; then`,
    `  printf "%s\\n" "change-me" > ${LINUX_SERVICE_CONFIG_ROOT}/database.secret`,
    'fi',
    `if [ -f ${LINUX_SERVICE_CONFIG_ROOT}/database.secret ]; then`,
    `  chown root:sdkwork ${LINUX_SERVICE_CONFIG_ROOT}/database.secret || true`,
    `  chmod 0640 ${LINUX_SERVICE_CONFIG_ROOT}/database.secret || true`,
    'fi',
    `if [ ! -f ${LINUX_SERVICE_CONFIG_ROOT}/redis.secret ]; then`,
    `  : > ${LINUX_SERVICE_CONFIG_ROOT}/redis.secret`,
    'fi',
    `if [ -f ${LINUX_SERVICE_CONFIG_ROOT}/redis.secret ]; then`,
    `  chown root:sdkwork ${LINUX_SERVICE_CONFIG_ROOT}/redis.secret || true`,
    `  chmod 0640 ${LINUX_SERVICE_CONFIG_ROOT}/redis.secret || true`,
    'fi',
    'if command -v systemctl >/dev/null 2>&1; then',
    '  systemctl daemon-reload || true',
    '  systemctl enable clawrouter.service >/dev/null 2>&1 || true',
    'fi',
    ...debianInstallSummaryEchoLines(plan),
    'exit 0',
    '',
  ].join('\n');
}

function createDebianDesktopPostinst(plan) {
  return [
    '#!/bin/sh',
    'set -e',
    `chown root:root ${LINUX_NATIVE_INSTALL_ROOT} ${LINUX_NATIVE_INSTALL_ROOT}/bin ${LINUX_NATIVE_BIN_DIR}/${plan.package.binaryName} ${LINUX_NATIVE_BIN_DIR}/${plan.package.installerBinaryName} 2>/dev/null || true`,
    `chmod 0755 ${LINUX_NATIVE_INSTALL_ROOT} ${LINUX_NATIVE_INSTALL_ROOT}/bin ${LINUX_NATIVE_BIN_DIR}/${plan.package.binaryName} ${LINUX_NATIVE_BIN_DIR}/${plan.package.installerBinaryName} 2>/dev/null || true`,
    ...debianInstallSummaryEchoLines(plan),
    'exit 0',
    '',
  ].join('\n');
}

function debianInstallSummaryEchoLines(plan) {
  const summary = debianInstallSummaryLines(plan);
  return [
    'cat <<\'EOF\'',
    ...summary,
    'EOF',
  ];
}

function debianInstallSummaryLines(plan) {
  const config = createInstallConfiguration(plan.package);
  if (plan.package.deploymentMode === 'desktop') {
    return [
      '',
      'ClawRouter installation summary',
      '-------------------------------',
      `Package: ${plan.package.id}`,
      `Desktop config file: ${config.files.runtimeConfig}`,
      `Desktop data directory: ${config.files.dataDirectory}`,
      'Database: SQLite',
      'Redis: optional, disabled by default',
      `Start command: ${LINUX_NATIVE_BIN_DIR}/${plan.package.binaryName}`,
      '',
    ];
  }

  return [
    '',
    'ClawRouter installation summary',
    '-------------------------------',
    `Package: ${plan.package.id}`,
    `Runtime TOML: ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml`,
    `Service environment: ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.env`,
    `PostgreSQL password file: ${LINUX_SERVICE_CONFIG_ROOT}/database.secret`,
    `Redis password file: ${LINUX_SERVICE_CONFIG_ROOT}/redis.secret`,
    'Systemd service: clawrouter.service',
    'Redis is enabled and required by default for server deployments; configure [redis] before first startup.',
    '',
    'Before first start:',
    `  sudo editor ${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml`,
    `  sudo editor ${LINUX_SERVICE_CONFIG_ROOT}/database.secret`,
    '  sudo systemctl start clawrouter',
    '  sudo systemctl status clawrouter --no-pager',
    '  sudo journalctl -u clawrouter -f',
    '',
    'PostgreSQL placeholders db.example.com and change-me are rejected at startup.',
    '',
  ];
}

function createDebianPrerm(plan) {
  if (plan.package.deploymentMode !== 'service') {
    return [
      '#!/bin/sh',
      'set -e',
      'exit 0',
      '',
    ].join('\n');
  }
  return [
    '#!/bin/sh',
    'set -e',
    'if [ "$1" = "remove" ] && command -v systemctl >/dev/null 2>&1; then',
    '  systemctl stop clawrouter.service >/dev/null 2>&1 || true',
    '  systemctl disable clawrouter.service >/dev/null 2>&1 || true',
    'fi',
    'exit 0',
    '',
  ].join('\n');
}

function withDebianDirectoryEntries(fileEntries) {
  const directories = new Map();
  for (const entry of fileEntries) {
    for (const directory of parentDirectoriesForTarPath(entry.relativePath)) {
      if (!directories.has(directory)) {
        directories.set(directory, {
          relativePath: directory,
          data: Buffer.alloc(0),
          mode: debianDirectoryMode(directory),
          type: 'directory',
        });
      }
    }
  }
  return [
    ...directories.values(),
    ...fileEntries,
  ].sort((left, right) => {
    if (left.relativePath === right.relativePath) {
      return 0;
    }
    const leftIsParent = right.relativePath.startsWith(`${left.relativePath}/`);
    const rightIsParent = left.relativePath.startsWith(`${right.relativePath}/`);
    if (leftIsParent) {
      return -1;
    }
    if (rightIsParent) {
      return 1;
    }
    return left.relativePath.localeCompare(right.relativePath);
  });
}

function parentDirectoriesForTarPath(relativePath) {
  const normalized = String(relativePath).replaceAll('\\', '/').replace(/\/+$/u, '');
  const parts = normalized.split('/');
  parts.pop();
  const directories = [];
  for (let index = 1; index <= parts.length; index += 1) {
    directories.push(parts.slice(0, index).join('/'));
  }
  return directories.filter((directory) => directory && directory !== '.');
}

function debianDirectoryMode(directory) {
  if (directory === `.${LINUX_SERVICE_CONFIG_ROOT}`) {
    return 0o750;
  }
  if (directory === `.${LINUX_SERVICE_DATA_ROOT}` || directory === `.${LINUX_SERVICE_LOG_ROOT}`) {
    return 0o750;
  }
  return 0o755;
}

function debianDataEntriesForPackageFile(plan, entry) {
  const targetPaths = debianInstallPathsForArchivePath(plan, entry.relativePath);
  return targetPaths.map((targetPath) => ({
    relativePath: `.${targetPath}`,
    data: entry.data,
    mode: debianModeForInstallPath(targetPath, entry),
  }));
}

function debianModeForInstallPath(targetPath, entry) {
  if (targetPath.startsWith(`${LINUX_SERVICE_CONFIG_ROOT}/`)) {
    return 0o640;
  }
  return entry.mode ?? modeForArchivePath(entry.relativePath);
}

function debianInstallPathsForArchivePath(plan, archivePath) {
  const normalized = String(archivePath).replaceAll('\\', '/');
  if (normalized === `bin/${plan.package.binaryName}`) {
    return [
      `${LINUX_NATIVE_INSTALL_ROOT}/${normalized}`,
      `${LINUX_NATIVE_BIN_DIR}/${plan.package.binaryName}`,
    ];
  }
  if (normalized === `bin/${plan.package.installerBinaryName}`) {
    return [
      `${LINUX_NATIVE_INSTALL_ROOT}/${normalized}`,
      `${LINUX_NATIVE_BIN_DIR}/${plan.package.installerBinaryName}`,
    ];
  }
  const targetPath = debianInstallPathForArchivePath(plan, archivePath);
  return targetPath ? [targetPath] : [];
}

function debianInstallPathForArchivePath(plan, archivePath) {
  const normalized = String(archivePath).replaceAll('\\', '/');
  if (normalized.startsWith('bin/') || normalized.startsWith('portal/')) {
    return `${LINUX_NATIVE_INSTALL_ROOT}/${normalized}`;
  }
  if (normalized === 'service/macos/clawrouter-service-runner') {
    return plan.package.deploymentMode === 'service'
      ? `${LINUX_NATIVE_INSTALL_ROOT}/service/macos/clawrouter-service-runner`
      : null;
  }
  if (normalized === '.env.release.example') {
    return plan.package.deploymentMode === 'service'
      ? `${LINUX_SERVICE_CONFIG_ROOT}/.env.release.example`
      : null;
  }
  if (normalized === RUNTIME_CONFIG_TEMPLATE_PATH) {
    return plan.package.deploymentMode === 'service'
      ? `${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml.example`
      : `${LINUX_NATIVE_SHARED_ROOT}/config/clawrouter.toml.example`;
  }
  if (normalized === 'service/linux/clawrouter.service') {
    return plan.package.deploymentMode === 'service'
      ? '/lib/systemd/system/clawrouter.service'
      : null;
  }
  if (normalized === 'INSTALL.md') {
    return `${LINUX_NATIVE_SHARED_DOC_ROOT}/INSTALL.md`;
  }
  if (normalized === PACKAGE_MANIFEST_FILE) {
    return `${LINUX_NATIVE_SHARED_ROOT}/install-manifest.json`;
  }
  if (normalized.startsWith('desktop/')) {
    return `${LINUX_NATIVE_SHARED_ROOT}/${normalized}`;
  }
  return `${LINUX_NATIVE_INSTALL_ROOT}/${normalized}`;
}

async function buildMacosPkg(plan, fileEntries) {
  if (process.platform !== 'darwin') {
    throw new Error('macOS .pkg builds require pkgbuild on a macOS host');
  }
  const buildRoot = path.join(plan.outputDir, '.native-build', `${plan.package.id}-pkg`);
  const payloadRoot = path.join(buildRoot, 'payload');
  const scriptsRoot = path.join(buildRoot, 'scripts');
  await rm(buildRoot, { recursive: true, force: true });
  await mkdir(payloadRoot, { recursive: true });
  await mkdir(scriptsRoot, { recursive: true });
  await writeMappedPackageFiles(payloadRoot, fileEntries, (entry) =>
    macosInstallPathForArchivePath(plan, entry.relativePath)
  );
  const postinstallPath = path.join(scriptsRoot, 'postinstall');
  await writeFile(postinstallPath, createMacosPostinstall(plan), 'utf8');
  await chmod(postinstallPath, 0o755);
  await execFileAsync('pkgbuild', [
    '--root',
    payloadRoot,
    '--scripts',
    scriptsRoot,
    '--identifier',
    `cloud.sdkwork.clawrouter.${plan.package.deploymentMode}`,
    '--version',
    macosPackageVersion(plan.package.version),
    '--install-location',
    '/',
    plan.installerPath,
  ], {
    cwd: workspaceRoot,
    maxBuffer: 1024 * 1024 * 8,
  });
  await rm(buildRoot, { recursive: true, force: true });
}

function macosInstallPathForArchivePath(plan, archivePath) {
  const normalized = String(archivePath).replaceAll('\\', '/');
  const runtimeRoot = plan.package.deploymentMode === 'service'
    ? MACOS_SERVICE_ROOT
    : POSIX_INSTALL_ROOT;
  if (normalized.startsWith('bin/') || normalized.startsWith('portal/')) {
    return `${runtimeRoot}/${normalized}`;
  }
  if (normalized === '.env.release.example') {
    return plan.package.deploymentMode === 'service'
      ? `${MACOS_SERVICE_ROOT}/.env.release.example`
      : null;
  }
  if (normalized === RUNTIME_CONFIG_TEMPLATE_PATH) {
    return plan.package.deploymentMode === 'service'
      ? `${MACOS_SERVICE_ROOT}/clawrouter.toml.example`
      : `${MACOS_NATIVE_SHARED_ROOT}/config/clawrouter.toml.example`;
  }
  if (normalized === 'service/macos/com.sdkwork.clawrouter.plist') {
    return plan.package.deploymentMode === 'service'
      ? '/Library/LaunchDaemons/com.sdkwork.clawrouter.plist'
      : null;
  }
  if (normalized === 'INSTALL.md') {
    return `${MACOS_NATIVE_SHARED_DOC_ROOT}/INSTALL.md`;
  }
  if (normalized === PACKAGE_MANIFEST_FILE) {
    return `${MACOS_NATIVE_SHARED_ROOT}/install-manifest.json`;
  }
  if (normalized.startsWith('desktop/')) {
    return `${MACOS_NATIVE_SHARED_ROOT}/${normalized}`;
  }
  return `${runtimeRoot}/${normalized}`;
}

function createMacosPostinstall(plan) {
  const runtimeRoot = plan.package.deploymentMode === 'service'
    ? MACOS_SERVICE_ROOT
    : POSIX_INSTALL_ROOT;
  const serviceSetup = plan.package.deploymentMode === 'service'
    ? [
      `mkdir -p "${MACOS_SERVICE_ROOT}" ${LINUX_SERVICE_LOG_ROOT}`,
      `mkdir -p "${MACOS_SERVICE_ROOT}/bin" "${MACOS_SERVICE_ROOT}/service/macos"`,
      `chown root:wheel ${LINUX_SERVICE_LOG_ROOT} || true`,
      `chmod 0750 ${LINUX_SERVICE_LOG_ROOT} || true`,
      `chown root:wheel "${MACOS_SERVICE_ROOT}" || true`,
      `chmod 0750 "${MACOS_SERVICE_ROOT}" || true`,
      `chown root:wheel "${MACOS_SERVICE_ROOT}/bin" "${MACOS_SERVICE_ROOT}/service" "${MACOS_SERVICE_ROOT}/service/macos" || true`,
      `chmod 0755 "${MACOS_SERVICE_ROOT}/bin" "${MACOS_SERVICE_ROOT}/service" "${MACOS_SERVICE_ROOT}/service/macos" || true`,
      `if [ -f "${MACOS_SERVICE_ROOT}/.env.release.example" ]; then`,
      `  chown root:wheel "${MACOS_SERVICE_ROOT}/.env.release.example" || true`,
      `  chmod 0640 "${MACOS_SERVICE_ROOT}/.env.release.example" || true`,
      'fi',
      `if [ -f "${MACOS_SERVICE_ROOT}/clawrouter.toml.example" ]; then`,
      `  chown root:wheel "${MACOS_SERVICE_ROOT}/clawrouter.toml.example" || true`,
      `  chmod 0640 "${MACOS_SERVICE_ROOT}/clawrouter.toml.example" || true`,
      'fi',
      `if [ ! -f "${MACOS_SERVICE_ROOT}/clawrouter.toml" ] && [ -f "${MACOS_SERVICE_ROOT}/clawrouter.toml.example" ]; then`,
      `  cp "${MACOS_SERVICE_ROOT}/clawrouter.toml.example" "${MACOS_SERVICE_ROOT}/clawrouter.toml"`,
      'fi',
      `if [ -f "${MACOS_SERVICE_ROOT}/clawrouter.toml" ]; then`,
      `  chown root:wheel "${MACOS_SERVICE_ROOT}/clawrouter.toml" || true`,
      `  chmod 0640 "${MACOS_SERVICE_ROOT}/clawrouter.toml" || true`,
      'fi',
      'if [ -f /Library/LaunchDaemons/com.sdkwork.clawrouter.plist ]; then',
      '  chown root:wheel /Library/LaunchDaemons/com.sdkwork.clawrouter.plist || true',
      '  chmod 0644 /Library/LaunchDaemons/com.sdkwork.clawrouter.plist || true',
      'fi',
    ]
    : [
      `mkdir -p ${MACOS_NATIVE_SHARED_ROOT}/config`,
      `echo "ClawRouter desktop config is user-scoped. Run ${POSIX_INSTALL_ROOT}/bin/clawrouterctl ensure as the target user before first start."`,
    ];
  return [
    '#!/bin/sh',
    'set -e',
    `chmod 0755 "${runtimeRoot}/bin/${plan.package.binaryName}" "${runtimeRoot}/bin/${plan.package.installerBinaryName}" 2>/dev/null || true`,
    ...serviceSetup,
    'exit 0',
    '',
  ].join('\n');
}

async function buildWindowsMsi(plan, fileEntries) {
  if (process.platform !== 'win32') {
    throw new Error('Windows .msi builds require WiX on a Windows host');
  }
  const buildRoot = path.join(plan.outputDir, '.native-build', `${plan.package.id}-msi`);
  const payloadRoot = path.join(buildRoot, 'payload');
  await rm(buildRoot, { recursive: true, force: true });
  await mkdir(payloadRoot, { recursive: true });
  await writeMappedPackageFiles(payloadRoot, fileEntries, (entry) =>
    windowsPayloadPathForArchivePath(plan, entry.relativePath)
  );
  const wixSourcePath = path.join(buildRoot, 'clawrouter.wxs');
  await writeFile(wixSourcePath, createWixSource(plan, payloadRoot, fileEntries), 'utf8');
  await execFileAsync('wix', [
    'build',
    wixSourcePath,
    '-arch',
    plan.package.architecture === 'arm64' ? 'arm64' : 'x64',
    '-pdbtype',
    'none',
    '-out',
    plan.installerPath,
  ], {
    cwd: workspaceRoot,
    maxBuffer: 1024 * 1024 * 16,
  });
  await rm(buildRoot, { recursive: true, force: true });
}

function windowsPayloadPathForArchivePath(plan, archivePath) {
  const normalized = String(archivePath).replaceAll('\\', '/');
  if (normalized === '.env.release.example') {
    return 'ProgramData/sdkwork/router/.env.release.example';
  }
  if (normalized === RUNTIME_CONFIG_TEMPLATE_PATH) {
    return 'ProgramData/sdkwork/router/clawrouter.toml.example';
  }
  if (normalized === PACKAGE_MANIFEST_FILE) {
    return 'install-manifest.json';
  }
  return normalized;
}

function createWixSource(plan, payloadRoot, fileEntries) {
  const componentRefs = [];
  const programFilesTree = new DirectoryNode('PROGRAMFILESSDKWORK', 'sdkwork');
  const programDataTree = new DirectoryNode('COMMONAPPDATASDKWORK', 'sdkwork');
  const appDataTree = new DirectoryNode('APPDATASDKWORK', 'sdkwork');
  for (const entry of fileEntries) {
    const payloadPath = windowsPayloadPathForArchivePath(plan, entry.relativePath);
    if (!payloadPath) {
      continue;
    }
    const destination = windowsWixDestinationForPayloadPath(payloadPath, {
      appDataTree,
      programDataTree,
      programFilesTree,
    });
    const fileId = stableWixId('fil', payloadPath);
    const componentId = stableWixId('cmp', payloadPath);
    componentRefs.push(componentId);
    destination.tree.addFile(destination.parts, {
      componentId,
      fileId,
      source: path.join(payloadRoot, ...payloadPath.split('/')),
    });
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">',
    `  <Package Name="${RUNTIME_DISPLAY_NAME}" Manufacturer="SdkWork Cloud" Version="${xmlEscape(windowsPackageVersion(plan.package.version))}" UpgradeCode="{${WINDOWS_UPGRADE_CODE}}" Scope="perMachine">`,
    `    <MajorUpgrade DowngradeErrorMessage="A newer version of ${RUNTIME_DISPLAY_NAME} is already installed." />`,
    '    <MediaTemplate EmbedCab="yes" />',
    '    <StandardDirectory Id="ProgramFiles64Folder">',
    ...renderWixDirectory(programFilesTree, 3),
    '    </StandardDirectory>',
    ...(programDataTree.hasContent()
      ? [
        '    <StandardDirectory Id="CommonAppDataFolder">',
        ...renderWixDirectory(programDataTree, 3),
        '    </StandardDirectory>',
      ]
      : []),
    ...(appDataTree.hasContent()
      ? [
        '    <StandardDirectory Id="AppDataFolder">',
        ...renderWixDirectory(appDataTree, 3),
        '    </StandardDirectory>',
      ]
      : []),
    `    <Feature Id="MainFeature" Title="${RUNTIME_DISPLAY_NAME}" Level="1">`,
    ...componentRefs.map((componentId) => `      <ComponentRef Id="${componentId}" />`),
    '    </Feature>',
    '  </Package>',
    '</Wix>',
    '',
  ].join('\n');
}

function windowsWixDestinationForPayloadPath(payloadPath, trees) {
  const parts = String(payloadPath).split('/');
  if (parts[0] === 'ProgramData') {
    return {
      tree: trees.programDataTree,
      parts: stripWindowsRootDirectoryName(parts.slice(1), 'sdkwork'),
    };
  }
  if (parts[0] === 'AppData') {
    return {
      tree: trees.appDataTree,
      parts: stripWindowsRootDirectoryName(parts.slice(1), 'sdkwork'),
    };
  }
  return {
    tree: trees.programFilesTree,
    parts: ['router', ...parts],
  };
}

function stripWindowsRootDirectoryName(parts, expectedRootName) {
  return parts[0] === expectedRootName ? parts.slice(1) : parts;
}

class DirectoryNode {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.directories = new Map();
    this.files = [];
  }

  addFile(parts, file) {
    if (parts.length === 0) {
      throw new Error(`Cannot add Wix file without destination path: ${file.source}`);
    }
    if (parts.length === 1) {
      this.files.push({ ...file, name: parts[0] });
      return;
    }
    const directoryName = parts[0];
    const directoryId = stableWixId('dir', parts.slice(0, -1).join('/'));
    if (!this.directories.has(directoryName)) {
      this.directories.set(directoryName, new DirectoryNode(directoryId, directoryName));
    }
    this.directories.get(directoryName).addFile(parts.slice(1), file);
  }

  hasContent() {
    return this.files.length > 0 || this.directories.size > 0;
  }
}

function renderWixDirectory(node, indentLevel) {
  const indent = '  '.repeat(indentLevel);
  const lines = [`${indent}<Directory Id="${node.id}" Name="${xmlEscape(node.name)}">`];
  for (const child of [...node.directories.values()].sort((left, right) => left.name.localeCompare(right.name))) {
    lines.push(...renderWixDirectory(child, indentLevel + 1));
  }
  for (const file of node.files.sort((left, right) => left.name.localeCompare(right.name))) {
    lines.push(`${indent}  <Component Id="${file.componentId}" Guid="*">`);
    lines.push(`${indent}    <File Id="${file.fileId}" Source="${xmlEscape(file.source)}" KeyPath="yes" />`);
    lines.push(`${indent}  </Component>`);
  }
  lines.push(`${indent}</Directory>`);
  return lines;
}

async function writeMappedPackageFiles(root, fileEntries, mapPath) {
  for (const entry of fileEntries) {
    const target = mapPath(entry);
    if (!target) {
      continue;
    }
    const safeTarget = String(target).replace(/^\/+/u, '');
    const targetPath = path.join(root, ...safeTarget.split('/'));
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, entry.data);
    if ((entry.mode ?? 0o644) & 0o111) {
      await chmod(targetPath, 0o755);
    }
  }
}

function createArArchive(entries) {
  const chunks = [Buffer.from('!<arch>\n', 'ascii')];
  for (const entry of entries) {
    const data = Buffer.from(entry.data);
    const header = Buffer.alloc(60, 0x20);
    const name = `${entry.name}/`;
    if (Buffer.byteLength(name, 'ascii') > 16) {
      throw new Error(`ar entry name is too long: ${entry.name}`);
    }
    header.write(name.padEnd(16, ' '), 0, 16, 'ascii');
    header.write('0'.padEnd(12, ' '), 16, 12, 'ascii');
    header.write('0'.padEnd(6, ' '), 28, 6, 'ascii');
    header.write('0'.padEnd(6, ' '), 34, 6, 'ascii');
    header.write((entry.mode ?? 0o644).toString(8).padEnd(8, ' '), 40, 8, 'ascii');
    header.write(String(data.length).padEnd(10, ' '), 48, 10, 'ascii');
    header.write('`\n', 58, 2, 'ascii');
    chunks.push(header, data);
    if (data.length % 2 === 1) {
      chunks.push(Buffer.from('\n', 'ascii'));
    }
  }
  return Buffer.concat(chunks);
}

function currentHostNativePackageId(platform = process.platform, arch = process.arch) {
  const normalizedPlatform = platform === 'win32' ? 'windows' : platform === 'darwin' ? 'macos' : 'linux';
  const normalizedArch = arch === 'arm64' ? 'arm64' : 'x64';
  return `${normalizedPlatform}-${normalizedArch}-service`;
}

function nativeInstallerNameForPackage(packageItem) {
  return `${PACKAGE_NAME}-${artifactIdForPackage(packageItem)}-${packageItem.version}.${nativeInstallerFormatForPlatform(packageItem.platform)}`;
}

function nativeInstallerFormatForPlatform(platform) {
  if (platform === 'linux') {
    return 'deb';
  }
  if (platform === 'macos') {
    return 'pkg';
  }
  if (platform === 'windows') {
    return 'msi';
  }
  throw new Error(`Unsupported native installer platform: ${platform}`);
}

function nativeInstallerToolForPlatform(platform) {
  if (platform === 'linux') {
    return 'internal-deb';
  }
  if (platform === 'macos') {
    return 'pkgbuild';
  }
  if (platform === 'windows') {
    return 'wix';
  }
  throw new Error(`Unsupported native installer platform: ${platform}`);
}

function debianArchitecture(architecture) {
  return architecture === 'arm64' ? 'arm64' : 'amd64';
}

function debianVersion(version) {
  return String(version).replace(/[^0-9A-Za-z.+:~-]/gu, '-');
}

function macosPackageVersion(version) {
  return numericTripletVersion(version);
}

function windowsPackageVersion(version) {
  return numericTripletVersion(version);
}

function numericTripletVersion(version) {
  const parts = String(version)
    .split(/[^\d]+/u)
    .filter(Boolean)
    .slice(0, 3);
  while (parts.length < 3) {
    parts.push('0');
  }
  return parts.join('.');
}

function stableWixId(prefix, value) {
  const digest = createHash('sha1').update(String(value)).digest('hex').slice(0, 24);
  return `${prefix}_${digest}`;
}

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function renderNativeInstallerBuildPlan(plan) {
  return [
    `[native-installer-build] package: ${plan.package.id}`,
    `[native-installer-build] format: ${plan.nativeFormat}`,
    `[native-installer-build] tool: ${plan.buildTool}`,
    `[native-installer-build] installer: ${plan.installerPath}`,
    `[native-installer-build] manifest: ${plan.manifestPath}`,
    `[native-installer-build] source entries: ${plan.archiveBuildPlan.entries.length}`,
  ];
}

async function main(argv = process.argv.slice(2)) {
  const settings = parseNativeInstallerBuildArgs(argv);
  if (settings.help) {
    printHelp();
    return 0;
  }
  if (settings.all) {
    return await runAllNativeInstallerBuilds(settings);
  }

  const plan = createNativeInstallerBuildPlan({
    packageId: settings.packageId,
    stagingRoot: settings.stagingRoot ?? defaultStagingRoot(workspaceRoot),
    outputDir: settings.outputDir ?? defaultInstallPackageOutputDir(workspaceRoot),
    version: settings.version,
    root: workspaceRoot,
    requireStagedFiles: !settings.dryRun,
  });
  const issues = settings.dryRun
    ? validateNativeInstallerBuildPlanForDryRun(plan)
    : validateNativeInstallerBuildPlan(plan);

  if (settings.json && (settings.check || settings.dryRun)) {
    console.log(JSON.stringify({
      ok: issues.length === 0,
      issues,
      plan,
    }, null, 2));
  } else if (!settings.json) {
    for (const line of renderNativeInstallerBuildPlan(plan)) {
      console.log(line);
    }
    if (issues.length > 0) {
      console.error('[native-installer-build] validation issues:');
      for (const issue of issues) {
        console.error(`[native-installer-build]   ${issue}`);
      }
    }
  }

  if (settings.check && issues.length > 0) {
    return 1;
  }
  if (settings.dryRun) {
    return 0;
  }

  const result = await buildNativeInstaller(plan);
  if (settings.json) {
    console.log(JSON.stringify({
      ok: true,
      installer: result.installer,
      manifestPath: result.manifestPath,
      aggregateManifestPath: result.aggregateManifestPath,
    }, null, 2));
  } else {
    console.log(`[native-installer-build] written: ${result.installerPath}`);
    console.log(`[native-installer-build] sha256: ${result.installer.sha256}`);
  }
  return 0;
}

async function runAllNativeInstallerBuilds(settings) {
  const packageIds = nativeInstallerPackageIds(settings.version);
  const plans = packageIds.map((packageId) => createNativeInstallerBuildPlan({
    packageId,
    stagingRoot: settings.stagingRoot ?? defaultStagingRoot(workspaceRoot),
    outputDir: settings.outputDir ?? defaultInstallPackageOutputDir(workspaceRoot),
    version: settings.version,
    root: workspaceRoot,
    requireStagedFiles: !settings.dryRun,
  }));
  const issues = plans.flatMap((plan) =>
    (settings.dryRun ? validateNativeInstallerBuildPlanForDryRun(plan) : validateNativeInstallerBuildPlan(plan))
      .map((issue) => `${plan.package.id}: ${issue}`)
  );

  if (settings.json && (settings.check || settings.dryRun)) {
    console.log(JSON.stringify({
      ok: issues.length === 0,
      issues,
      plans,
    }, null, 2));
  } else if (!settings.json) {
    console.log(`[native-installer-build] packages: ${plans.length}`);
    for (const plan of plans) {
      for (const line of renderNativeInstallerBuildPlan(plan)) {
        console.log(line);
      }
    }
  }
  if (settings.check && issues.length > 0) {
    return 1;
  }
  if (settings.dryRun) {
    return 0;
  }

  const results = [];
  for (const plan of plans) {
    results.push(await buildNativeInstaller(plan));
  }
  if (settings.json) {
    console.log(JSON.stringify({
      ok: true,
      installers: results.map((result) => result.installer),
      aggregateManifestPath: results.at(-1)?.aggregateManifestPath ?? null,
    }, null, 2));
  } else {
    for (const result of results) {
      console.log(`[native-installer-build] written: ${result.installerPath}`);
      console.log(`[native-installer-build] sha256: ${result.installer.sha256}`);
    }
  }
  return 0;
}

function validateNativeInstallerBuildPlanForDryRun(plan) {
  return validateNativeInstallerBuildPlan(plan)
    .filter((issue) =>
      !issue.includes('requires staged artifact')
      && !issue.includes('requires macOS pkgbuild')
      && !issue.includes('requires Windows WiX tooling')
    );
}

function nativeInstallerPackageIds(version = DEFAULT_VERSION) {
  return createInstallPackagePlan({
    version,
    deploymentModes: [...NATIVE_INSTALLER_DEPLOYMENT_MODES],
  }).packages.map((packageItem) => packageItem.id);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    console.error(`[native-installer-build] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

export {
  NATIVE_INSTALLER_DEPLOYMENT_MODES,
  NATIVE_INSTALL_LAYOUT_SCHEMA_VERSION,
  NATIVE_INSTALLER_SCHEMA_VERSION,
  buildNativeInstaller,
  collectPackageFileEntries,
  createArArchive,
  createDebianPackage,
  createDebianPostinst,
  createDebianPrerm,
  createMacosPostinstall,
  createWixSource,
  createNativeInstallLayout,
  createNativeInstallerBuildPlan,
  currentHostNativePackageId,
  debianArchitecture,
  debianInstallPathForArchivePath,
  debianInstallPathsForArchivePath,
  main,
  nativeInstallerNameForPackage,
  nativeInstallerPackageIds,
  parseNativeInstallerBuildArgs,
  renderNativeInstallerBuildPlan,
  validateNativeInstallerBuildPlan,
  windowsPayloadPathForArchivePath,
};
