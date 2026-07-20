import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildProfileId,
  createTopologyRuntime,
  isTcpPortReachable,
  loadTopologySpec,
  normalizeText,
  waitForHttpHealthy,
} from '@sdkwork/app-topology';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, '..', '..');
export const SPEC_PATH = path.join(REPO_ROOT, 'specs/topology.spec.json');
export const IAM_REPO_ROOT = path.resolve(REPO_ROOT, '..', 'sdkwork-iam');

export const IAM_APPLICATION_BOOTSTRAP_ENV = {
  SDKWORK_APP_ROOT: REPO_ROOT,
  SDKWORK_CLAW_ROUTER_APP_ROOT: REPO_ROOT,
  SDKWORK_IAM_APP_ROOT: IAM_REPO_ROOT,
  SDKWORK_ACCOUNT_APP_ROOT: path.resolve(REPO_ROOT, '..', 'sdkwork-account'),
  SDKWORK_PAYMENT_APP_ROOT: path.resolve(REPO_ROOT, '..', 'sdkwork-payment'),
  SDKWORK_PROMOTION_APP_ROOT: path.resolve(REPO_ROOT, '..', 'sdkwork-promotion'),
  SDKWORK_MEMBERSHIP_APP_ROOT: path.resolve(REPO_ROOT, '..', 'sdkwork-membership'),
  SDKWORK_ORDER_APP_ROOT: path.resolve(REPO_ROOT, '..', 'sdkwork-order'),
  SDKWORK_SHOP_APP_ROOT: path.resolve(REPO_ROOT, '..', 'sdkwork-shop'),
  SDKWORK_CATALOG_APP_ROOT: path.resolve(REPO_ROOT, '..', 'sdkwork-catalog'),
  SDKWORK_INVOICE_APP_ROOT: path.resolve(REPO_ROOT, '..', 'sdkwork-invoice'),
};

const spec = loadTopologySpec(SPEC_PATH);
const runtime = createTopologyRuntime(spec, REPO_ROOT);

export const DEFAULT_DEV_PROFILE_ID = runtime.defaults.developmentProfileId;
export const DEFAULT_PRODUCTION_PROFILE_ID = runtime.defaults.productionProfileId;
export const GATEWAY_PACKAGE_TARGETS = runtime.listPackageTargets();

export function listGatewayPackageTargets(profile) {
  return runtime.listPackageTargetsByProfile(profile);
}

export function findGatewayPackageTarget(targetId) {
  return runtime.findPackageTarget(targetId);
}

const GATEWAY_API_PREFIX = '/v1';
const BACKEND_API_PREFIX = '/backend/v3/api';
const APP_API_PREFIX = '/app/v3/api';
const HEALTH_PATH = '/healthz';
const HEALTH_TIMEOUT_MS = 2000;
const HEALTH_POLL_MS = 500;
const MAX_HEALTH_ATTEMPTS = 60;

function readTrimmedValue(value) {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue || undefined;
}

function appendPath(origin, pathSuffix) {
  return `${String(origin).replace(/\/+$/u, '')}${pathSuffix}`;
}

export function resolveDevProfileId(deploymentProfile) {
  const normalizedDeploymentProfile = runtime.assertDeploymentProfile(deploymentProfile);
  return runtime.assertProfileId(buildProfileId(normalizedDeploymentProfile, 'development'));
}

export function bridgeLegacyWorkspaceEnv(profileEnv = {}, {
  runtimeMode = 'all-in-one',
} = {}) {
  const applicationHttpUrl =
    readTrimmedValue(profileEnv.SDKWORK_CLAW_ROUTER_APPLICATION_PUBLIC_HTTP_URL)
    ?? readTrimmedValue(profileEnv.VITE_SDKWORK_CLAW_ROUTER_APPLICATION_PUBLIC_HTTP_URL);
  const backendHttpUrl =
    readTrimmedValue(profileEnv.SDKWORK_CLAW_ROUTER_APPLICATION_BACKEND_HTTP_URL)
    ?? readTrimmedValue(profileEnv.VITE_SDKWORK_CLAW_ROUTER_APPLICATION_BACKEND_HTTP_URL);
  const openHttpUrl =
    readTrimmedValue(profileEnv.SDKWORK_CLAW_ROUTER_APPLICATION_OPEN_HTTP_URL)
    ?? readTrimmedValue(profileEnv.VITE_SDKWORK_CLAW_ROUTER_APPLICATION_OPEN_HTTP_URL);
  const platformHttpUrl =
    readTrimmedValue(profileEnv.SDKWORK_CLAW_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL)
    ?? readTrimmedValue(profileEnv.VITE_SDKWORK_CLAW_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL);
  const bridged = {};
  const productBaseUrl = runtimeMode === 'client' ? platformHttpUrl : applicationHttpUrl;

  if (runtimeMode === 'all-in-one') {
    bridged.PORTAL_PUBLIC_API_BASE_URL = GATEWAY_API_PREFIX;
    bridged.PORTAL_PUBLIC_OPEN_API_BASE_URL = GATEWAY_API_PREFIX;
    bridged.PORTAL_PUBLIC_APP_API_BASE_URL = APP_API_PREFIX;
    bridged.PORTAL_PUBLIC_BACKEND_API_BASE_URL = BACKEND_API_PREFIX;
    return bridged;
  }

  if (productBaseUrl) {
    bridged.VITE_CLAWROUTER_APP_API_BASE_URL = appendPath(productBaseUrl, APP_API_PREFIX);
    bridged.PORTAL_PUBLIC_APP_API_BASE_URL =
      runtimeMode === 'client' ? undefined : APP_API_PREFIX;
  }

  if (backendHttpUrl || productBaseUrl) {
    const backendBase = runtimeMode === 'client' ? productBaseUrl : backendHttpUrl;
    bridged.VITE_CLAWROUTER_BACKEND_API_BASE_URL = appendPath(backendBase, BACKEND_API_PREFIX);
    bridged.PORTAL_PUBLIC_BACKEND_API_BASE_URL =
      runtimeMode === 'client' ? undefined : BACKEND_API_PREFIX;
    bridged.VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL = appendPath(backendBase, BACKEND_API_PREFIX);
  }

  if (openHttpUrl || productBaseUrl) {
    const openBase = runtimeMode === 'client' ? productBaseUrl : openHttpUrl;
    bridged.VITE_CLAWROUTER_OPEN_API_BASE_URL = appendPath(openBase, GATEWAY_API_PREFIX);
    bridged.PORTAL_PUBLIC_API_BASE_URL = runtimeMode === 'client' ? undefined : GATEWAY_API_PREFIX;
    bridged.PORTAL_PUBLIC_OPEN_API_BASE_URL = runtimeMode === 'client' ? undefined : GATEWAY_API_PREFIX;
  }

  if (platformHttpUrl) {
    bridged.VITE_SDKWORK_APPBASE_APP_API_BASE_URL =
      profileEnv.VITE_SDKWORK_APPBASE_APP_API_BASE_URL
      ?? appendPath(platformHttpUrl, APP_API_PREFIX);
    bridged.VITE_SDKWORK_IAM_APP_API_BASE_URL =
      profileEnv.VITE_SDKWORK_IAM_APP_API_BASE_URL ?? platformHttpUrl;
    bridged.VITE_SDKWORK_DRIVE_APP_API_BASE_URL =
      profileEnv.VITE_SDKWORK_DRIVE_APP_API_BASE_URL
      ?? appendPath(platformHttpUrl, APP_API_PREFIX);
    bridged.VITE_SDKWORK_GENERATIONS_APP_API_BASE_URL =
      profileEnv.VITE_SDKWORK_GENERATIONS_APP_API_BASE_URL
      ?? appendPath(platformHttpUrl, APP_API_PREFIX);
    bridged.VITE_SDKWORK_GENERATIONS_PC_APP_API_BASE_URL =
      profileEnv.VITE_SDKWORK_GENERATIONS_PC_APP_API_BASE_URL
      ?? appendPath(platformHttpUrl, APP_API_PREFIX);
  }

  return bridged;
}

export function applyTopologyProfileToWorkspaceSettings(settings, profileEnv = {}) {
  const openBind = readTrimmedValue(profileEnv.SDKWORK_CLAW_ROUTER_APPLICATION_OPEN_HTTP_BIND);
  const backendBind = readTrimmedValue(profileEnv.SDKWORK_CLAW_ROUTER_APPLICATION_BACKEND_HTTP_BIND);
  const publicBind = readTrimmedValue(profileEnv.SDKWORK_CLAW_ROUTER_APPLICATION_PUBLIC_INGRESS_BIND);
  const appApiBind = readTrimmedValue(profileEnv.SDKWORK_CLAW_ROUTER_INTERNAL_APP_API_BIND);
  const portalBind = readTrimmedValue(profileEnv.SDKWORK_CLAW_ROUTER_INTERNAL_PORTAL_RENDERER_BIND);
  const platformBind = readTrimmedValue(profileEnv.SDKWORK_API_CLOUD_GATEWAY_BIND);

  if (openBind && !settings.gatewayBindExplicit) {
    settings.gatewayBind = openBind;
  }
  if (backendBind && !settings.adminApiBindExplicit) {
    settings.adminApiBind = backendBind;
  }
  if (appApiBind && !settings.appApiBindExplicit) {
    settings.appApiBind = appApiBind;
  }
  if (publicBind && !settings.serverBindExplicit) {
    settings.serverBind = publicBind;
  }
  if (portalBind && !settings.portalBindExplicit) {
    settings.portalBind = portalBind;
  }
  if (platformBind && !settings.sdkworkApiGatewayBindExplicit) {
    settings.sdkworkApiGatewayBind = platformBind;
  }

  settings.profileId = readTrimmedValue(profileEnv.SDKWORK_CLAW_ROUTER_PROFILE_ID);
  settings.deploymentProfile = readTrimmedValue(
    profileEnv.SDKWORK_CLAW_ROUTER_DEPLOYMENT_PROFILE,
  );
  return settings;
}

export function loopbackHealthUrlFromBind(bind) {
  const normalized = normalizeText(bind);
  if (!normalized) {
    return undefined;
  }
  const separator = normalized.lastIndexOf(':');
  if (separator <= 0) {
    return undefined;
  }
  const host = normalized.slice(0, separator);
  const port = normalized.slice(separator + 1);
  const loopbackHost = host === '0.0.0.0' || host === '[::]' || host === '::'
    ? '127.0.0.1'
    : host;
  return `http://${loopbackHost}:${port}${HEALTH_PATH}`;
}

export function resolveWorkspaceHealthCheckUrls(settings) {
  if (settings.runtimeMode === 'client') {
    return [
      loopbackHealthUrlFromBind(settings.sdkworkApiGatewayBind),
    ].filter(Boolean);
  }

  if (settings.runtimeMode === 'all-in-one') {
    return [
      loopbackHealthUrlFromBind(settings.serverBind),
    ].filter(Boolean);
  }

  if (settings.runtimeMode === 'distributed') {
    const urls = [
      loopbackHealthUrlFromBind(settings.gatewayBind),
      loopbackHealthUrlFromBind(settings.adminApiBind),
      loopbackHealthUrlFromBind(settings.appApiBind),
    ].filter(Boolean);
    if (settings.runtimeMode !== 'all-in-one') {
      const platformHealth = loopbackHealthUrlFromBind(settings.sdkworkApiGatewayBind);
      if (platformHealth && !urls.includes(platformHealth)) {
        urls.push(platformHealth);
      }
    }
    return urls;
  }

  return [];
}

export async function waitForWorkspaceHealthSurfaces(settings, {
  waitFn = waitForHttpHealthy,
  timeoutMs = HEALTH_TIMEOUT_MS,
  pollMs = HEALTH_POLL_MS,
  maxAttempts = MAX_HEALTH_ATTEMPTS,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  const urls = resolveWorkspaceHealthCheckUrls(settings);
  for (const healthUrl of urls) {
    let ready = false;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      ready = await waitFn(healthUrl, timeoutMs);
      if (ready) {
        console.log(`[start-workspace] healthy ${healthUrl}`);
        break;
      }
      await sleep(pollMs);
    }
    if (!ready) {
      throw new Error(`timed out waiting for health at ${healthUrl}`);
    }
  }
}

export function bridgeTopologyBindEnvToLegacyRustEnv(profileEnv = {}, settings = {}) {
  const bridged = {};
  const serverBind = settings.serverBind
    ?? readTrimmedValue(profileEnv.SDKWORK_CLAW_ROUTER_APPLICATION_PUBLIC_INGRESS_BIND);
  const gatewayBind = settings.gatewayBind
    ?? readTrimmedValue(profileEnv.SDKWORK_CLAW_ROUTER_APPLICATION_OPEN_HTTP_BIND);
  const adminBind = settings.adminApiBind
    ?? readTrimmedValue(profileEnv.SDKWORK_CLAW_ROUTER_APPLICATION_BACKEND_HTTP_BIND);
  const appApiBind = settings.appApiBind
    ?? readTrimmedValue(profileEnv.SDKWORK_CLAW_ROUTER_INTERNAL_APP_API_BIND);
  const portalBind = settings.portalBind
    ?? readTrimmedValue(profileEnv.SDKWORK_CLAW_ROUTER_INTERNAL_PORTAL_RENDERER_BIND);

  if (serverBind) {
    bridged.SDKWORK_CLAW_SERVER_BIND = serverBind;
  }
  if (gatewayBind) {
    bridged.SDKWORK_CLAW_GATEWAY_BIND = gatewayBind;
  }
  if (adminBind) {
    bridged.SDKWORK_CLAW_ADMIN_API_BIND = adminBind;
  }
  if (appApiBind) {
    bridged.SDKWORK_CLAW_APP_API_BIND = appApiBind;
  }
  if (portalBind) {
    bridged.SDKWORK_CLAW_PORTAL_BIND = portalBind;
  }
  return bridged;
}

export function loadTopologyProfileForWorkspace({
  deploymentProfile = 'standalone',
  env = process.env,
  includeIamDatabase = false,
} = {}) {
  const profileId = resolveDevProfileId(deploymentProfile);
  const profileEnv = loadProfile(profileId);
  const layers = [
    env,
    profileEnv,
    ...(includeIamDatabase ? [resolveIamDevEnv(env)] : []),
    IAM_APPLICATION_BOOTSTRAP_ENV,
  ];
  const mergedEnv = runtime.applyProfileEnv(profileId, layers);
  return {
    profileId,
    profileEnv,
    env: mergedEnv,
  };
}

export const loadProfile = runtime.loadProfile;
export const applyProfileEnv = runtime.applyProfileEnv;
export const mergeRuntimeEnv = runtime.mergeRuntimeEnv;
export const loadEnvFile = runtime.loadEnvFile;
export const resolveSurfaceHttpUrl = runtime.resolveSurfaceHttpUrl.bind(runtime);
export const resolveSurfaceBind = runtime.resolveSurfaceBind.bind(runtime);
export const shouldAutostartGateway = runtime.shouldAutostartGateway;
export const resolveGatewayBind = runtime.resolveGatewayBind;
export const resolveGatewayBaseUrl = runtime.resolveGatewayBaseUrl;
export const resolveCloudGatewayConfigPath = runtime.resolveCloudGatewayConfigPath;
export const resolveIamDevEnv = runtime.resolveIamDevEnv;
export const listOrchestrationProcesses = runtime.listOrchestrationProcesses;
export const listHealthSurfaces = runtime.listHealthSurfaces;

export { buildProfileId, normalizeText, isTcpPortReachable, waitForHttpHealthy, spec, runtime };
