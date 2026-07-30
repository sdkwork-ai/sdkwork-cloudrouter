#!/usr/bin/env node

import process from 'node:process';
import { DEFAULT_RELEASE_VERSION } from './claw-router-release-version.mjs';

const INSTALL_PACKAGE_SCHEMA_VERSION = '2026-05-15.install-packages.v2';
const SUPPORTED_PLATFORMS = Object.freeze(['windows', 'linux', 'macos']);
const SUPPORTED_ARCHITECTURES = Object.freeze(['x64', 'arm64']);
const SUPPORTED_DEPLOYMENT_MODES = Object.freeze(['archive', 'service', 'container', 'desktop']);
const DEFAULT_VERSION = DEFAULT_RELEASE_VERSION;
const HEALTH_CHECKS = Object.freeze(['/healthz', '/readyz']);
const INTERNAL_PROJECT_NAME = 'sdkwork-clawrouter';
const PACKAGE_NAME = 'clawrouter';
const RUNTIME_DISPLAY_NAME = 'SdkWork ClawRouter';
const EDGE_BINARY_BASENAME = 'clawrouter';
const INSTALLER_BINARY_BASENAME = 'clawrouterctl';
const POSIX_INSTALL_ROOT = '/opt/sdkwork/router';
const LINUX_SERVICE_RUNTIME_ROOT = '/usr/lib/sdkwork/router';
const LINUX_SERVICE_CONFIG_ROOT = '/etc/sdkwork/router';
const LINUX_SERVICE_DATA_ROOT = '/var/lib/sdkwork/router';
const LINUX_SERVICE_LOG_ROOT = '/var/log/sdkwork/router';
const LINUX_SHARED_ROOT = '/usr/share/sdkwork/router';
const LINUX_SHARED_DOC_ROOT = '/usr/share/doc/sdkwork/router';
const MACOS_SHARED_ROOT = '/usr/local/share/sdkwork/router';
const MACOS_SHARED_DOC_ROOT = '/usr/local/share/doc/sdkwork/router';
const WINDOWS_INSTALL_ROOT = '%ProgramFiles%/sdkwork/router';
const WINDOWS_CONTAINER_INSTALL_ROOT = 'C:/sdkwork/router';
const WINDOWS_SYSTEM_ROOT = '%ProgramData%/sdkwork/router';
const WINDOWS_USER_ROOT = '%USERPROFILE%/.sdkwork/router';
const MACOS_SERVICE_ROOT = '/Library/Application Support/sdkwork/router';
const USER_PRIVATE_ROUTER_ROOT = '~/.sdkwork/router';
const CONTAINER_SECRET_ROOT = '/run/secrets/sdkwork/router';
const RUNTIME_CONFIG_TEMPLATE_PATH = 'config/clawrouter.toml.example';
const POSTGRES_DSN_EXAMPLE = 'postgresql://sdkwork_ai_prod:<password>@db.example.com:5432/sdkwork_ai_prod';
const FAST_INITIALIZATION_CONTRACT = Object.freeze([
  'host-env-prepare',
  'runtime-config-write',
  'database-ensure',
  'catalog-refresh',
  'edge-readiness',
]);

function printHelp() {
  console.log(`Usage: node scripts/plan-claw-router-install-packages.mjs [options]

Create and validate the cross-platform install package plan.

Options:
  --check             Validate the generated plan and exit nonzero on issues.
  --json              Print machine-readable JSON.
  --version <value>   Product package version (default ${DEFAULT_VERSION}).
  -h, --help          Show this help.
`);
}

function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseArgs(argv) {
  const settings = {
    check: false,
    json: false,
    help: false,
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
      case '--json':
        settings.json = true;
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
        throw new Error(`Unsupported install package planner option: ${arg}`);
    }
  }

  return settings;
}

function createInstallPackagePlan({
  version = DEFAULT_VERSION,
  platforms = SUPPORTED_PLATFORMS,
  architectures = SUPPORTED_ARCHITECTURES,
  deploymentModes = SUPPORTED_DEPLOYMENT_MODES,
} = {}) {
  const normalizedVersion = normalizeVersion(version);
  const selectedPlatforms = validateSelection('platforms', platforms, SUPPORTED_PLATFORMS);
  const selectedArchitectures = validateSelection('architectures', architectures, SUPPORTED_ARCHITECTURES);
  const selectedDeploymentModes = validateSelection(
    'deploymentModes',
    deploymentModes,
    SUPPORTED_DEPLOYMENT_MODES,
  );

  const packages = [];
  for (const platform of selectedPlatforms) {
    for (const architecture of selectedArchitectures) {
      for (const deploymentMode of selectedDeploymentModes) {
        packages.push(createInstallPackageItem({
          platform,
          architecture,
          deploymentMode,
          version: normalizedVersion,
        }));
      }
    }
  }

  return {
    schemaVersion: INSTALL_PACKAGE_SCHEMA_VERSION,
    product: INTERNAL_PROJECT_NAME,
    packageName: PACKAGE_NAME,
    runtimeName: PACKAGE_NAME,
    displayName: RUNTIME_DISPLAY_NAME,
    version: normalizedVersion,
    platforms: selectedPlatforms,
    architectures: selectedArchitectures,
    deploymentModes: selectedDeploymentModes,
    fastInitializationContract: [...FAST_INITIALIZATION_CONTRACT],
    artifactPolicy: {
      noSecretsInPackage: true,
      envLocalGeneratedOnHost: true,
      envExampleReferenceOnly: true,
      releaseEnvLocalExcluded: true,
      generatedFromProductionBuild: true,
    },
    packages,
  };
}

function createInstallPackageItem({ platform, architecture, deploymentMode, version }) {
  const exeSuffix = platform === 'windows' ? '.exe' : '';
  const archiveExtension = platform === 'windows' ? 'zip' : 'tar.gz';
  const binaryName = `${EDGE_BINARY_BASENAME}${exeSuffix}`;
  const installerBinaryName = `${INSTALLER_BINARY_BASENAME}${exeSuffix}`;
  const id = `${platform}-${architecture}-${deploymentMode}`;
  const artifactId = artifactIdForPackage({ platform, architecture, deploymentMode });
  const runtimeProfile = runtimeProfileForMode(deploymentMode);
  const databasePolicy = databasePolicyFor({ platform, runtimeProfile, deploymentMode });
  const redisPolicy = redisPolicyFor({ platform, runtimeProfile, deploymentMode });

  return {
    id,
    artifactId,
    version,
    platform,
    architecture,
    deploymentMode,
    runtimeProfile,
    archiveName: `${PACKAGE_NAME}-${artifactId}-${version}.${archiveExtension}`,
    binaryName,
    installerBinaryName,
    packageKind: packageKindForMode(deploymentMode),
    artifacts: buildArtifacts(binaryName, installerBinaryName, deploymentMode, platform),
    initCommands: [
      `${packageBinaryCommand(platform, installerBinaryName)} ensure`,
      `${packageBinaryCommand(platform, installerBinaryName)} refresh-catalog --force`,
    ],
    startCommand: startCommandForMode({
      platform,
      deploymentMode,
      binaryName,
    }),
    databasePolicy,
    redisPolicy,
    serviceIntegration: serviceIntegrationFor(platform, deploymentMode),
    containerIntegration: containerIntegrationFor(platform, deploymentMode, binaryName),
    healthChecks: [...HEALTH_CHECKS],
    security: {
      noSecretsInPackage: true,
      envLocalGeneratedOnHost: true,
      envExampleReferenceOnly: true,
      releaseEnvLocalExcluded: true,
      trustForwardedHeadersDefault: false,
      sameOriginBrowserApiDefaults: true,
    },
  };
}

function buildArtifacts(binaryName, installerBinaryName, deploymentMode, platform) {
  const artifacts = [
    {
      kind: 'edge-binary',
      path: `bin/${binaryName}`,
      source: 'target/release',
      required: true,
    },
    {
      kind: 'installer-binary',
      path: `bin/${installerBinaryName}`,
      source: 'target/release',
      required: true,
    },
    {
      kind: 'portal-dist',
      path: 'portal/dist',
      source: 'apps/sdkwork-clawrouter-pc/dist',
      required: true,
    },
    {
      kind: 'sdk-archives',
      path: 'portal/dist/sdk-archives',
      source: 'apps/sdkwork-clawrouter-pc/dist/sdk-archives',
      required: true,
    },
    {
      kind: 'env-template',
      path: '.env.release.example',
      source: '.env.release.example',
      required: true,
    },
    {
      kind: 'runtime-config-template',
      path: RUNTIME_CONFIG_TEMPLATE_PATH,
      source: 'generated by install package builder',
      required: true,
    },
    {
      kind: 'install-guide',
      path: 'INSTALL.md',
      source: 'generated by install package builder',
      required: true,
    },
    {
      kind: 'install-manifest',
      path: 'install-manifest.json',
      source: 'generated by install package builder',
      required: true,
    },
  ];

  if (deploymentMode === 'service') {
    artifacts.push({
      kind: 'service-manifest',
      path: 'service',
      source: 'generated by install package builder',
      required: true,
    });
  }
  if (deploymentMode === 'container') {
    artifacts.push({
      kind: 'container-entrypoint',
      path: platform === 'windows' ? 'container/entrypoint.ps1' : 'container/entrypoint',
      source: 'generated by install package builder',
      required: true,
    });
  }
  if (deploymentMode === 'desktop') {
    artifacts.push({
      kind: 'desktop-manifest',
      path: 'desktop',
      source: 'generated by install package builder',
      required: true,
    });
  }

  return artifacts;
}

function packageKindForMode(deploymentMode) {
  if (deploymentMode === 'archive') {
    return 'self-contained-archive';
  }
  if (deploymentMode === 'service') {
    return 'host-service-package';
  }
  if (deploymentMode === 'desktop') {
    return 'desktop-app-installer';
  }
  return 'container-image';
}

function runtimeProfileForMode(deploymentMode) {
  return deploymentMode === 'desktop' ? 'desktop' : 'server';
}

function artifactDeploymentLabelForMode(deploymentMode) {
  return deploymentMode === 'service' ? 'server' : deploymentMode;
}

function artifactIdForPackage({ platform, architecture, deploymentMode }) {
  return `${platform}-${architecture}-${artifactDeploymentLabelForMode(deploymentMode)}`;
}

function redisPolicyFor({ platform, runtimeProfile, deploymentMode = 'archive' }) {
  const locations = runtimeConfigLocationsFor(platform, runtimeProfile);
  const serverRuntimeRequiresRedis = runtimeProfile !== 'desktop';
  return {
    configSection: 'redis',
    enabledByDefault: serverRuntimeRequiresRedis,
    required: serverRuntimeRequiresRedis,
    runtimeRequired: serverRuntimeRequiresRedis,
    requiredWhenEnabled: ['host', 'port', 'database'],
    secretFields: ['password_file', 'password'],
    defaultHost: 'redis.example.com',
    defaultPort: 6379,
    defaultDatabase: 0,
    defaultUsername: null,
    urlOverrideExample: 'redis://redis.example.com:6379/0',
    passwordFile: {
      path: redisPasswordFileFor(platform, deploymentMode, locations),
      required: serverRuntimeRequiresRedis,
    },
    keyPrefix: 'clawrouter',
    tls: false,
    maxConnections: runtimeProfile === 'desktop' ? 4 : 16,
    connectTimeoutMs: 2000,
    commandTimeoutMs: 1000,
    poolIdleTimeoutSeconds: 60,
    envOverrides: [
      'SDKWORK_CLAW_REDIS_ENABLED',
      'SDKWORK_CLAW_REDIS_HOST',
      'SDKWORK_CLAW_REDIS_PORT',
      'SDKWORK_CLAW_REDIS_DATABASE',
      'SDKWORK_CLAW_REDIS_USERNAME',
      'SDKWORK_CLAW_REDIS_URL',
      'SDKWORK_CLAW_REDIS_PASSWORD_FILE',
      'SDKWORK_CLAW_REDIS_PASSWORD',
      'SDKWORK_CLAW_REDIS_KEY_PREFIX',
      'SDKWORK_CLAW_REDIS_TLS',
      'SDKWORK_CLAW_REDIS_MAX_CONNECTIONS',
      'SDKWORK_CLAW_REDIS_CONNECT_TIMEOUT_MILLIS',
      'SDKWORK_CLAW_REDIS_COMMAND_TIMEOUT_MILLIS',
      'SDKWORK_CLAW_REDIS_POOL_IDLE_TIMEOUT_SECONDS',
    ],
    plannedUses: [
      'shared-cache',
      'distributed-locks',
      'rate-limit-buckets',
      'queue-state',
    ],
  };
}

function databasePolicyFor({ platform, runtimeProfile, deploymentMode = 'archive' }) {
  const locations = runtimeConfigLocationsFor(platform, runtimeProfile);
  const basePolicy = {
    configurableFromFile: true,
    configFormat: 'toml',
    configFile: {
      path: locations.configFile,
      precedence: 2,
    },
    dataDirectory: {
      path: locations.dataDirectory,
    },
    envOverrides: [
      'SDKWORK_CLAW_CONFIG_FILE',
      'SDKWORK_DATABASE_URL',
      'SDKWORK_DATABASE_MAX_CONNECTIONS',
      'SDKWORK_CLAW_DEPLOYMENT_MODE',
    ],
  };

  if (runtimeProfile === 'desktop') {
    return {
      ...basePolicy,
      defaultEngine: 'sqlite',
      defaultUrl: `sqlite://${locations.sqlitePath}`,
      defaultSqlitePath: locations.sqlitePath,
      defaultSqliteUrl: `sqlite://${locations.sqlitePath}`,
      maxConnections: 1,
      requiresExternalDatabase: false,
    };
  }

  const passwordFile = postgresPasswordFileFor(platform, deploymentMode, locations);
  return {
    ...basePolicy,
    defaultEngine: 'postgresql',
    defaultHost: 'db.example.com',
    defaultPort: 5432,
    defaultDatabase: 'sdkwork_ai_prod',
    defaultUsername: 'sdkwork_ai_prod',
    passwordFile: {
      path: passwordFile,
      required: true,
    },
    defaultSqlitePath: locations.sqlitePath,
    defaultSqliteUrl: `sqlite://${locations.sqlitePath}`,
    maxConnections: 16,
    requiresExternalDatabase: true,
    productionDatabaseUrlExample: POSTGRES_DSN_EXAMPLE,
  };
}

function postgresPasswordFileFor(platform, deploymentMode, locations) {
  if (deploymentMode === 'container') {
    return platform === 'windows'
      ? `${WINDOWS_CONTAINER_INSTALL_ROOT}/secrets/postgres-password`
      : `${CONTAINER_SECRET_ROOT}/postgres-password`;
  }
  if (platform === 'windows') {
    return `${WINDOWS_SYSTEM_ROOT}/database.secret`;
  }
  if (platform === 'macos') {
    return `${MACOS_SERVICE_ROOT}/database.secret`;
  }
  if (locations.configFile === `${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml`) {
    return `${LINUX_SERVICE_CONFIG_ROOT}/database.secret`;
  }
  return `${locations.dataDirectory}/database.secret`;
}

function redisPasswordFileFor(platform, deploymentMode, locations) {
  if (deploymentMode === 'container') {
    return platform === 'windows'
      ? `${WINDOWS_CONTAINER_INSTALL_ROOT}/secrets/redis-password`
      : `${CONTAINER_SECRET_ROOT}/redis-password`;
  }
  if (platform === 'windows') {
    return deploymentMode === 'desktop'
      ? `${locations.dataDirectory}/redis.secret`
      : `${WINDOWS_SYSTEM_ROOT}/redis.secret`;
  }
  if (platform === 'macos') {
    return `${locations.dataDirectory}/redis.secret`;
  }
  if (locations.configFile === `${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml`) {
    return `${LINUX_SERVICE_CONFIG_ROOT}/redis.secret`;
  }
  return `${locations.dataDirectory}/redis.secret`;
}

function runtimeConfigLocationsFor(platform, runtimeProfile) {
  if (runtimeProfile === 'desktop') {
    if (platform === 'windows') {
      return {
        configFile: `${WINDOWS_USER_ROOT}/config/clawrouter.toml`,
        dataDirectory: `${WINDOWS_USER_ROOT}/data`,
        sqlitePath: `${WINDOWS_USER_ROOT}/data/clawrouter.sqlite`,
      };
    }
    if (platform === 'macos') {
      return {
        configFile: `${USER_PRIVATE_ROUTER_ROOT}/config/clawrouter.toml`,
        dataDirectory: `${USER_PRIVATE_ROUTER_ROOT}/data`,
        sqlitePath: `${USER_PRIVATE_ROUTER_ROOT}/data/clawrouter.sqlite`,
      };
    }
    return {
      configFile: `${USER_PRIVATE_ROUTER_ROOT}/config/clawrouter.toml`,
      dataDirectory: `${USER_PRIVATE_ROUTER_ROOT}/data`,
      sqlitePath: `${USER_PRIVATE_ROUTER_ROOT}/data/clawrouter.sqlite`,
    };
  }

  if (platform === 'windows') {
    return {
      configFile: `${WINDOWS_SYSTEM_ROOT}/clawrouter.toml`,
      dataDirectory: `${WINDOWS_SYSTEM_ROOT}/Data`,
      sqlitePath: `${WINDOWS_SYSTEM_ROOT}/Data/clawrouter.sqlite`,
    };
  }
  if (platform === 'macos') {
    return {
      configFile: `${MACOS_SERVICE_ROOT}/clawrouter.toml`,
      dataDirectory: `${MACOS_SERVICE_ROOT}/Data`,
      sqlitePath: `${MACOS_SERVICE_ROOT}/Data/clawrouter.sqlite`,
    };
  }
  return {
    configFile: `${LINUX_SERVICE_CONFIG_ROOT}/clawrouter.toml`,
    dataDirectory: LINUX_SERVICE_DATA_ROOT,
    sqlitePath: `${LINUX_SERVICE_DATA_ROOT}/clawrouter.sqlite`,
  };
}

function startCommandForMode({ platform, deploymentMode, binaryName }) {
  if (deploymentMode === 'container') {
    return containerEntrypoint(platform, binaryName);
  }
  return packageBinaryCommand(platform, binaryName);
}

function packageBinaryCommand(platform, binaryName) {
  if (platform === 'windows') {
    return `.\\bin\\${binaryName}`;
  }
  return `./bin/${binaryName}`;
}

function serviceIntegrationFor(platform, deploymentMode) {
  if (deploymentMode !== 'service') {
    return null;
  }
  if (platform === 'windows') {
    return {
      kind: 'windows-service',
      manifest: 'service/windows/clawrouter.xml',
    };
  }
  if (platform === 'linux') {
    return {
      kind: 'systemd',
      manifest: 'service/linux/clawrouter.service',
    };
  }
  return {
    kind: 'launchd',
    manifest: 'service/macos/com.sdkwork.clawrouter.plist',
  };
}

function containerIntegrationFor(platform, deploymentMode, binaryName) {
  if (deploymentMode !== 'container') {
    return null;
  }
  if (platform === 'windows') {
    return {
      kind: 'container-image',
      baseImagePolicy: 'windows-nanoserver-runtime',
      entrypoint: `${WINDOWS_CONTAINER_INSTALL_ROOT}/bin/${binaryName}`,
      workingDirectory: WINDOWS_CONTAINER_INSTALL_ROOT,
      runtimeUser: 'ContainerUser',
      exposedPorts: [3900],
    };
  }
  return {
    kind: 'container-image',
    baseImagePolicy: 'distroless-or-minimal-runtime',
    entrypoint: containerEntrypoint(platform, binaryName),
    workingDirectory: POSIX_INSTALL_ROOT,
    runtimeUser: 'sdkwork',
    exposedPorts: [3900],
  };
}

function containerEntrypoint(platform, binaryName) {
  if (platform === 'windows') {
    return `${WINDOWS_CONTAINER_INSTALL_ROOT}/bin/${binaryName}`;
  }
  return `${POSIX_INSTALL_ROOT}/bin/${binaryName}`;
}

function validateInstallPackagePlan(plan) {
  const issues = [];
  if (plan.schemaVersion !== INSTALL_PACKAGE_SCHEMA_VERSION) {
    issues.push(`schemaVersion must be ${INSTALL_PACKAGE_SCHEMA_VERSION}`);
  }
  if (!plan.product || plan.product !== INTERNAL_PROJECT_NAME) {
    issues.push(`product must be ${INTERNAL_PROJECT_NAME}`);
  }
  if (plan.packageName !== PACKAGE_NAME) {
    issues.push(`packageName must be ${PACKAGE_NAME}`);
  }
  if (plan.runtimeName !== PACKAGE_NAME) {
    issues.push(`runtimeName must be ${PACKAGE_NAME}`);
  }
  if (!plan.version || !/^[0-9A-Za-z][0-9A-Za-z._-]*$/u.test(plan.version)) {
    issues.push('version must be a non-empty package-safe value');
  }
  validateArrayMatches('platforms', plan.platforms, SUPPORTED_PLATFORMS, issues);
  validateArrayMatches('architectures', plan.architectures, SUPPORTED_ARCHITECTURES, issues);
  validateArrayMatches('deploymentModes', plan.deploymentModes, SUPPORTED_DEPLOYMENT_MODES, issues);
  for (const contractStep of FAST_INITIALIZATION_CONTRACT) {
    if (!plan.fastInitializationContract?.includes(contractStep)) {
      issues.push(`fastInitializationContract must include ${contractStep}`);
    }
  }
  for (const [field, expected] of Object.entries({
    noSecretsInPackage: true,
    envLocalGeneratedOnHost: true,
    envExampleReferenceOnly: true,
    releaseEnvLocalExcluded: true,
  })) {
    if (plan.artifactPolicy?.[field] !== expected) {
      issues.push(`artifactPolicy.${field} must be ${expected}`);
    }
  }

  const expectedPackageCount =
    (plan.platforms?.length ?? 0)
    * (plan.architectures?.length ?? 0)
    * (plan.deploymentModes?.length ?? 0);
  if (!Array.isArray(plan.packages) || plan.packages.length !== expectedPackageCount) {
    issues.push(`packages must contain ${expectedPackageCount} entries`);
    return issues;
  }

  const seenIds = new Set();
  for (const packageItem of plan.packages) {
    validatePackageItem(packageItem, seenIds, issues);
  }

  return issues;
}

function validatePackageItem(packageItem, seenIds, issues) {
  const expectedId = `${packageItem.platform}-${packageItem.architecture}-${packageItem.deploymentMode}`;
  if (packageItem.id !== expectedId) {
    issues.push(`${packageItem.id ?? '(missing id)'} id must be ${expectedId}`);
  }
  const expectedArtifactId = artifactIdForPackage(packageItem);
  if (packageItem.artifactId !== expectedArtifactId) {
    issues.push(`${packageItem.id} artifactId must be ${expectedArtifactId}`);
  }
  if (!packageItem.version || !/^[0-9A-Za-z][0-9A-Za-z._-]*$/u.test(packageItem.version)) {
    issues.push(`${packageItem.id} version must be a non-empty package-safe value`);
  }
  if (seenIds.has(packageItem.id)) {
    issues.push(`${packageItem.id} is duplicated`);
  }
  seenIds.add(packageItem.id);
  const expectedArchiveExtension = packageItem.platform === 'windows' ? 'zip' : 'tar.gz';
  const expectedArchiveName = `${PACKAGE_NAME}-${expectedArtifactId}-${packageItem.version}.${expectedArchiveExtension}`;
  if (packageItem.archiveName !== expectedArchiveName) {
    issues.push(`${packageItem.id} archiveName must be ${expectedArchiveName}`);
  }

  for (const artifactKind of [
    'edge-binary',
    'installer-binary',
    'portal-dist',
    'sdk-archives',
    'env-template',
    'runtime-config-template',
    'install-guide',
    'install-manifest',
  ]) {
    if (!packageItem.artifacts?.some((artifact) => artifact.kind === artifactKind && artifact.required === true)) {
      issues.push(`${packageItem.id} must include required ${artifactKind} artifact`);
    }
  }
  if (
    packageItem.artifacts?.some((artifact) => {
      const artifactPath = String(artifact.path);
      return artifactPath === '.env.release'
        || artifactPath.endsWith('/.env.release')
        || artifactPath.endsWith('\\.env.release');
    })
  ) {
    issues.push(`${packageItem.id} must not include host-local release env output`);
  }
  if (!Array.isArray(packageItem.initCommands) || packageItem.initCommands.length < 2) {
    issues.push(`${packageItem.id} must include fast initialization commands`);
  } else {
    for (const command of [
      'ensure',
      'refresh-catalog --force',
    ]) {
      if (!packageItem.initCommands.some((initCommand) => initCommand.includes(command))) {
        issues.push(`${packageItem.id} initCommands must include ${command}`);
      }
    }
    if (packageItem.initCommands.some((initCommand) => /pnpm(\.cmd)?\s+release:env:write/u.test(initCommand))) {
      issues.push(`${packageItem.id} must not require source-only release env scripts during package initialization`);
    }
    const commandPrefix = packageItem.platform === 'windows' ? '.\\bin\\' : './bin/';
    if (!packageItem.initCommands.every((initCommand) => initCommand.startsWith(commandPrefix))) {
      issues.push(`${packageItem.id} initCommands must use package-local bin paths`);
    }
    if (packageItem.initCommands.some((initCommand) => /pnpm(\.cmd)?\s+dev|smoke:dev/u.test(initCommand))) {
      issues.push(`${packageItem.id} must not start the live development workspace during install initialization`);
    }
  }
  if (!arraysEqual(packageItem.healthChecks, HEALTH_CHECKS)) {
    issues.push(`${packageItem.id} healthChecks must be ${HEALTH_CHECKS.join(', ')}`);
  }
  if (packageItem.security?.noSecretsInPackage !== true) {
    issues.push(`${packageItem.id} security.noSecretsInPackage must be true`);
  }
  if (packageItem.security?.trustForwardedHeadersDefault !== false) {
    issues.push(`${packageItem.id} security.trustForwardedHeadersDefault must be false`);
  }
  if (packageItem.deploymentMode === 'service' && !packageItem.serviceIntegration?.kind) {
    issues.push(`${packageItem.id} service mode must declare a service integration`);
  }
  if (packageItem.deploymentMode === 'container' && packageItem.containerIntegration?.kind !== 'container-image') {
    issues.push(`${packageItem.id} container mode must declare a container image integration`);
  }
  if (packageItem.deploymentMode === 'desktop' && packageItem.runtimeProfile !== 'desktop') {
    issues.push(`${packageItem.id} desktop mode must declare the desktop runtime profile`);
  }
  if (packageItem.deploymentMode !== 'desktop' && packageItem.runtimeProfile !== 'server') {
    issues.push(`${packageItem.id} server package modes must declare the server runtime profile`);
  }
  if (!packageItem.databasePolicy?.configurableFromFile) {
    issues.push(`${packageItem.id} databasePolicy must support runtime config files`);
  }
  if (!packageItem.databasePolicy?.configFile?.path) {
    issues.push(`${packageItem.id} databasePolicy must declare an OS-standard config file path`);
  }
  if (!packageItem.databasePolicy?.envOverrides?.includes('SDKWORK_DATABASE_URL')) {
    issues.push(`${packageItem.id} databasePolicy must preserve SDKWORK_DATABASE_URL override support`);
  }
  if (packageItem.redisPolicy?.configSection !== 'redis') {
    issues.push(`${packageItem.id} redisPolicy must declare the redis config section`);
  }
  const redisRequiredByRuntimeProfile = packageItem.runtimeProfile !== 'desktop';
  if (packageItem.redisPolicy?.enabledByDefault !== redisRequiredByRuntimeProfile) {
    issues.push(`${packageItem.id} redisPolicy must ${redisRequiredByRuntimeProfile ? 'be enabled' : 'be disabled'} by default`);
  }
  if (
    packageItem.redisPolicy?.required !== redisRequiredByRuntimeProfile
    || packageItem.redisPolicy?.runtimeRequired !== redisRequiredByRuntimeProfile
  ) {
    issues.push(`${packageItem.id} redisPolicy must ${redisRequiredByRuntimeProfile ? 'be required at install and startup' : 'be optional at install and startup'}`);
  }
  for (const key of ['host', 'port', 'database']) {
    if (!packageItem.redisPolicy?.requiredWhenEnabled?.includes(key)) {
      issues.push(`${packageItem.id} redisPolicy must require ${key} when Redis is enabled`);
    }
  }
  if (!packageItem.redisPolicy?.defaultHost) {
    issues.push(`${packageItem.id} redisPolicy must declare redisPolicy.defaultHost`);
  }
  if (!packageItem.redisPolicy?.defaultPort) {
    issues.push(`${packageItem.id} redisPolicy must declare redisPolicy.defaultPort`);
  }
  if (typeof packageItem.redisPolicy?.defaultDatabase !== 'number') {
    issues.push(`${packageItem.id} redisPolicy must declare redisPolicy.defaultDatabase`);
  }
  if (!packageItem.redisPolicy?.passwordFile?.path) {
    issues.push(`${packageItem.id} redisPolicy must declare the standard optional password file path`);
  }
  if (packageItem.redisPolicy?.passwordFile?.required !== redisRequiredByRuntimeProfile) {
    issues.push(`${packageItem.id} redisPolicy password file must ${redisRequiredByRuntimeProfile ? 'be required' : 'remain optional'}`);
  }
  for (const envKey of [
    'SDKWORK_CLAW_REDIS_HOST',
    'SDKWORK_CLAW_REDIS_PORT',
    'SDKWORK_CLAW_REDIS_DATABASE',
    'SDKWORK_CLAW_REDIS_URL',
  ]) {
    if (!packageItem.redisPolicy?.envOverrides?.includes(envKey)) {
      issues.push(`${packageItem.id} redisPolicy must document ${envKey} override support`);
    }
  }
  if (packageItem.runtimeProfile === 'desktop') {
    if (packageItem.databasePolicy?.defaultEngine !== 'sqlite') {
      issues.push(`${packageItem.id} desktop packages must default to SQLite`);
    }
    if (!packageItem.databasePolicy?.defaultSqlitePath) {
      issues.push(`${packageItem.id} desktop packages must declare the default SQLite file path`);
    }
  } else {
    if (packageItem.databasePolicy?.defaultEngine !== 'postgresql') {
      issues.push(`${packageItem.id} server package modes must default to PostgreSQL`);
    }
    if (packageItem.databasePolicy?.requiresExternalDatabase !== true) {
      issues.push(`${packageItem.id} server package modes must require an external database`);
    }
    for (const key of ['defaultHost', 'defaultPort', 'defaultDatabase', 'defaultUsername']) {
      if (!packageItem.databasePolicy?.[key]) {
        issues.push(`${packageItem.id} server package modes must declare databasePolicy.${key}`);
      }
    }
    if (!packageItem.databasePolicy?.passwordFile?.path) {
      issues.push(`${packageItem.id} server package modes must declare databasePolicy.passwordFile.path`);
    }
  }
  if (
    packageItem.deploymentMode === 'container'
    && packageItem.startCommand !== packageItem.containerIntegration?.entrypoint
  ) {
    issues.push(`${packageItem.id} startCommand must match the container entrypoint`);
  }
  if (packageItem.deploymentMode !== 'container') {
    const commandPrefix = packageItem.platform === 'windows' ? '.\\bin\\' : './bin/';
    if (!String(packageItem.startCommand).startsWith(commandPrefix)) {
      issues.push(`${packageItem.id} startCommand must use the package-local gateway binary`);
    }
  }
}

function renderInstallPackagePlan(plan) {
  return [
    `[install-packages] product: ${plan.product}`,
    `[install-packages] schema: ${plan.schemaVersion}`,
    `[install-packages] version: ${plan.version}`,
    `[install-packages] supported platforms: ${plan.platforms.join(', ')}`,
    `[install-packages] supported architectures: ${plan.architectures.join(', ')}`,
    `[install-packages] deployment modes: ${plan.deploymentModes.join(', ')}`,
    `[install-packages] fast init: ${plan.fastInitializationContract.join(', ')}`,
    `[install-packages] packages: ${plan.packages.length}`,
    ...plan.packages.map((packageItem) => [
      `[install-packages]   ${packageItem.id}`,
      `archive=${packageItem.archiveName}`,
      `kind=${packageItem.packageKind}`,
      `profile=${packageItem.runtimeProfile}`,
      `database=${packageItem.databasePolicy.defaultEngine}`,
      `binary=${packageItem.binaryName}`,
      `installer=${packageItem.installerBinaryName}`,
      `health=${packageItem.healthChecks.join('+')}`,
    ].join(' ')),
  ];
}

async function main(argv = process.argv.slice(2)) {
  const settings = parseArgs(argv);
  if (settings.help) {
    printHelp();
    return 0;
  }

  const plan = createInstallPackagePlan({ version: settings.version });
  const issues = validateInstallPackagePlan(plan);
  if (settings.json) {
    console.log(JSON.stringify({
      ok: issues.length === 0,
      issues,
      plan,
    }, null, 2));
  } else {
    for (const line of renderInstallPackagePlan(plan)) {
      console.log(line);
    }
    if (issues.length > 0) {
      console.error('[install-packages] validation issues:');
      for (const issue of issues) {
        console.error(`[install-packages]   ${issue}`);
      }
    } else if (settings.check) {
      console.log('[install-packages] validation passed');
    }
  }

  if (settings.check && issues.length > 0) {
    return 1;
  }
  return 0;
}

function normalizeVersion(version) {
  const normalized = String(version ?? '').trim();
  if (!/^[0-9A-Za-z][0-9A-Za-z._-]*$/u.test(normalized)) {
    throw new Error('version must be a non-empty package-safe value');
  }
  return normalized;
}

function validateSelection(label, selected, supported) {
  if (!Array.isArray(selected) || selected.length === 0) {
    throw new Error(`${label} must contain at least one value`);
  }
  const unique = [...new Set(selected.map((value) => String(value).trim()))];
  for (const value of unique) {
    if (!supported.includes(value)) {
      throw new Error(`${label} contains unsupported value: ${value}`);
    }
  }
  return unique;
}

function validateArrayMatches(label, actual, expected, issues) {
  if (!arraysEqual(actual, expected)) {
    issues.push(`${label} must be ${expected.join(', ')}`);
  }
}

function arraysEqual(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    console.error(`[install-packages] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

export {
  DEFAULT_VERSION,
  EDGE_BINARY_BASENAME,
  FAST_INITIALIZATION_CONTRACT,
  INSTALLER_BINARY_BASENAME,
  INSTALL_PACKAGE_SCHEMA_VERSION,
  INTERNAL_PROJECT_NAME,
  LINUX_SERVICE_CONFIG_ROOT,
  LINUX_SERVICE_DATA_ROOT,
  LINUX_SERVICE_LOG_ROOT,
  LINUX_SERVICE_RUNTIME_ROOT,
  LINUX_SHARED_DOC_ROOT,
  LINUX_SHARED_ROOT,
  MACOS_SHARED_DOC_ROOT,
  MACOS_SHARED_ROOT,
  PACKAGE_NAME,
  POSIX_INSTALL_ROOT,
  RUNTIME_CONFIG_TEMPLATE_PATH,
  RUNTIME_DISPLAY_NAME,
  POSTGRES_DSN_EXAMPLE,
  SUPPORTED_ARCHITECTURES,
  SUPPORTED_DEPLOYMENT_MODES,
  SUPPORTED_PLATFORMS,
  CONTAINER_SECRET_ROOT,
  MACOS_SERVICE_ROOT,
  USER_PRIVATE_ROUTER_ROOT,
  WINDOWS_CONTAINER_INSTALL_ROOT,
  WINDOWS_INSTALL_ROOT,
  WINDOWS_SYSTEM_ROOT,
  WINDOWS_USER_ROOT,
  artifactDeploymentLabelForMode,
  artifactIdForPackage,
  createInstallPackagePlan,
  databasePolicyFor,
  main,
  parseArgs,
  renderInstallPackagePlan,
  redisPolicyFor,
  runtimeConfigLocationsFor,
  runtimeProfileForMode,
  validateInstallPackagePlan,
};
