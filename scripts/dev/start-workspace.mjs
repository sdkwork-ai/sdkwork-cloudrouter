#!/usr/bin/env node

import { mkdirSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  defaultClawRouterDevPostgresDatabaseUrl,
  defaultClawRouterDevPostgresMaxConnections,
  resolveWorkspaceDevDatabaseEnv,
} from './claw-router-dev-database-env.mjs';
import {
  mergePortalPublicRuntimeEnv,
  omitPortalPublicRuntimeEnv,
  portalPublicRuntimeEnvLineValue,
  resolvePortalPublicRuntimeEnv,
} from '../portal-public-runtime-env.mjs';
import { ensureClawRouterBrowserDevelopmentEnv } from './claw-router-application-env.mjs';
import {
  CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS,
} from '../lib/claw-router-browser-env-contract.mjs';
import {
  CLAW_ROUTER_EDGE_ENV_KEYS,
  buildRuntimeEdgePrivateEnv,
  resolveEdgeEnvValue,
} from '../lib/claw-router-edge-env-contract.mjs';
import {
  applyTopologyProfileToWorkspaceSettings,
  bridgeLegacyWorkspaceEnv,
  bridgeTopologyBindEnvToLegacyRustEnv,
  IAM_APPLICATION_BOOTSTRAP_ENV,
  loadTopologyProfileForWorkspace,
  resolveServiceLayoutFromRuntimeMode,
  waitForHttpHealthy,
  waitForWorkspaceHealthSurfaces,
} from '../lib/claw-router-topology.mjs';
import {
  deriveFoundationEnvFromResolution,
  resolveComposition,
} from '../../../sdkwork-specs/tools/lib/composition-resolver.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repositoryRoot = path.resolve(__dirname, '..', '..');

const DEFAULT_GATEWAY_BIND = '127.0.0.1:18080';
const DEFAULT_ADMIN_API_BIND = '127.0.0.1:18081';
const DEFAULT_APP_API_BIND = '127.0.0.1:18082';
const DEFAULT_SERVER_BIND = '0.0.0.0:3900';
const DEFAULT_PORTAL_BIND = '127.0.0.1:3901';
const DEFAULT_SDKWORK_API_CLOUD_GATEWAY_BIND = '127.0.0.1:3902';
const DEFAULT_EXTERNAL_SCHEME = 'http';
const DEFAULT_DEV_DATABASE_RELATIVE_PATH = path.join('target', 'dev', 'clawrouter.sqlite');
const DEFAULT_MODELS_CATALOG_RELATIVE_PATH = path.join('..', 'sdkwork-models');
const DEFAULT_DEV_SECRET =
  'sdkwork-clawrouter-local-dev-secret-20260507';
const DEFAULT_DEV_SNOWFLAKE_NODE_IDS = Object.freeze({
  installer: '1000',
  modelCatalogRefresh: '1001',
  gateway: '1002',
  adminApi: '1003',
  appApi: '1004',
  server: '1005',
});
const EDGE_GATEWAY_PACKAGE = 'sdkwork-clawrouter-standalone-gateway-lib';
const APP_API_GATEWAY_PACKAGE = 'sdkwork-clawrouter-standalone-gateway';
const DEFAULT_DEV_REDIS_HOST = '127.0.0.1';
const DEFAULT_DEV_REDIS_PORT = '6379';
const DEFAULT_DEV_REDIS_DATABASE = '0';
const GATEWAY_API_PREFIX = '/v1';
const BACKEND_API_PREFIX = '/backend/v3/api';
const APP_API_PREFIX = '/app/v3/api';
const CLIENT_PUBLIC_RUNTIME_DEFAULTS = Object.freeze({
  toolApiEnabled: 'false',
});

function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function splitBind(bind, flagName) {
  const match = String(bind ?? '').trim().match(/^(.*):(\d+)$/u);
  if (!match) {
    throw new Error(`${flagName} must be a host:port value`);
  }

  const host = match[1];
  const port = Number.parseInt(match[2], 10);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${flagName} must be a host:port value`);
  }

  return { host, port: String(port) };
}

function listenHostFromBindHost(host) {
  if (host === '[::]') {
    return '::';
  }
  return host;
}

function toPortablePath(value) {
  return value.replaceAll(path.sep, '/');
}

function loopbackUrl(bind, pathSuffix) {
  const { host, port } = splitBind(bind, '--bind');
  const loopbackHost = host === '0.0.0.0' || host === '[::]' || host === '::'
    ? '127.0.0.1'
    : host;
  return `http://${loopbackHost}:${port}${pathSuffix}`;
}

function localNetworkIpv4Addresses(interfaces = networkInterfaces()) {
  const addresses = [];
  for (const entries of Object.values(interfaces ?? {})) {
    for (const entry of entries ?? []) {
      if (entry?.family !== 'IPv4' || entry.internal || !entry.address) {
        continue;
      }
      if (!isPrivateIpv4Address(entry.address)) {
        continue;
      }
      if (!addresses.includes(entry.address)) {
        addresses.push(entry.address);
      }
    }
  }
  return addresses.sort();
}

function isPrivateIpv4Address(address) {
  const octets = address.split('.').map((value) => Number.parseInt(value, 10));
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value))) {
    return false;
  }
  return octets[0] === 10
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168);
}

function lanAccessLines(bind, pathSuffix, interfaces) {
  const { host, port } = splitBind(bind, '--bind');
  if (!['0.0.0.0', '[::]', '::'].includes(host)) {
    return [];
  }
  return localNetworkIpv4Addresses(interfaces).map(
    (address) => `[start-workspace]   LAN: http://${address}:${port}${pathSuffix}`,
  );
}

export function successfulStartupAccessLines(settings, interfaces) {
  const accessBind = settings.runtimeMode === 'client'
    ? settings.portalBind
    : settings.serverBind;
  const lanLines = lanAccessLines(accessBind, '/', interfaces);
  return [
    '[start-workspace] application started successfully',
    '[start-workspace] Access URLs',
    `[start-workspace]   Local: ${loopbackUrl(accessBind, '/')}`,
    ...(lanLines.length > 0
      ? lanLines
      : ['[start-workspace]   LAN: unavailable (listener is loopback-only or no LAN IPv4 address was detected)']),
  ];
}

export async function waitForPortalReady(settings, {
  waitFn = waitForHttpHealthy,
  timeoutMs = 2000,
  pollMs = 500,
  maxAttempts = 60,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  const portalUrl = loopbackUrl(settings.portalBind, '/');
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (await waitFn(portalUrl, timeoutMs)) {
      return portalUrl;
    }
    await sleep(pollMs);
  }
  throw new Error(`timed out waiting for portal at ${portalUrl}`);
}

function forwardingOrigin(value, flagName) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${flagName} must be an HTTP/HTTPS origin`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${flagName} must be an HTTP/HTTPS origin`);
  }
  if ((parsed.pathname && parsed.pathname !== '/') || parsed.search || parsed.hash) {
    throw new Error(`${flagName} must be an origin without path, query, or hash`);
  }

  return parsed.origin;
}

function forwardingOriginFromBind(bind, flagName) {
  return forwardingOrigin(loopbackUrl(bind, ''), flagName);
}

function appendPath(origin, pathSuffix) {
  return `${String(origin).replace(/\/+$/u, '')}${pathSuffix}`;
}

function managedSdkworkApiGatewayBaseUrl(settings) {
  return loopbackUrl(settings.sdkworkApiGatewayBind, '');
}

function sharedFoundationGatewayBaseUrl(settings) {
  return managedSdkworkApiGatewayBaseUrl(settings);
}

function loadCompositionResolution(workspaceRoot) {
  try {
    return resolveComposition(workspaceRoot);
  } catch (error) {
    console.warn(
      `[start-workspace] composition resolver unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      integrations: [],
      env: {},
      requiresPlatformGatewayProcess: false,
      issues: [],
    };
  }
}

function deriveFoundationPortalEnv(runtimeEnv, settings, {
  clawRouterAppApiBaseUrl,
  clawRouterBackendApiBaseUrl,
  compositionResolution,
}) {
  const platformGatewayOrigin = managedSdkworkApiGatewayBaseUrl(settings);
  const derived = deriveFoundationEnvFromResolution(compositionResolution, {
    platformGatewayOrigin,
    productAppApiBaseUrl: clawRouterAppApiBaseUrl,
    productBackendApiBaseUrl: clawRouterBackendApiBaseUrl,
  });

  const merged = { ...runtimeEnv };
  for (const [key, value] of Object.entries(derived)) {
    if (merged[key] === undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

function sharedFoundationAppApiBaseUrl(settings) {
  return appendPath(sharedFoundationGatewayBaseUrl(settings), APP_API_PREFIX);
}

function sharedFoundationBackendApiBaseUrl(settings) {
  return appendPath(sharedFoundationGatewayBaseUrl(settings), BACKEND_API_PREFIX);
}

function withBrowserDevelopmentViteRuntimeEnv(env, settings, {
  productSurfaceMode = 'same-origin',
} = {}) {
  return omitPortalPublicRuntimeEnv(
    withSharedFoundationPortalRuntimeEnv(env, settings, { productSurfaceMode }),
  );
}

function withSharedFoundationPortalRuntimeEnv(env, settings, {
  productSurfaceMode = 'same-origin',
  compositionResolution = loadCompositionResolution(repositoryRoot),
} = {}) {
  const sdkBaseUrl = String(
    env.PORTAL_PUBLIC_SDK_BASE_URL ?? sharedFoundationGatewayBaseUrl(settings),
  ).trim();
  const runtimeEnvInput = productSurfaceMode === 'shared-gateway'
    ? {
        ...env,
        ...bridgeLegacyWorkspaceEnv(env, { runtimeMode: settings.runtimeMode }),
        PORTAL_PUBLIC_SDK_BASE_URL: sdkBaseUrl,
      }
    : {
        ...env,
        ...bridgeLegacyWorkspaceEnv(env, { runtimeMode: settings.runtimeMode }),
        PORTAL_PUBLIC_SDK_BASE_URL: sdkBaseUrl,
        PORTAL_PUBLIC_API_BASE_URL: String(env.PORTAL_PUBLIC_API_BASE_URL ?? GATEWAY_API_PREFIX).trim(),
        PORTAL_PUBLIC_OPEN_API_BASE_URL: String(
          env.PORTAL_PUBLIC_OPEN_API_BASE_URL ?? env.PORTAL_PUBLIC_API_BASE_URL ?? GATEWAY_API_PREFIX,
        ).trim(),
        PORTAL_PUBLIC_APP_API_BASE_URL: String(env.PORTAL_PUBLIC_APP_API_BASE_URL ?? APP_API_PREFIX).trim(),
        PORTAL_PUBLIC_BACKEND_API_BASE_URL: String(
          env.PORTAL_PUBLIC_BACKEND_API_BASE_URL ?? BACKEND_API_PREFIX,
        ).trim(),
      };
  const runtimeEnv = mergePortalPublicRuntimeEnv(
    runtimeEnvInput,
    productSurfaceMode === 'shared-gateway' ? CLIENT_PUBLIC_RUNTIME_DEFAULTS : undefined,
  );
  const clawRouterOpenApiBaseUrl = runtimeEnv.VITE_CLAWROUTER_OPEN_API_BASE_URL
    ?? runtimeEnv.PORTAL_PUBLIC_OPEN_API_BASE_URL
    ?? runtimeEnv.PORTAL_PUBLIC_API_BASE_URL
    ?? appendPath(sdkBaseUrl, GATEWAY_API_PREFIX);
  const clawRouterAppApiBaseUrl = runtimeEnv.VITE_CLAWROUTER_APP_API_BASE_URL
    ?? runtimeEnv.PORTAL_PUBLIC_APP_API_BASE_URL
    ?? appendPath(sdkBaseUrl, APP_API_PREFIX);
  const clawRouterBackendApiBaseUrl = runtimeEnv.VITE_CLAWROUTER_BACKEND_API_BASE_URL
    ?? runtimeEnv.PORTAL_PUBLIC_BACKEND_API_BASE_URL
    ?? appendPath(sdkBaseUrl, BACKEND_API_PREFIX);

  return deriveFoundationPortalEnv({
    ...runtimeEnv,
    VITE_CLAWROUTER_OPEN_API_BASE_URL: clawRouterOpenApiBaseUrl,
    VITE_CLAWROUTER_APP_API_BASE_URL: clawRouterAppApiBaseUrl,
    VITE_CLAWROUTER_BACKEND_API_BASE_URL: clawRouterBackendApiBaseUrl,
  }, settings, {
    clawRouterAppApiBaseUrl,
    clawRouterBackendApiBaseUrl,
    compositionResolution,
  });
}

function normalizeExternalScheme(value, flagName) {
  const scheme = String(value ?? '').trim().toLowerCase();
  if (scheme !== 'http' && scheme !== 'https') {
    throw new Error(`${flagName} must be http or https`);
  }
  return scheme;
}

function pnpmCommand(platform = process.platform) {
  return platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function shellForPnpm(platform = process.platform) {
  return platform === 'win32';
}

function cargoCommand(platform = process.platform) {
  return platform === 'win32' ? 'cargo.exe' : 'cargo';
}

export function clawRouterDevCargoTargetDir(workspaceRoot) {
  return process.env.SDKWORK_CLAWROUTER_DEV_CARGO_TARGET_DIR
    ?? path.join(workspaceRoot, 'target', 'dev-workspace');
}

export function clawRouterDevInstallerBinaryPath(
  workspaceRoot,
  platform = process.platform,
) {
  return path.join(
    clawRouterDevCargoTargetDir(workspaceRoot),
    'debug',
    platform === 'win32' ? 'clawrouterctl.exe' : 'clawrouterctl',
  );
}

function clawRouterDevCargoEnv(workspaceRoot, baseEnv = process.env) {
  return {
    ...baseEnv,
    ...IAM_APPLICATION_BOOTSTRAP_ENV,
    CARGO_TARGET_DIR: clawRouterDevCargoTargetDir(workspaceRoot),
  };
}

export function clawRouterRustDevPackages(settings) {
  if (settings.runtimeMode === 'client') {
    return [];
  }

  const packages = ['sdkwork-claw-installer'];
  if (settings.runtimeMode === 'all-in-one') {
    packages.push(EDGE_GATEWAY_PACKAGE);
    return packages;
  }

  if (settings.runtimeMode === 'distributed') {
    packages.push(
      'sdkwork-clawrouter-cloud-gateway',
      APP_API_GATEWAY_PACKAGE,
      'sdkwork-clawrouter-admin-gateway',
      APP_API_GATEWAY_PACKAGE,
    );
  }

  return packages;
}

export function cargoRunPackageArgs(packageName, trailingArgs = []) {
  const args = ['run', '-p', packageName];
  if (trailingArgs.length > 0) {
    args.push('--', ...trailingArgs);
  }
  return args;
}

function rustPrebuildStep(settings, { workspaceRoot, platform }) {
  const packages = clawRouterRustDevPackages(settings);
  if (packages.length === 0) {
    return null;
  }

  return {
    name: 'rust-prebuild',
    command: cargoCommand(platform),
    args: ['build', ...packages.flatMap((packageName) => ['-p', packageName])],
    cwd: workspaceRoot,
    env: clawRouterDevCargoEnv(workspaceRoot),
    shell: false,
    windowsHide: platform === 'win32',
    blocking: true,
  };
}

function sdkworkApiGatewayTargetDir(workspaceRoot) {
  const apiGatewayWorkspaceRoot = path.resolve(workspaceRoot, '..', 'sdkwork-api-cloud-gateway');
  return process.env.SDKWORK_API_CLOUD_GATEWAY_CARGO_TARGET_DIR
    ?? path.join(apiGatewayWorkspaceRoot, 'target', 'claw-router-dev');
}

function sdkworkApiGatewayPrebuildStep(settings, { workspaceRoot, platform }) {
  if (settings.runtimeMode === 'all-in-one') {
    return null;
  }

  const apiGatewayWorkspaceRoot = path.resolve(workspaceRoot, '..', 'sdkwork-api-cloud-gateway');
  return {
    name: 'sdkwork-api-cloud-gateway-prebuild',
    command: cargoCommand(platform),
    args: [
      'build',
      '-p',
      'sdkwork-api-cloud-gateway',
      '--bin',
      'sdkwork-api-cloud-gateway',
    ],
    cwd: apiGatewayWorkspaceRoot,
    env: {
      ...process.env,
      CARGO_TARGET_DIR: sdkworkApiGatewayTargetDir(workspaceRoot),
    },
    shell: false,
    windowsHide: platform === 'win32',
    blocking: true,
  };
}

function localSqliteDatabaseUrl(workspaceRoot) {
  return `sqlite://${toPortablePath(DEFAULT_DEV_DATABASE_RELATIVE_PATH)}`;
}

function environmentDatabaseConfig(
  workspaceRoot = repositoryRoot,
  { skipDevEnvFile = false } = {},
) {
  return resolveWorkspaceDevDatabaseEnv({
    env: process.env,
    workspaceRoot,
    forwardedDatabaseUrl: skipDevEnvFile,
    defaultDatabase: 'none',
  });
}

function defaultPostgresDatabaseUrl() {
  return defaultClawRouterDevPostgresDatabaseUrl();
}

function defaultModelsCatalogRoot(workspaceRoot) {
  return path.join(workspaceRoot, DEFAULT_MODELS_CATALOG_RELATIVE_PATH);
}

function resolveModelsCatalogRoot(settings, workspaceRoot) {
  return String(
    process.env.SDKWORK_MODELS_CATALOG_ROOT ?? settings.modelsCatalogRoot ?? defaultModelsCatalogRoot(workspaceRoot),
  ).trim();
}

function ensureLocalSqliteDatabaseDirectory(settings, workspaceRoot) {
  const defaultDatabaseUrl = localSqliteDatabaseUrl(workspaceRoot);
  if (settings.databaseUrl !== defaultDatabaseUrl) {
    return;
  }
  mkdirSync(path.dirname(path.join(workspaceRoot, DEFAULT_DEV_DATABASE_RELATIVE_PATH)), {
    recursive: true,
  });
}

export function parseWorkspaceArgs(argv = [], {
  workspaceRoot = repositoryRoot,
  skipDevEnvFile = false,
} = {}) {
  const settings = {
    databaseUrl: null,
    gatewayBind: DEFAULT_GATEWAY_BIND,
    adminApiBind: DEFAULT_ADMIN_API_BIND,
    appApiBind: DEFAULT_APP_API_BIND,
    serverBind: DEFAULT_SERVER_BIND,
    portalBind: DEFAULT_PORTAL_BIND,
    sdkworkApiGatewayBind: DEFAULT_SDKWORK_API_CLOUD_GATEWAY_BIND,
    externalScheme: DEFAULT_EXTERNAL_SCHEME,
    trustForwardedHeaders: false,
    gatewayForwardUrl: null,
    backendApiForwardUrl: null,
    appApiForwardUrl: null,
    runtimeMode: 'all-in-one',
    runtimeModeExplicit: false,
    explicitForwarding: false,
    deploymentProfile: 'standalone',
    serviceLayout: 'unified-process',
    profileId: undefined,
    gatewayBindExplicit: false,
    adminApiBindExplicit: false,
    appApiBindExplicit: false,
    serverBindExplicit: false,
    portalBindExplicit: false,
    sdkworkApiGatewayBindExplicit: false,
    install: false,
    dryRun: false,
    planFormat: 'text',
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--database-url':
        settings.databaseUrl = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--gateway-bind':
        settings.gatewayBind = requireValue(argv, index, arg);
        settings.gatewayBindExplicit = true;
        index += 1;
        break;
      case '--admin-api-bind':
        settings.adminApiBind = requireValue(argv, index, arg);
        settings.adminApiBindExplicit = true;
        index += 1;
        break;
      case '--app-api-bind':
        settings.appApiBind = requireValue(argv, index, arg);
        settings.appApiBindExplicit = true;
        index += 1;
        break;
      case '--server-bind':
        settings.serverBind = requireValue(argv, index, arg);
        settings.serverBindExplicit = true;
        index += 1;
        break;
      case '--portal-bind':
        settings.portalBind = requireValue(argv, index, arg);
        settings.portalBindExplicit = true;
        index += 1;
        break;
      case '--sdkwork-api-cloud-gateway-bind':
        settings.sdkworkApiGatewayBind = requireValue(argv, index, arg);
        settings.sdkworkApiGatewayBindExplicit = true;
        index += 1;
        break;
      case '--external-scheme':
        settings.externalScheme = normalizeExternalScheme(requireValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--trust-forwarded-headers':
        settings.trustForwardedHeaders = true;
        break;
      case '--gateway-forward-url':
        settings.gatewayForwardUrl = forwardingOrigin(requireValue(argv, index, arg), arg);
        settings.explicitForwarding = true;
        index += 1;
        break;
      case '--backend-api-forward-url':
        settings.backendApiForwardUrl = forwardingOrigin(requireValue(argv, index, arg), arg);
        settings.explicitForwarding = true;
        index += 1;
        break;
      case '--app-api-forward-url':
        settings.appApiForwardUrl = forwardingOrigin(requireValue(argv, index, arg), arg);
        settings.explicitForwarding = true;
        index += 1;
        break;
      case '--topology':
        throw new Error(
          '--topology is retired; use --deployment-profile (standalone|cloud) and --service-layout (unified-process|split-services)',
        );
      case '--deployment-profile':
        settings.deploymentProfile = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--hosting':
        throw new Error(
          '--hosting is retired; use --deployment-profile (standalone or cloud)',
        );
      case '--service-layout':
        settings.serviceLayout = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--distributed':
        settings.serviceLayout = 'split-services';
        break;
      case '--internal-distributed':
        throw new Error(
          '--internal-distributed is retired; use --service-layout split-services',
        );
      case '--all-in-one':
        throw new Error(
          '--all-in-one is retired; use --service-layout unified-process',
        );
      case '--client-only':
        settings.runtimeMode = 'client';
        settings.runtimeModeExplicit = true;
        break;
      case '--install':
        settings.install = true;
        break;
      case '--dry-run':
        settings.dryRun = true;
        break;
      case '--plan-format':
        settings.planFormat = requireValue(argv, index, arg);
        index += 1;
        break;
      case '--help':
      case '-h':
        settings.help = true;
        break;
      default:
        throw new Error(`unknown option: ${arg}`);
    }
  }

  for (const [flagName, value] of [
    ['--gateway-bind', settings.gatewayBind],
    ['--admin-api-bind', settings.adminApiBind],
    ['--app-api-bind', settings.appApiBind],
    ['--server-bind', settings.serverBind],
    ['--portal-bind', settings.portalBind],
    ['--sdkwork-api-cloud-gateway-bind', settings.sdkworkApiGatewayBind],
  ]) {
    splitBind(value, flagName);
  }

  if (!['text', 'json'].includes(settings.planFormat)) {
    throw new Error('--plan-format must be text or json');
  }
  settings.externalScheme = normalizeExternalScheme(settings.externalScheme, '--external-scheme');

  if (settings.explicitForwarding && !settings.runtimeModeExplicit) {
    settings.runtimeMode = 'distributed';
    settings.serviceLayout = 'split-services';
  }
  if (settings.runtimeModeExplicit && !settings.serviceLayout) {
    settings.serviceLayout = resolveServiceLayoutFromRuntimeMode(settings.runtimeMode)
      ?? settings.serviceLayout;
  }
  if (settings.runtimeMode !== 'client' && settings.databaseUrl === null) {
    settings.databaseUrl = environmentDatabaseConfig(workspaceRoot, { skipDevEnvFile }).databaseUrl
      ?? defaultPostgresDatabaseUrl();
  }
  const topologyProfile = loadTopologyProfileForWorkspace({
    deploymentProfile: settings.deploymentProfile,
    serviceLayout: settings.serviceLayout,
    env: process.env,
    includeIamDatabase: false,
  });
  applyTopologyProfileToWorkspaceSettings(settings, topologyProfile.profileEnv);
  const legacyBindEnv = bridgeTopologyBindEnvToLegacyRustEnv(
    topologyProfile.profileEnv,
    settings,
  );
  for (const [key, value] of Object.entries({ ...topologyProfile.profileEnv, ...legacyBindEnv })) {
    if (value !== undefined && !key.startsWith('VITE_')) {
      process.env[key] = value;
    }
  }
  for (const [key, value] of Object.entries(IAM_APPLICATION_BOOTSTRAP_ENV)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
  const edgeServerOrigin = forwardingOriginFromBind(settings.serverBind, '--server-bind');
  if (settings.runtimeMode === 'client') {
    const sdkworkApiGatewayOrigin = sharedFoundationGatewayBaseUrl(settings);
    settings.gatewayForwardUrl ??= sdkworkApiGatewayOrigin;
    settings.backendApiForwardUrl ??= sdkworkApiGatewayOrigin;
    settings.appApiForwardUrl ??= sdkworkApiGatewayOrigin;
  } else if (settings.runtimeMode === 'all-in-one') {
    settings.gatewayForwardUrl ??= edgeServerOrigin;
    settings.backendApiForwardUrl ??= edgeServerOrigin;
    settings.appApiForwardUrl ??= edgeServerOrigin;
  } else {
    settings.gatewayForwardUrl ??= forwardingOriginFromBind(settings.gatewayBind, '--gateway-bind');
    settings.backendApiForwardUrl ??= forwardingOriginFromBind(settings.adminApiBind, '--admin-api-bind');
    settings.appApiForwardUrl ??= forwardingOriginFromBind(settings.appApiBind, '--app-api-bind');
  }

  return settings;
}

function serviceEnv(settings, bindEnvName, bindValue, {
  snowflakeNodeId,
  startupInstallMode = 'ensure',
} = {}) {
  if (snowflakeNodeId === undefined) {
    throw new Error('development service Snowflake node id must be explicitly assigned');
  }
  const databaseMaxConnections = process.env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS
    ?? (String(settings.databaseUrl ?? '').trim().toLowerCase().startsWith('sqlite:')
      ? '1'
      : defaultClawRouterDevPostgresMaxConnections());
  const redisUrl = String(process.env.SDKWORK_CLAW_REDIS_URL ?? '').trim();
  const baseEnv = { ...process.env };
  const redisStructuredDefaults = redisUrl
    ? {}
    : {
        SDKWORK_CLAW_REDIS_HOST:
          process.env.SDKWORK_CLAW_REDIS_HOST ?? DEFAULT_DEV_REDIS_HOST,
        SDKWORK_CLAW_REDIS_PORT:
          process.env.SDKWORK_CLAW_REDIS_PORT ?? DEFAULT_DEV_REDIS_PORT,
        SDKWORK_CLAW_REDIS_DATABASE:
          process.env.SDKWORK_CLAW_REDIS_DATABASE ?? DEFAULT_DEV_REDIS_DATABASE,
      };
  if (redisUrl) {
    delete baseEnv.SDKWORK_CLAW_REDIS_HOST;
    delete baseEnv.SDKWORK_CLAW_REDIS_PORT;
    delete baseEnv.SDKWORK_CLAW_REDIS_DATABASE;
    delete baseEnv.SDKWORK_CLAW_REDIS_USERNAME;
  }
  const env = {
    ...baseEnv,
    ...IAM_APPLICATION_BOOTSTRAP_ENV,
    ...redisStructuredDefaults,
    SDKWORK_CLAW_DEPLOYMENT_MODE: 'server',
    SDKWORK_CLAW_SNOWFLAKE_NODE_ID:
      process.env.SDKWORK_CLAW_SNOWFLAKE_NODE_ID ?? snowflakeNodeId,
    [bindEnvName]: bindValue,
    SDKWORK_CLAW_DATABASE_URL: settings.databaseUrl,
    SDKWORK_CLAW_STARTUP_INSTALL_MODE: startupInstallMode,
    SDKWORK_MODELS_CATALOG_ROOT: settings.modelsCatalogRoot,
    SDKWORK_CLAW_MODEL_RANKING_RUN_ON_STARTUP:
      process.env.SDKWORK_CLAW_MODEL_RANKING_RUN_ON_STARTUP ?? 'false',
    SDKWORK_CLAW_USAGE_SETTLEMENT_WORKER_ENABLED:
      process.env.SDKWORK_CLAW_USAGE_SETTLEMENT_WORKER_ENABLED ?? 'false',
    SDKWORK_CLAW_API_KEY_PEPPER:
      process.env.SDKWORK_CLAW_API_KEY_PEPPER ?? DEFAULT_DEV_SECRET,
    SDKWORK_CLAW_TRUSTED_SUBJECT_SECRET:
      process.env.SDKWORK_CLAW_TRUSTED_SUBJECT_SECRET ?? DEFAULT_DEV_SECRET,
    SDKWORK_CLAW_APP_SESSION_SECRET:
      process.env.SDKWORK_CLAW_APP_SESSION_SECRET ?? DEFAULT_DEV_SECRET,
    SDKWORK_CLAW_PAYMENT_WEBHOOK_SECRET:
      process.env.SDKWORK_CLAW_PAYMENT_WEBHOOK_SECRET ?? DEFAULT_DEV_SECRET,
    SDKWORK_CLAW_INSTALL_ENVIRONMENT:
      process.env.SDKWORK_CLAW_INSTALL_ENVIRONMENT ?? 'development',
    SDKWORK_ENVIRONMENT:
      process.env.SDKWORK_ENVIRONMENT
      ?? process.env.SDKWORK_CLAW_INSTALL_ENVIRONMENT
      ?? 'development',
    SDKWORK_CLAW_INSTALL_SEED_PROFILE:
      process.env.SDKWORK_CLAW_INSTALL_SEED_PROFILE ?? 'commercial',
  };
  if (databaseMaxConnections !== undefined) {
    env.SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS = databaseMaxConnections;
  }

  return env;
}

function portalEnv(settings, bootstrapEnv = {}) {
  const { host, port } = splitBind(settings.portalBind, '--portal-bind');
  const isClientMode = settings.runtimeMode === 'client';
  const proxyEnv = {
    [CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi]: settings.gatewayForwardUrl,
    [CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.backendApi]: settings.backendApiForwardUrl,
    [CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.appApi]: settings.appApiForwardUrl,
  };
  return {
    ...withBrowserDevelopmentViteRuntimeEnv(process.env, settings, {
      productSurfaceMode: isClientMode ? 'shared-gateway' : 'same-origin',
    }),
    ...bootstrapEnv,
    ...proxyEnv,
    HOST: host,
    PORT: port,
    OPENAPI_DEV_URL: appendPath(settings.gatewayForwardUrl, '/openapi.json'),
    SDKWORK_CLAW_DEPLOYMENT_MODE:
      process.env.SDKWORK_CLAW_DEPLOYMENT_MODE ?? (isClientMode ? 'web' : 'server'),
    SDKWORK_CLAW_PORTAL_BIND: settings.portalBind,
  };
}

function edgeServerEnv(settings) {
  const allInOne = settings.runtimeMode === 'all-in-one';
  return {
    ...withSharedFoundationPortalRuntimeEnv(serviceEnv(settings, 'SDKWORK_CLAW_SERVER_BIND', settings.serverBind, {
      snowflakeNodeId: DEFAULT_DEV_SNOWFLAKE_NODE_IDS.server,
      startupInstallMode: 'skip',
    }), settings),
    SDKWORK_CLAW_EDGE_SERVER: '1',
    SDKWORK_CLAW_ALL_IN_ONE_RUNTIME: allInOne ? '1' : '0',
    ...(allInOne ? { SDKWORK_API_CLOUD_GATEWAY_MODE: 'embedded' } : {}),
    SDKWORK_CLAW_EDGE_GATEWAY_BASE_URL: settings.gatewayForwardUrl,
    SDKWORK_CLAW_EDGE_BACKEND_API_BASE_URL: settings.backendApiForwardUrl,
    SDKWORK_CLAW_EDGE_APP_API_BASE_URL: settings.appApiForwardUrl,
    SDKWORK_CLAW_APP_RUNTIME_GATEWAY_BASE_URL: settings.gatewayForwardUrl,
    SDKWORK_CLAW_EDGE_PORTAL_BASE_URL: forwardingOriginFromBind(
      settings.portalBind,
      '--portal-bind',
    ),
    SDKWORK_CLAW_EDGE_EXTERNAL_SCHEME: settings.externalScheme,
    SDKWORK_CLAW_EDGE_TRUST_FORWARDED_HEADERS: settings.trustForwardedHeaders ? '1' : '0',
    ...buildRuntimeEdgePrivateEnv(process.env),
  };
}

function sdkworkApiGatewayStep(settings, {
  workspaceRoot,
  platform,
}) {
  const apiGatewayWorkspaceRoot = path.resolve(workspaceRoot, '..', 'sdkwork-api-cloud-gateway');
  return {
    name: 'sdkwork-api-cloud-gateway',
    command: cargoCommand(platform),
    args: [
      'run',
      '-p',
      'sdkwork-api-cloud-gateway',
      '--bin',
      'sdkwork-api-cloud-gateway',
      '--',
      '--config',
      'configs/sdkwork-api-cloud-gateway.development.toml.example',
    ],
    cwd: apiGatewayWorkspaceRoot,
    env: {
      ...process.env,
      CARGO_TARGET_DIR: sdkworkApiGatewayTargetDir(workspaceRoot),
      SDKWORK_API_CLOUD_GATEWAY_BIND: settings.sdkworkApiGatewayBind,
      SDKWORK_API_CLOUD_GATEWAY_MODE: process.env.SDKWORK_API_CLOUD_GATEWAY_MODE ?? 'split',
    },
    shell: false,
    windowsHide: platform === 'win32',
  };
}

export function buildWorkspaceCommandPlan(settings, {
  workspaceRoot = repositoryRoot,
  platform = process.platform,
} = {}) {
  const portalRelativeDir = 'apps/sdkwork-clawrouter-pc';
  splitBind(settings.portalBind, '--portal-bind');
  if (settings.runtimeMode !== 'client') {
    settings.databaseUrl ??= environmentDatabaseConfig(workspaceRoot).databaseUrl
      ?? defaultPostgresDatabaseUrl();
    settings.modelsCatalogRoot = resolveModelsCatalogRoot(settings, workspaceRoot);
    ensureLocalSqliteDatabaseDirectory(settings, workspaceRoot);
  }
  const portalBootstrap = ensureClawRouterBrowserDevelopmentEnv({
    workspaceRoot,
    portalRuntimeEnv: portalEnv(settings),
    env: process.env,
    dryRun: settings.dryRun === true,
  });
  const portalLaunchEnv = (runtimeSettings) => portalEnv(runtimeSettings, portalBootstrap.mergedEnv);
  const steps = [];

  if (settings.install) {
    steps.push({
      name: 'portal-install',
      command: pnpmCommand(platform),
      args: ['--dir', portalRelativeDir, 'install'],
      cwd: workspaceRoot,
      env: process.env,
      shell: shellForPnpm(platform),
      windowsHide: platform === 'win32',
      blocking: true,
    });
  }

  if (settings.runtimeMode === 'client') {
    const apiGatewayPrebuildStep = sdkworkApiGatewayPrebuildStep(settings, { workspaceRoot, platform });
    if (apiGatewayPrebuildStep) {
      steps.push(apiGatewayPrebuildStep);
    }
    steps.push(
      sdkworkApiGatewayStep(settings, { workspaceRoot, platform }),
      {
        name: 'portal',
        command: pnpmCommand(platform),
        args: ['--dir', portalRelativeDir, 'dev:browser'],
        cwd: workspaceRoot,
        env: portalLaunchEnv(settings),
        shell: shellForPnpm(platform),
        windowsHide: platform === 'win32',
      },
    );

    return {
      nodeExecutable: process.execPath,
      applicationEnvFile: portalBootstrap.profileFilePath,
      steps,
    };
  }

  const prebuildSteps = [
    rustPrebuildStep(settings, { workspaceRoot, platform }),
    sdkworkApiGatewayPrebuildStep(settings, { workspaceRoot, platform }),
  ].filter(Boolean);

  const blockingRuntimeSteps = [
    {
      name: 'installer',
      command: clawRouterDevInstallerBinaryPath(workspaceRoot, platform),
      args: ['ensure'],
      cwd: workspaceRoot,
      env: clawRouterDevCargoEnv(
        workspaceRoot,
        serviceEnv(settings, 'SDKWORK_CLAW_INSTALLER_BIND', '127.0.0.1:0', {
          snowflakeNodeId: DEFAULT_DEV_SNOWFLAKE_NODE_IDS.installer,
        }),
      ),
      shell: false,
      windowsHide: platform === 'win32',
      blocking: true,
    },
    {
      name: 'model-catalog-refresh',
      command: clawRouterDevInstallerBinaryPath(workspaceRoot, platform),
      args: [
        'refresh-catalog',
        '--catalog-root',
        settings.modelsCatalogRoot,
        '--force',
      ],
      cwd: workspaceRoot,
      env: clawRouterDevCargoEnv(
        workspaceRoot,
        serviceEnv(settings, 'SDKWORK_CLAW_INSTALLER_BIND', '127.0.0.1:0', {
          snowflakeNodeId: DEFAULT_DEV_SNOWFLAKE_NODE_IDS.modelCatalogRefresh,
        }),
      ),
      shell: false,
      windowsHide: platform === 'win32',
      blocking: true,
      failureHint:
        'model catalog refresh failed. Run pnpm models:check, verify SDKWORK_MODELS_CATALOG_ROOT, and retry refresh-catalog before starting services.',
    },
  ];
  const distributedRuntimeSteps = settings.runtimeMode === 'distributed'
    ? [
    {
      name: 'gateway',
      command: cargoCommand(platform),
      args: cargoRunPackageArgs('sdkwork-clawrouter-cloud-gateway'),
      cwd: workspaceRoot,
      env: clawRouterDevCargoEnv(
        workspaceRoot,
        serviceEnv(settings, 'SDKWORK_CLAW_GATEWAY_BIND', settings.gatewayBind, {
          snowflakeNodeId: DEFAULT_DEV_SNOWFLAKE_NODE_IDS.gateway,
          startupInstallMode: 'skip',
        }),
      ),
      shell: false,
      windowsHide: platform === 'win32',
    },
    {
      name: 'admin-api',
      command: cargoCommand(platform),
      args: cargoRunPackageArgs('sdkwork-clawrouter-admin-gateway'),
      cwd: workspaceRoot,
      env: clawRouterDevCargoEnv(
        workspaceRoot,
        serviceEnv(settings, 'SDKWORK_CLAW_ADMIN_API_BIND', settings.adminApiBind, {
          snowflakeNodeId: DEFAULT_DEV_SNOWFLAKE_NODE_IDS.adminApi,
          startupInstallMode: 'skip',
        }),
      ),
      shell: false,
      windowsHide: platform === 'win32',
    },
    {
      name: 'app-api',
      command: cargoCommand(platform),
      args: cargoRunPackageArgs(APP_API_GATEWAY_PACKAGE),
      cwd: workspaceRoot,
      env: clawRouterDevCargoEnv(workspaceRoot, {
        ...serviceEnv(settings, 'SDKWORK_CLAW_APP_API_BIND', settings.appApiBind, {
          snowflakeNodeId: DEFAULT_DEV_SNOWFLAKE_NODE_IDS.appApi,
          startupInstallMode: 'skip',
        }),
        SDKWORK_CLAW_APP_RUNTIME_GATEWAY_BASE_URL: settings.gatewayForwardUrl,
      }),
      shell: false,
      windowsHide: platform === 'win32',
    },
    ]
    : [];
  const compositionResolution = loadCompositionResolution(workspaceRoot);
  const resolvedPlatformGatewayMode = String(
    process.env.SDKWORK_API_CLOUD_GATEWAY_MODE
      ?? (settings.runtimeMode === 'all-in-one' ? 'embedded' : 'split'),
  ).trim();
  const platformGatewayEmbedded = resolvedPlatformGatewayMode === 'embedded';
  const needsPlatformGatewayStep = !platformGatewayEmbedded
    && (settings.runtimeMode !== 'all-in-one' || compositionResolution.requiresPlatformGatewayProcess);
  const interactiveRuntimeSteps = [
    ...(needsPlatformGatewayStep
      ? [sdkworkApiGatewayStep(settings, { workspaceRoot, platform })]
      : []),
    {
      name: 'portal',
      command: pnpmCommand(platform),
      args: ['--dir', portalRelativeDir, 'dev:browser'],
      cwd: workspaceRoot,
      env: portalLaunchEnv(settings),
      shell: shellForPnpm(platform),
      windowsHide: platform === 'win32',
    },
    {
      name: 'server',
      command: cargoCommand(platform),
      args: cargoRunPackageArgs(EDGE_GATEWAY_PACKAGE),
      cwd: workspaceRoot,
      env: clawRouterDevCargoEnv(workspaceRoot, edgeServerEnv(settings)),
      shell: false,
      windowsHide: platform === 'win32',
    },
  ];

  steps.push(...prebuildSteps, ...blockingRuntimeSteps, ...distributedRuntimeSteps, ...interactiveRuntimeSteps);

  return {
    nodeExecutable: process.execPath,
    applicationEnvFile: portalBootstrap.profileFilePath,
    steps,
  };
}

export function workspaceBindTargets(settings) {
  const serviceTargets = settings.runtimeMode === 'client'
    ? []
    : settings.runtimeMode === 'distributed'
      ? [
          { name: 'gateway', bind: settings.gatewayBind },
          { name: 'admin-api', bind: settings.adminApiBind },
          { name: 'app-api', bind: settings.appApiBind },
        ]
      : [
          { name: 'server', bind: settings.serverBind },
        ];
  const managedSdkworkApiGatewayTargets = (settings.runtimeMode === 'all-in-one'
    && !loadCompositionResolution(repositoryRoot).requiresPlatformGatewayProcess)
    ? []
    : [{ name: 'sdkwork-api-cloud-gateway', bind: settings.sdkworkApiGatewayBind }];
  return [
    ...serviceTargets,
    ...managedSdkworkApiGatewayTargets,
    { name: 'portal', bind: settings.portalBind },
  ].map((target) => {
    const { host, port } = splitBind(target.bind, `--${target.name}-bind`);
    return {
      ...target,
      host,
      port,
    };
  });
}

export async function canBindWorkspaceTarget(target) {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.listen(
      {
        host: listenHostFromBindHost(target.host),
        port: Number.parseInt(target.port, 10),
        exclusive: true,
      },
      () => {
        server.close(() => resolve(true));
      },
    );
  });
}

export async function findUnavailableWorkspaceBinds(
  settings,
  canBind = canBindWorkspaceTarget,
) {
  const unavailable = [];
  for (const target of workspaceBindTargets(settings)) {
    if (!(await canBind(target))) {
      unavailable.push(target);
    }
  }
  return unavailable;
}

export async function assertWorkspaceBindsAvailable(
  settings,
  canBind = canBindWorkspaceTarget,
) {
  await assertWorkspaceBindTargetsAvailable(workspaceBindTargets(settings), canBind);
}

export async function assertWorkspaceBindTargetsAvailable(
  targets,
  canBind = canBindWorkspaceTarget,
) {
  const unavailable = [];
  for (const target of targets) {
    if (!(await canBind(target))) {
      unavailable.push(target);
    }
  }
  if (unavailable.length === 0) {
    return;
  }

  throw new Error(
    `workspace ports are already in use: ${
      unavailable.map((target) => `${target.name} ${target.bind}`).join(', ')
    }. Stop the stale workspace process or restart with explicit --*-bind ports.`,
  );
}

export function workspaceAccessLines(settings, includeLanAccess = false, interfaces) {
  if (settings.runtimeMode === 'client') {
    return [
      '[start-workspace] Mode: client (sdkwork-api-cloud-gateway)',
      '[start-workspace] Gateway-backed Client Access',
      `[start-workspace]   Direct Portal Dev: ${loopbackUrl(settings.portalBind, '/')}`,
      `[start-workspace]   SDKWork API Gateway: ${sharedFoundationGatewayBaseUrl(settings)}`,
      `[start-workspace]   Gateway API: ${appendPath(sharedFoundationGatewayBaseUrl(settings), GATEWAY_API_PREFIX)}`,
      `[start-workspace]   Backend/Admin API: ${appendPath(sharedFoundationGatewayBaseUrl(settings), BACKEND_API_PREFIX)}`,
      `[start-workspace]   App API: ${appendPath(sharedFoundationGatewayBaseUrl(settings), APP_API_PREFIX)}`,
      `[start-workspace]   Gateway OpenAPI: ${appendPath(sharedFoundationGatewayBaseUrl(settings), '/openapi.json')}`,
      '[start-workspace] Health Checks',
      `[start-workspace]   SDKWork API Gateway Health: ${appendPath(sharedFoundationGatewayBaseUrl(settings), '/healthz')}`,
      `[start-workspace]   SDKWork API Gateway Ready: ${appendPath(sharedFoundationGatewayBaseUrl(settings), '/readyz')}`,
    ];
  }

  const edgeAndPortal = [
    `[start-workspace] Mode: server (${settings.runtimeMode})`,
    '[start-workspace] Edge Server Access',
    `[start-workspace]   Portal: ${loopbackUrl(settings.serverBind, '/')}`,
    `[start-workspace]   Gateway API: ${loopbackUrl(settings.serverBind, GATEWAY_API_PREFIX)}`,
    `[start-workspace]   Backend/Admin API: ${loopbackUrl(settings.serverBind, BACKEND_API_PREFIX)}`,
    `[start-workspace]   App API: ${loopbackUrl(settings.serverBind, APP_API_PREFIX)}`,
    `[start-workspace]   Gateway OpenAPI: ${loopbackUrl(settings.serverBind, '/openapi.json')}`,
    `[start-workspace]   Admin API OpenAPI: ${loopbackUrl(settings.serverBind, `${BACKEND_API_PREFIX}/openapi.json`)}`,
    `[start-workspace]   App API OpenAPI: ${loopbackUrl(settings.serverBind, `${APP_API_PREFIX}/openapi.json`)}`,
    '[start-workspace] Direct Service Access',
    `[start-workspace]   Direct Portal Dev: ${loopbackUrl(settings.portalBind, '/')}`,
    `[start-workspace]   Direct Portal Gateway API Proxy: ${loopbackUrl(settings.portalBind, GATEWAY_API_PREFIX)}`,
    `[start-workspace]   Direct Portal Backend/Admin API Proxy: ${loopbackUrl(settings.portalBind, BACKEND_API_PREFIX)}`,
    `[start-workspace]   Direct Portal App API Proxy: ${loopbackUrl(settings.portalBind, APP_API_PREFIX)}`,
    `[start-workspace]   Direct Portal Gateway OpenAPI Proxy: ${loopbackUrl(settings.portalBind, '/openapi.json')}`,
    `[start-workspace]   Direct Portal Admin API OpenAPI Proxy: ${loopbackUrl(settings.portalBind, `${BACKEND_API_PREFIX}/openapi.json`)}`,
    `[start-workspace]   Direct Portal App API OpenAPI Proxy: ${loopbackUrl(settings.portalBind, `${APP_API_PREFIX}/openapi.json`)}`,
  ];
  if (includeLanAccess) {
    const lanLines = lanAccessLines(settings.serverBind, '/', interfaces);
    edgeAndPortal.splice(2, 0,
      '[start-workspace] LAN Access (same Wi-Fi/LAN)',
      ...(lanLines.length > 0
        ? lanLines
        : ['[start-workspace]   LAN: no active LAN IPv4 address detected']),
    );
  }
  const edgeHealth = [
    '[start-workspace] Health Checks',
    `[start-workspace]   Edge Server Health: ${loopbackUrl(settings.serverBind, '/healthz')}`,
    `[start-workspace]   Edge Server Ready: ${loopbackUrl(settings.serverBind, '/readyz')}`,
  ];
  if (settings.runtimeMode !== 'distributed') {
    return [...edgeAndPortal, ...edgeHealth];
  }
  return [
    ...edgeAndPortal,
    '[start-workspace] Internal Validation Topology',
    '[start-workspace] OpenAPI Schemas',
    `[start-workspace]   Gateway OpenAPI: ${loopbackUrl(settings.gatewayBind, '/openapi.json')}`,
    `[start-workspace]   Admin API OpenAPI: ${loopbackUrl(settings.adminApiBind, `${BACKEND_API_PREFIX}/openapi.json`)}`,
    `[start-workspace]   App API OpenAPI: ${loopbackUrl(settings.appApiBind, `${APP_API_PREFIX}/openapi.json`)}`,
    '[start-workspace] API Access Paths',
    `[start-workspace]   OpenAI-compatible Gateway API: ${loopbackUrl(settings.gatewayBind, GATEWAY_API_PREFIX)}`,
    `[start-workspace]   Backend/Admin API: ${loopbackUrl(settings.adminApiBind, BACKEND_API_PREFIX)}`,
    `[start-workspace]   App API: ${loopbackUrl(settings.appApiBind, APP_API_PREFIX)}`,
    ...edgeHealth,
    `[start-workspace]   Gateway Health: ${loopbackUrl(settings.gatewayBind, '/healthz')}`,
    `[start-workspace]   Gateway Ready: ${loopbackUrl(settings.gatewayBind, '/readyz')}`,
    `[start-workspace]   Admin API Health: ${loopbackUrl(settings.adminApiBind, '/healthz')}`,
    `[start-workspace]   Admin API Ready: ${loopbackUrl(settings.adminApiBind, '/readyz')}`,
    `[start-workspace]   App API Health: ${loopbackUrl(settings.appApiBind, '/healthz')}`,
    `[start-workspace]   App API Ready: ${loopbackUrl(settings.appApiBind, '/readyz')}`,
  ];
}

export function workspaceHelpText() {
  return `Usage: node scripts/dev/start-workspace.mjs [options]

Starts the all-in-one Rust edge runtime with an embedded SDKWork API Gateway plus the Claw Router portal dev server.
Use --client-only to start only the external sdkwork-api-cloud-gateway plus the portal dev server.

Options:
  --deployment-profile <standalone|cloud>
                         Deployment profile (default standalone)
  --service-layout <unified-process|split-services>
                         Topology service layout (default unified-process)
  --distributed          Alias for --service-layout split-services
  --database-url <url>    Optional shared SDKWORK_CLAW_DATABASE_URL override (default ${defaultPostgresDatabaseUrl()})
  --gateway-bind <bind>   SDKWORK_CLAW_GATEWAY_BIND override (default ${DEFAULT_GATEWAY_BIND})
  --admin-api-bind <bind> SDKWORK_CLAW_ADMIN_API_BIND override (default ${DEFAULT_ADMIN_API_BIND})
  --app-api-bind <bind>   SDKWORK_CLAW_APP_API_BIND override (default ${DEFAULT_APP_API_BIND})
  --server-bind <bind>    Rust edge server HOST:PORT override (default ${DEFAULT_SERVER_BIND})
  --portal-bind <bind>    Direct portal dev HOST:PORT override (default ${DEFAULT_PORTAL_BIND})
  --sdkwork-api-cloud-gateway-bind <bind>
                         Managed sdkwork-api-cloud-gateway HOST:PORT override (default ${DEFAULT_SDKWORK_API_CLOUD_GATEWAY_BIND})
  --gateway-forward-url <url>
                         Rust edge server target for /v1 and /openapi.json
  --backend-api-forward-url <url>
                         Rust edge server target for /backend/v3/api
  --app-api-forward-url <url>
                         Rust edge server target for /app/v3/api
  --client-only          Start only sdkwork-api-cloud-gateway plus the portal dev server
  --external-scheme <scheme>
                         External request scheme reported upstream: http or https (default ${DEFAULT_EXTERNAL_SCHEME})
  --trust-forwarded-headers
                         Trust inbound x-forwarded-host/proto/for from a controlled upstream proxy
  --install               Run pnpm install for the portal before starting
  --dry-run               Print the command plan without running it
  --plan-format <format>  text or json for dry-run output
  -h, --help              Show this help
`;
}

function formatCommand(step) {
  return [step.command, ...step.args].join(' ');
}

export function renderWorkspaceDryRun(settings, plan) {
  const isClientMode = settings.runtimeMode === 'client';
  const portalRuntimeEnv = withSharedFoundationPortalRuntimeEnv(process.env, settings, {
    productSurfaceMode: isClientMode ? 'shared-gateway' : 'same-origin',
  });
  if (settings.planFormat === 'json') {
    return [JSON.stringify({
      mode: isClientMode ? 'client' : 'server',
      gatewayBind: settings.gatewayBind,
      adminApiBind: settings.adminApiBind,
      appApiBind: settings.appApiBind,
      serverBind: settings.serverBind,
      portalBind: settings.portalBind,
      sdkworkApiGatewayBind: settings.sdkworkApiGatewayBind,
      sdkworkApiGatewayBaseUrl: sharedFoundationGatewayBaseUrl(settings),
      runtimeMode: settings.runtimeMode,
      modelsCatalogRoot: settings.modelsCatalogRoot,
      externalScheme: settings.externalScheme,
      trustForwardedHeaders: settings.trustForwardedHeaders,
      gatewayForwardUrl: settings.gatewayForwardUrl,
      backendApiForwardUrl: settings.backendApiForwardUrl,
      appApiForwardUrl: settings.appApiForwardUrl,
      steps: plan.steps.map((step) => ({
        name: step.name,
        command: step.command,
        args: step.args,
        cwd: step.cwd,
        blocking: step.blocking === true,
        ...(step.failureHint ? { failureHint: step.failureHint } : {}),
      })),
    }, null, 2)];
  }

  if (isClientMode) {
    const portalViteRuntimeEnv = withBrowserDevelopmentViteRuntimeEnv(process.env, settings, {
      productSurfaceMode: 'shared-gateway',
    });
    return [
      '[start-workspace] client launch settings',
      '  SDKWORK_CLAW_RUNTIME_MODE=client',
      `  SDKWORK_CLAW_PORTAL_BIND=${settings.portalBind}`,
      `  SDKWORK_API_CLOUD_GATEWAY_BIND=${settings.sdkworkApiGatewayBind}`,
      `  VITE_CLAWROUTER_OPEN_API_BASE_URL=${portalViteRuntimeEnv.VITE_CLAWROUTER_OPEN_API_BASE_URL ?? '(not configured)'}`,
      `  VITE_CLAWROUTER_BACKEND_API_BASE_URL=${portalViteRuntimeEnv.VITE_CLAWROUTER_BACKEND_API_BASE_URL ?? '(not configured)'}`,
      `  VITE_CLAWROUTER_APP_API_BASE_URL=${portalViteRuntimeEnv.VITE_CLAWROUTER_APP_API_BASE_URL ?? '(not configured)'}`,
      `  ${CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi}=${settings.gatewayForwardUrl}`,
      `  ${CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.backendApi}=${settings.backendApiForwardUrl}`,
      `  ${CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.appApi}=${settings.appApiForwardUrl}`,
      `  VITE_TOOL_API_ENABLED=${portalViteRuntimeEnv.VITE_TOOL_API_ENABLED ?? 'false'}`,
      ...workspaceAccessLines(settings),
      ...plan.steps.flatMap((step) => [
        `[start-workspace] ${step.name}: ${formatCommand(step)}`,
        ...(settings.dryRun && step.failureHint
          ? [`[start-workspace] ${step.name} failure hint: ${step.failureHint}`]
          : []),
      ]),
    ];
  }

  return [
    '[start-workspace] edge launch settings',
    `  SDKWORK_CLAW_RUNTIME_MODE=${settings.runtimeMode}`,
    `  SDKWORK_CLAW_DATABASE_URL=${settings.databaseUrl ?? defaultPostgresDatabaseUrl()}`,
    `  SDKWORK_MODELS_CATALOG_ROOT=${settings.modelsCatalogRoot}`,
    `  SDKWORK_CLAW_GATEWAY_BIND=${settings.gatewayBind}`,
    `  SDKWORK_CLAW_ADMIN_API_BIND=${settings.adminApiBind}`,
    `  SDKWORK_CLAW_APP_API_BIND=${settings.appApiBind}`,
    `  SDKWORK_CLAW_SERVER_BIND=${settings.serverBind}`,
    `  SDKWORK_CLAW_PORTAL_BIND=${settings.portalBind}`,
    `  SDKWORK_API_CLOUD_GATEWAY_BIND=${settings.sdkworkApiGatewayBind}`,
    `  PORTAL_PUBLIC_SDK_BASE_URL=${portalRuntimeEnv.PORTAL_PUBLIC_SDK_BASE_URL ?? '(not configured)'}`,
    `  PORTAL_PUBLIC_API_BASE_URL=${portalPublicRuntimeEnvLineValue(portalRuntimeEnv, 'PORTAL_PUBLIC_API_BASE_URL')}`,
    `  PORTAL_PUBLIC_OPEN_API_BASE_URL=${portalPublicRuntimeEnvLineValue(portalRuntimeEnv, 'PORTAL_PUBLIC_OPEN_API_BASE_URL')}`,
    `  PORTAL_PUBLIC_BACKEND_API_BASE_URL=${portalPublicRuntimeEnvLineValue(portalRuntimeEnv, 'PORTAL_PUBLIC_BACKEND_API_BASE_URL')}`,
    `  PORTAL_PUBLIC_APP_API_BASE_URL=${portalPublicRuntimeEnvLineValue(portalRuntimeEnv, 'PORTAL_PUBLIC_APP_API_BASE_URL')}`,
    `  PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL=${portalRuntimeEnv.PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL ?? '(not configured)'}`,
    `  ${CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi}=${settings.gatewayForwardUrl}`,
    `  ${CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.backendApi}=${settings.backendApiForwardUrl}`,
    `  ${CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.appApi}=${settings.appApiForwardUrl}`,
    `  PORTAL_PUBLIC_TOOL_API_ENABLED=${portalRuntimeEnv.PORTAL_PUBLIC_TOOL_API_ENABLED}`,
    `  ${CLAW_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitRequests}=${resolveEdgeEnvValue(process.env, CLAW_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitRequests, '120')}`,
    `  ${CLAW_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitWindowSeconds}=${resolveEdgeEnvValue(process.env, CLAW_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitWindowSeconds, '60')}`,
    `  ${CLAW_ROUTER_EDGE_ENV_KEYS.toolApiSdkArchiveRoot}=${resolveEdgeEnvValue(process.env, CLAW_ROUTER_EDGE_ENV_KEYS.toolApiSdkArchiveRoot) ?? '(not configured)'}`,
    `  SDKWORK_CLAW_ALL_IN_ONE_RUNTIME=${settings.runtimeMode === 'all-in-one' ? '1' : '0'}`,
    `  SDKWORK_CLAW_EDGE_GATEWAY_BASE_URL=${settings.gatewayForwardUrl}`,
    `  SDKWORK_CLAW_EDGE_BACKEND_API_BASE_URL=${settings.backendApiForwardUrl}`,
    `  SDKWORK_CLAW_EDGE_APP_API_BASE_URL=${settings.appApiForwardUrl}`,
    `  SDKWORK_CLAW_EDGE_PORTAL_BASE_URL=${forwardingOriginFromBind(settings.portalBind, '--portal-bind')}`,
    `  SDKWORK_CLAW_EDGE_EXTERNAL_SCHEME=${settings.externalScheme}`,
    `  SDKWORK_CLAW_EDGE_TRUST_FORWARDED_HEADERS=${settings.trustForwardedHeaders ? '1' : '0'}`,
    ...workspaceAccessLines(settings),
    ...plan.steps.flatMap((step) => [
      `[start-workspace] ${step.name}: ${formatCommand(step)}`,
      ...(settings.dryRun && step.failureHint
        ? [`[start-workspace] ${step.name} failure hint: ${step.failureHint}`]
        : []),
    ]),
  ];
}

function spawnStep(step, children) {
  console.log(`[start-workspace] ${step.name}: ${formatCommand(step)}`);
  const child = spawn(step.command, step.args, {
    cwd: step.cwd,
    env: step.env,
    stdio: 'inherit',
    shell: step.shell ?? false,
    windowsHide: step.windowsHide ?? process.platform === 'win32',
  });

  children.push(child);
  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[start-workspace] ${step.name} exited with signal ${signal}`);
      return;
    }
    console.log(`[start-workspace] ${step.name} exited with code ${code ?? 0}`);
  });

  return child;
}

async function runBlockingStep(step) {
  console.log(`[start-workspace] ${step.name}: ${formatCommand(step)}`);
  await new Promise((resolve, reject) => {
    const child = spawn(step.command, step.args, {
      cwd: step.cwd,
      env: step.env,
      stdio: 'inherit',
      shell: step.shell ?? false,
      windowsHide: step.windowsHide ?? process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${step.name} exited with signal ${signal}`));
        return;
      }
      if ((code ?? 1) !== 0) {
        reject(new Error(`${step.name} exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

function childHasExited(child) {
  return child.exitCode !== null || child.signalCode !== null;
}

export async function terminateChildProcess(child, {
  platform = process.platform,
  spawnProcess = spawn,
} = {}) {
  if (!child || childHasExited(child)) {
    return;
  }

  if (platform === 'win32' && child.pid) {
    await new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      const fallbackKill = () => {
        try {
          child.kill('SIGTERM');
        } catch {
          // Process may already be gone.
        }
      };

      let killer;
      try {
        killer = spawnProcess('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
          stdio: 'ignore',
          windowsHide: true,
        });
      } catch {
        fallbackKill();
        finish();
        return;
      }

      killer.once('exit', finish);
      killer.once('error', () => {
        fallbackKill();
        finish();
      });
    });
    return;
  }

  try {
    child.kill('SIGTERM');
  } catch {
    // Process may already be gone.
  }
}

async function stopChildren(children) {
  await Promise.all(children.map((child) => terminateChildProcess(child)));
}

async function main() {
  let settings;
  try {
    settings = parseWorkspaceArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[start-workspace] ${error.message}`);
    console.error('');
    console.error(workspaceHelpText());
    process.exit(1);
  }

  if (settings.help) {
    console.log(workspaceHelpText());
    process.exit(0);
  }

  const plan = buildWorkspaceCommandPlan(settings);
  for (const line of renderWorkspaceDryRun(settings, plan)) {
    console.log(line);
  }

  if (settings.dryRun) {
    process.exit(0);
  }

  try {
    await assertWorkspaceBindsAvailable(settings);
  } catch (error) {
    console.error(`[start-workspace] ${error.message}`);
    process.exit(1);
  }

  const children = [];
  let shuttingDown = false;
  const shutdown = (reason, code = 0) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`[start-workspace] stopping workspace: ${reason}`);
    void stopChildren(children).finally(() => process.exit(code));
  };

  process.on('SIGINT', () => shutdown('SIGINT', 130));
  process.on('SIGTERM', () => shutdown('SIGTERM', 143));

  const blockingSteps = plan.steps.filter((step) => step.blocking === true);
  const serviceSteps = plan.steps.filter((step) => step.blocking !== true);
  const portalSteps = serviceSteps.filter((step) => step.name === 'portal');
  const backendServiceSteps = serviceSteps.filter((step) => step.name !== 'portal');

  for (const step of blockingSteps) {
    try {
      await runBlockingStep(step);
    } catch (error) {
      console.error(`[start-workspace] ${error.message}`);
      if (step.failureHint) {
        console.error(`[start-workspace] ${step.failureHint}`);
      }
      process.exit(1);
    }
  }

  if (backendServiceSteps.length > 0) {
    const backendStepNames = new Set(backendServiceSteps.map((step) => step.name));
    try {
      await assertWorkspaceBindTargetsAvailable(
        workspaceBindTargets(settings).filter((target) => backendStepNames.has(target.name)),
      );
    } catch (error) {
      console.error(`[start-workspace] ${error.message}`);
      process.exit(1);
    }
  }

  for (const step of backendServiceSteps) {
    const child = spawnStep(step, children);
    child.on('error', (error) => {
      console.error(`[start-workspace] ${step.name} failed: ${error.message}`);
      shutdown(`${step.name} error`, 1);
    });
    child.on('exit', (code, signal) => {
      if (shuttingDown) {
        return;
      }
      if (signal || (code ?? 0) !== 0) {
        shutdown(`${step.name} exit`, code ?? 1);
      }
    });
  }

  if (portalSteps.length > 0) {
    try {
      await waitForWorkspaceHealthSurfaces(settings);
    } catch (error) {
      console.error(`[start-workspace] ${error.message}`);
      shutdown('health check failed', 1);
      return;
    }

    try {
      await assertWorkspaceBindTargetsAvailable(
        workspaceBindTargets(settings).filter((target) => target.name === 'portal'),
      );
    } catch (error) {
      console.error(`[start-workspace] ${error.message}`);
      shutdown('portal port preflight failed', 1);
      return;
    }
  }

  for (const step of portalSteps) {
    const child = spawnStep(step, children);
    child.on('error', (error) => {
      console.error(`[start-workspace] ${step.name} failed: ${error.message}`);
      shutdown(`${step.name} error`, 1);
    });
    child.on('exit', (code, signal) => {
      if (shuttingDown) {
        return;
      }
      if (signal || (code ?? 0) !== 0) {
        shutdown(`${step.name} exit`, code ?? 1);
      }
    });
  }

  if (portalSteps.length > 0) {
    try {
      await waitForPortalReady(settings);
      for (const line of successfulStartupAccessLines(settings)) {
        console.log(line);
      }
    } catch (error) {
      console.error(`[start-workspace] ${error.message}`);
      shutdown('portal readiness check failed', 1);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(`[start-workspace] ${error.message}`);
    process.exit(1);
  });
}
