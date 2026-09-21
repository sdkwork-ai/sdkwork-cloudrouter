/**
 * Cloud Router browser env naming contract aligned with ../sdkwork-specs/ENVIRONMENT_SPEC.md.
 *
 * Development profile (.env.development):
 *   - SDKWORK_CLOUDROUTER_ROUTER_* application lifecycle metadata
 *   - SDKWORK_ACCESS_TOKEN blank tracked placeholder; live value is in the
 *     ignored .env.development.bootstrap.local overlay
 *   - SDKWORK_CLOUDROUTER_BROWSER_DEV_PROXY_* private Vite proxy origins
 *   - VITE_* browser-visible SDK/runtime values
 *
 * Release profile (.env.release):
 *   - PORTAL_PUBLIC_* server inputs for /runtime-env.js (never in .env.development)
 *   - SDKWORK_CLOUDROUTER_EDGE_* / SDKWORK_CLOUDROUTER_TOOL_API_* private edge-server settings
 */

import {
  CLOUD_ROUTER_BROWSER_FORBIDDEN_PRIVATE_EDGE_PREFIXES,
} from './cloud-router-edge-env-contract.mjs';

import {
  assertBrowserDevRuntimeEnvDocument as assertBrowserDevRuntimeEnvDocumentCanonical,
  authorSameOriginSdkBaseUrls,
  buildBrowserDevRuntimeEnvDocument as buildBrowserDevRuntimeEnvDocumentCanonical,
  isLoopbackAbsoluteUrl as isLoopbackAbsoluteUrlCanonical,
} from '../../../sdkwork-specs/tools/browser-runtime-env.mjs';

import {
  primaryOriginFromEnvValue,
  readLocalPlatformApiGatewayHttpUrl,
  resolveBaseUrl as resolveAppBaseUrlCanonical,
  selectBaseUrlForPageHost as selectBaseUrlForPageHostCanonical,
  splitBaseUrls as splitBaseUrlsCanonical,
} from '../../../sdkwork-specs/tools/app-base-url.mjs';

/** Multi-domain splitting (re-exported from the canonical matrix resolver). */
export const splitBaseUrls = splitBaseUrlsCanonical;

/**
 * Auto-adapting multi-domain page-host selection (re-exported from the
 * canonical matrix resolver): standalone resolves the page origin itself;
 * cloud maps the module page host onto its same-brand
 * `api-<suffix>.<base-domain>` gateway.
 */
export const selectBaseUrlForPageHost = selectBaseUrlForPageHostCanonical;

export const CLOUD_ROUTER_BROWSER_DEVELOPMENT_FORBIDDEN_KEY_PREFIX = 'PORTAL_PUBLIC_';

export const CLOUD_ROUTER_LIFECYCLE_ENV_KEYS = Object.freeze({
  configProfile: 'SDKWORK_CLOUDROUTER_ROUTER_CONFIG_PROFILE',
  environment: 'SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT',
  deploymentProfile: 'SDKWORK_CLOUDROUTER_ROUTER_DEPLOYMENT_PROFILE',
  runtimeTarget: 'SDKWORK_CLOUDROUTER_ROUTER_RUNTIME_TARGET',
});

export const CLOUD_ROUTER_RETIRED_LIFECYCLE_ENV_KEYS = Object.freeze([
  'SDKWORK_CLOUDROUTER_CONFIG_PROFILE',
  'SDKWORK_CLOUDROUTER_ENVIRONMENT',
  'SDKWORK_CLOUDROUTER_DEPLOYMENT_PROFILE',
  'SDKWORK_CLOUDROUTER_RUNTIME_TARGET',
]);

export const CLOUD_ROUTER_BROWSER_DEVELOPMENT_LEGACY_PROXY_KEYS = Object.freeze([
  'PORTAL_DEV_PROXY_GATEWAY_TARGET',
  'PORTAL_DEV_PROXY_BACKEND_API_TARGET',
  'PORTAL_DEV_PROXY_APP_API_TARGET',
]);

export const CLOUD_ROUTER_BROWSER_PROFILE_FORBIDDEN_LEGACY_PREFIXES = Object.freeze([
  'PORTAL_PUBLIC_',
  'PORTAL_DEV_PROXY_',
  'PORTAL_FORWARD_',
  ...CLOUD_ROUTER_BROWSER_FORBIDDEN_PRIVATE_EDGE_PREFIXES,
]);

export const CLOUD_ROUTER_BROWSER_PRODUCTION_FORBIDDEN_KEY_PREFIXES =
  CLOUD_ROUTER_BROWSER_PROFILE_FORBIDDEN_LEGACY_PREFIXES;

export const CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS = Object.freeze({
  openApi: 'SDKWORK_CLOUDROUTER_BROWSER_DEV_PROXY_OPEN_API_ORIGIN',
  backendApi: 'SDKWORK_CLOUDROUTER_BROWSER_DEV_PROXY_BACKEND_API_ORIGIN',
  appApi: 'SDKWORK_CLOUDROUTER_BROWSER_DEV_PROXY_APP_API_ORIGIN',
});

/** Topology env keys the Cloud Router base-URL contract reads (process-only). */
export const CLOUD_ROUTER_BASE_URL_ENV_KEYS = Object.freeze({
  localPlatformApiGatewayHttpUrl: 'SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL',
  applicationPublicHttpUrl: 'SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL',
  applicationPublicHttpUrlVite: 'VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL',
});

/**
 * Cloud Router binding of the canonical lifecycle-matrix resolver
 * (`sdkwork-specs/tools/app-base-url.mjs` `resolveBaseUrl`,
 * APP_RUNTIME_ENV_SPEC.md §2/§4). Fills the application-owned topology inputs
 * from the profile env bag when the caller does not pass them explicitly:
 *
 * - cloud dev transport ← `SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL`
 *   (the locally started `sdkwork-api-cloud-gateway`, ip+port);
 * - standalone transport ← the primary origin of
 *   `SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL`
 *   (dev: the adaptive ingress ip+port; build: the serving domain edge).
 *
 * Application code MUST call this (or the canonical resolver) instead of
 * re-deriving profile/phase decisions; the browser/runtime counterpart is
 * `resolveBaseUrl` in `@sdkwork/sdk-common` (ENVIRONMENT_SPEC.md §6.3).
 */
export function resolveCloudRouterBaseUrl({
  deploymentProfile,
  environment,
  phase,
  surface,
  env = {},
  cloudApiBaseUrls,
  repositoryRoot,
  deployment,
  topology,
  localPlatformApiGatewayHttpUrl,
  applicationPublicHttpUrl,
} = {}) {
  return resolveAppBaseUrlCanonical({
    deploymentProfile,
    environment,
    phase,
    surface,
    cloudApiBaseUrls,
    repositoryRoot,
    deployment,
    topology,
    localPlatformApiGatewayHttpUrl:
      localPlatformApiGatewayHttpUrl
      ?? readLocalPlatformApiGatewayHttpUrl(env),
    applicationPublicHttpUrl:
      applicationPublicHttpUrl
      // Transport = the origin the CLIENT calls, so the browser-visible
      // projection wins over the process-only binding (dev: the adaptive
      // ingress ip+port 4734, not the application public-ingress 3905).
      ?? primaryOriginFromEnvValue(env[CLOUD_ROUTER_BASE_URL_ENV_KEYS.applicationPublicHttpUrlVite])
      ?? primaryOriginFromEnvValue(env[CLOUD_ROUTER_BASE_URL_ENV_KEYS.applicationPublicHttpUrl]),
  });
}

export const CLOUD_ROUTER_BROWSER_DEV_PROXY_LEGACY_ALIASES = Object.freeze({
  [CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi]: 'PORTAL_DEV_PROXY_GATEWAY_TARGET',
  [CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.backendApi]: 'PORTAL_DEV_PROXY_BACKEND_API_TARGET',
  [CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.appApi]: 'PORTAL_DEV_PROXY_APP_API_TARGET',
});

export const STANDALONE_SAME_ORIGIN_API_PREFIXES = Object.freeze({
  openApi: '/v1',
  appApi: '/app/v3/api',
  backendApi: '/backend/v3/api',
  feedsOpenApi: '/feeds/v3/api',
});

/** Browser runtime must not expose process-only topology HTTP bindings. */
export const CLOUD_ROUTER_BROWSER_FORBIDDEN_RUNTIME_VITE_KEYS = Object.freeze([
  'VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL',
  'VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_BACKEND_HTTP_URL',
  'VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_OPEN_HTTP_URL',
  'VITE_SDKWORK_CLOUDROUTER_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL',
]);

export const CLOUD_ROUTER_BROWSER_DEVELOPMENT_DEFAULT_VITE_ENV = Object.freeze({
  VITE_SDKWORK_APP_ID: 'sdkwork-cloudrouter',
  VITE_API_BASE_URL: STANDALONE_SAME_ORIGIN_API_PREFIXES.openApi,
  VITE_CLOUDROUTER_OPEN_API_BASE_URL: STANDALONE_SAME_ORIGIN_API_PREFIXES.openApi,
  VITE_CLOUDROUTER_APP_API_BASE_URL: STANDALONE_SAME_ORIGIN_API_PREFIXES.appApi,
  VITE_CLOUDROUTER_BACKEND_API_BASE_URL: STANDALONE_SAME_ORIGIN_API_PREFIXES.backendApi,
  VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL: STANDALONE_SAME_ORIGIN_API_PREFIXES.backendApi,
  VITE_SDKWORK_DRIVE_BACKEND_API_BASE_URL: STANDALONE_SAME_ORIGIN_API_PREFIXES.backendApi,
  VITE_SDKWORK_FEEDS_OPEN_API_BASE_URL: STANDALONE_SAME_ORIGIN_API_PREFIXES.feedsOpenApi,
  VITE_TOOL_API_ENABLED: 'false',
});

export const CLOUD_ROUTER_BROWSER_DEVELOPMENT_ENV_KEY_ORDER = Object.freeze([
  CLOUD_ROUTER_LIFECYCLE_ENV_KEYS.configProfile,
  CLOUD_ROUTER_LIFECYCLE_ENV_KEYS.environment,
  CLOUD_ROUTER_LIFECYCLE_ENV_KEYS.deploymentProfile,
  CLOUD_ROUTER_LIFECYCLE_ENV_KEYS.runtimeTarget,
  'SDKWORK_ACCESS_TOKEN',
  CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi,
  CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.backendApi,
  CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.appApi,
  'VITE_SDKWORK_APP_ID',
  'VITE_API_BASE_URL',
  'VITE_CLOUDROUTER_OPEN_API_BASE_URL',
  'VITE_CLOUDROUTER_APP_API_BASE_URL',
  'VITE_CLOUDROUTER_BACKEND_API_BASE_URL',
  'VITE_SDKWORK_DRIVE_BACKEND_API_BASE_URL',
  'VITE_SDKWORK_FEEDS_OPEN_API_BASE_URL',
  'VITE_TOOL_API_ENABLED',
]);

export const CLOUD_ROUTER_BROWSER_DEVELOPMENT_ENV_SECTIONS = Object.freeze([
  {
    beforeKey: CLOUD_ROUTER_LIFECYCLE_ENV_KEYS.configProfile,
    lines: ['# SDKWork application profile metadata.'],
  },
  {
    beforeKey: 'SDKWORK_ACCESS_TOKEN',
    lines: [
      '# Private bootstrap access credential for protected app-api/backend-api before login.',
      '# Live values are written to .env.development.bootstrap.local on workspace startup.',
    ],
  },
  {
    beforeKey: CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi,
    lines: [
      '# Private Vite dev-server proxy upstream origins (process-only, not browser-visible).',
      '# Defaults to the integrated Rust edge server at http://127.0.0.1:3900.',
    ],
  },
  {
    beforeKey: 'VITE_SDKWORK_APP_ID',
    lines: [
      '# Browser-visible SDKWork application identity from sdkwork.app.config.json app.key.',
    ],
  },
  {
    beforeKey: 'VITE_API_BASE_URL',
    lines: [
      '# Browser-visible SDK base URLs (Vite-inlined in development).',
      '# Production uses PORTAL_PUBLIC_* on the release host, mapped to VITE_* via /runtime-env.js.',
    ],
  },
  {
    beforeKey: 'VITE_TOOL_API_ENABLED',
    lines: [
      '# Enables local browser tool UI (API reference codegen). Keep false for production-like dev.',
    ],
  },
]);

export const CLOUD_ROUTER_BROWSER_DEVELOPMENT_ENV_KEY_COMMENTS = Object.freeze({
  [CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi]:
    '# Upstream origin for /v1, /openapi.json, and OpenAI-compatible gateway routes.',
  [CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.backendApi]:
    '# Upstream origin for /backend/v3/api admin SDK routes.',
  [CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.appApi]:
    '# Upstream origin for /app/v3/api product SDK routes.',
  VITE_SDKWORK_APP_ID: '# SDKWork application key from sdkwork.app.config.json.',
  VITE_API_BASE_URL: '# Public API reference and generic SDK root path.',
  VITE_CLOUDROUTER_OPEN_API_BASE_URL: '# @sdkwork/cloudrouter-open-sdk base URL.',
  VITE_CLOUDROUTER_APP_API_BASE_URL: '# @sdkwork/cloudrouter-app-sdk base URL.',
  VITE_CLOUDROUTER_BACKEND_API_BASE_URL: '# @sdkwork/cloudrouter-backend-sdk base URL.',
  VITE_SDKWORK_DRIVE_BACKEND_API_BASE_URL:
    '# @sdkwork/drive-admin-storage-sdk / drive backend base URL (same-origin /backend/v3/api in standalone dev).',
  VITE_TOOL_API_ENABLED: '# Browser gate for local tool/codegen routes.',
});

const LEGACY_PUBLIC_TO_VITE_ENV = Object.freeze([
  ['PORTAL_PUBLIC_API_BASE_URL', 'VITE_API_BASE_URL'],
  ['PORTAL_PUBLIC_OPEN_API_BASE_URL', 'VITE_CLOUDROUTER_OPEN_API_BASE_URL'],
  ['PORTAL_PUBLIC_APP_API_BASE_URL', 'VITE_CLOUDROUTER_APP_API_BASE_URL'],
  ['PORTAL_PUBLIC_BACKEND_API_BASE_URL', 'VITE_CLOUDROUTER_BACKEND_API_BASE_URL'],
  ['PORTAL_PUBLIC_TOOL_API_ENABLED', 'VITE_TOOL_API_ENABLED'],
]);

function normalizeText(value) {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

export function isForbiddenBrowserDevelopmentEnvKey(key) {
  return CLOUD_ROUTER_BROWSER_PROFILE_FORBIDDEN_LEGACY_PREFIXES.some(
    (prefix) => key.startsWith(prefix),
  );
}

export function isForbiddenBrowserProductionEnvKey(key) {
  return CLOUD_ROUTER_BROWSER_PRODUCTION_FORBIDDEN_KEY_PREFIXES.some(
    (prefix) => key.startsWith(prefix),
  );
}

export function findForbiddenEnvKeysInContent(content, {
  forbiddenPrefixes = CLOUD_ROUTER_BROWSER_PROFILE_FORBIDDEN_LEGACY_PREFIXES,
} = {}) {
  const matches = [];
  for (const [lineIndex, rawLine] of String(content ?? '').split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const normalizedLine = line.startsWith('export ') ? line.slice('export '.length).trim() : line;
    const separatorIndex = normalizedLine.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const name = normalizedLine.slice(0, separatorIndex).trim();
    if (forbiddenPrefixes.some((prefix) => name.startsWith(prefix))) {
      matches.push({ line: lineIndex + 1, key: name });
    }
  }
  return matches;
}

export function assertEnvTemplateFreeOfForbiddenBrowserProfileKeys(
  templatePath,
  {
    forbiddenPrefixes = CLOUD_ROUTER_BROWSER_PROFILE_FORBIDDEN_LEGACY_PREFIXES,
    profileLabel = 'browser profile template',
  } = {},
) {
  const content = typeof templatePath === 'string'
    ? templatePath
    : String(templatePath ?? '');
  const matches = findForbiddenEnvKeysInContent(content, { forbiddenPrefixes });
  if (matches.length > 0) {
    const sample = matches.slice(0, 5).map((entry) => `${entry.key} (line ${entry.line})`).join(', ');
    throw new Error(
      `${profileLabel} must not contain legacy PORTAL_* keys: ${sample}`,
    );
  }
}

export function resolveBrowserDevProxyOrigin(env, canonicalKey, fallback) {
  const legacyKey = CLOUD_ROUTER_BROWSER_DEV_PROXY_LEGACY_ALIASES[canonicalKey];
  return normalizeText(env[canonicalKey])
    ?? normalizeText(env[legacyKey])
    ?? fallback;
}

export function pickBrowserDevelopmentPortalRuntimeEnv(portalRuntimeEnv = {}) {
  const picked = {};
  for (const key of CLOUD_ROUTER_BROWSER_DEVELOPMENT_ENV_KEY_ORDER) {
    if (key === CLOUD_ROUTER_LIFECYCLE_ENV_KEYS.configProfile || key === 'SDKWORK_ACCESS_TOKEN') {
      continue;
    }
    const value = normalizeText(portalRuntimeEnv[key]);
    if (value) {
      picked[key] = value;
    }
  }
  for (const [canonicalKey, legacyKey] of Object.entries(CLOUD_ROUTER_BROWSER_DEV_PROXY_LEGACY_ALIASES)) {
    if (!picked[canonicalKey]) {
      const legacyValue = normalizeText(portalRuntimeEnv[legacyKey]);
      if (legacyValue) {
        picked[canonicalKey] = legacyValue;
      }
    }
  }
  for (const [legacyPublicKey, viteKey] of LEGACY_PUBLIC_TO_VITE_ENV) {
    if (!picked[viteKey]) {
      const legacyValue = normalizeText(portalRuntimeEnv[legacyPublicKey]);
      if (legacyValue) {
        picked[viteKey] = legacyValue;
      }
    }
  }
  return picked;
}

export function normalizeCloudRouterLifecycleEnvRecord(record = {}, expectedLifecycleEnv = {}) {
  const normalized = { ...record };
  for (const retiredKey of CLOUD_ROUTER_RETIRED_LIFECYCLE_ENV_KEYS) {
    delete normalized[retiredKey];
  }
  for (const key of Object.values(CLOUD_ROUTER_LIFECYCLE_ENV_KEYS)) {
    if (Object.prototype.hasOwnProperty.call(expectedLifecycleEnv, key)) {
      normalized[key] = expectedLifecycleEnv[key];
    }
  }
  return normalized;
}

export function migrateLegacyBrowserDevelopmentEnvRecord(record = {}) {
  const migrated = normalizeCloudRouterLifecycleEnvRecord(record);
  for (const [canonicalKey, legacyKey] of Object.entries(CLOUD_ROUTER_BROWSER_DEV_PROXY_LEGACY_ALIASES)) {
    const legacyValue = normalizeText(migrated[legacyKey]);
    if (legacyValue) {
      migrated[canonicalKey] = legacyValue;
    }
    delete migrated[legacyKey];
  }
  for (const [legacyPublicKey, viteKey] of LEGACY_PUBLIC_TO_VITE_ENV) {
    const legacyValue = normalizeText(migrated[legacyPublicKey]);
    if (legacyValue) {
      migrated[viteKey] = legacyValue;
    }
    delete migrated[legacyPublicKey];
  }
  delete migrated.PORTAL_PUBLIC_SDK_BASE_URL;
  delete migrated.PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL;
  for (const key of Object.keys(migrated)) {
    if (isForbiddenBrowserDevelopmentEnvKey(key)) {
      delete migrated[key];
    }
  }
  return migrated;
}

export function sanitizeBrowserDevelopmentEnvRecord(record = {}) {
  const migrated = migrateLegacyBrowserDevelopmentEnvRecord(record);
  delete migrated.SDKWORK_AUTH_TOKEN;
  if (Object.prototype.hasOwnProperty.call(migrated, 'SDKWORK_ACCESS_TOKEN')
    && `${migrated.SDKWORK_ACCESS_TOKEN ?? ''}`.trim()) {
    // Tracked profile files must keep bootstrap credentials blank.
    migrated.SDKWORK_ACCESS_TOKEN = '';
  }
  return migrated;
}

export function sanitizeBrowserProductionEnvRecord(record = {}) {
  const sanitized = normalizeCloudRouterLifecycleEnvRecord(record);
  delete sanitized.SDKWORK_AUTH_TOKEN;
  delete sanitized.SDKWORK_ACCESS_TOKEN;
  for (const key of Object.keys(sanitized)) {
    if (isForbiddenBrowserProductionEnvKey(key)) {
      delete sanitized[key];
    }
  }
  return sanitized;
}

function isLoopbackHostname(hostname) {
  const normalized = String(hostname ?? '').replace(/^\[|\]$/g, '').toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

export function isLoopbackAbsoluteUrl(value) {
  return isLoopbackAbsoluteUrlCanonical(value);
}

function resolveStandaloneOpenApiBaseUrl(runtimeEnv) {
  return normalizeText(runtimeEnv.VITE_CLOUDROUTER_OPEN_API_BASE_URL)
    ?? normalizeText(runtimeEnv.VITE_API_BASE_URL)
    ?? STANDALONE_SAME_ORIGIN_API_PREFIXES.openApi;
}

function resolveStandaloneFeedsOpenApiBaseUrl(runtimeEnv, value) {
  if (String(value ?? '').includes('/feeds/')) {
    return STANDALONE_SAME_ORIGIN_API_PREFIXES.feedsOpenApi;
  }
  return resolveStandaloneOpenApiBaseUrl(runtimeEnv);
}

export const CLOUD_ROUTER_LOCAL_PLATFORM_API_GATEWAY_ENV_KEY =
  'SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL';

/**
 * dev:cloud binds the Vite dev surface to the locally started
 * sdkwork-api-cloud-gateway (`pnpm dev` in sdkwork-api-cloud-gateway, bind
 * 127.0.0.1:3900 — see SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL in
 * etc/topology/cloud.development.env; PNPM_SCRIPT_SPEC §3). Browser-visible
 * SDK base URLs stay same-origin so every surface flows through the Vite dev
 * proxy, and the proxy upstream origins bind to the local gateway process
 * instead of any api-dev.<base-domain> edge (a cloud-mode build/deploy
 * concern, never a dev:cloud concern). Applied after the existing-value merge
 * so stale absolute domain URLs previously persisted in .env.development are
 * corrected on the next dev:cloud startup.
 */
export function alignCloudLocalGatewayBrowserDevelopmentEnv(record = {}, {
  localPlatformApiGatewayHttpUrl,
} = {}) {
  const gatewayHttpUrl = normalizeText(localPlatformApiGatewayHttpUrl);
  if (!gatewayHttpUrl) {
    return record;
  }
  const aligned = { ...record };
  aligned[CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi] = gatewayHttpUrl;
  aligned[CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.backendApi] = gatewayHttpUrl;
  aligned[CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.appApi] = gatewayHttpUrl;
  aligned.VITE_API_BASE_URL = STANDALONE_SAME_ORIGIN_API_PREFIXES.openApi;
  aligned.VITE_CLOUDROUTER_OPEN_API_BASE_URL = STANDALONE_SAME_ORIGIN_API_PREFIXES.openApi;
  aligned.VITE_CLOUDROUTER_APP_API_BASE_URL = STANDALONE_SAME_ORIGIN_API_PREFIXES.appApi;
  aligned.VITE_CLOUDROUTER_BACKEND_API_BASE_URL = STANDALONE_SAME_ORIGIN_API_PREFIXES.backendApi;
  return aligned;
}

/**
 * Standalone browser dev mounts every composed SDK surface on the portal edge.
 * Rewrite loopback absolute dependency SDK URLs to same-origin prefixes and
 * strip process-only topology HTTP bindings from the browser runtime bag.
 *
 * The forbidden-key strip runs BEFORE any early return: a dev surface that
 * never authored the canonical base keys (previously the standalone.development
 * materialized env) used to bypass alignment entirely and leak loopback
 * `_HTTP_URL` bindings into the browser document.
 */
export function alignStandaloneSameOriginBrowserSdkRuntimeEnv(runtimeEnv = {}) {
  const aligned = { ...runtimeEnv };
  stripForbiddenRuntimeViteKeys(aligned);

  if (isLoopbackAbsoluteUrl(aligned.VITE_CLOUDROUTER_APP_API_BASE_URL)) {
    aligned.VITE_CLOUDROUTER_APP_API_BASE_URL = STANDALONE_SAME_ORIGIN_API_PREFIXES.appApi;
  }
  if (isLoopbackAbsoluteUrl(aligned.VITE_CLOUDROUTER_BACKEND_API_BASE_URL)) {
    aligned.VITE_CLOUDROUTER_BACKEND_API_BASE_URL = STANDALONE_SAME_ORIGIN_API_PREFIXES.backendApi;
  }
  if (isLoopbackAbsoluteUrl(aligned.VITE_CLOUDROUTER_OPEN_API_BASE_URL)) {
    aligned.VITE_CLOUDROUTER_OPEN_API_BASE_URL = STANDALONE_SAME_ORIGIN_API_PREFIXES.openApi;
  }
  if (isLoopbackAbsoluteUrl(aligned.VITE_API_BASE_URL)) {
    aligned.VITE_API_BASE_URL = normalizeText(aligned.VITE_CLOUDROUTER_OPEN_API_BASE_URL)
      ?? STANDALONE_SAME_ORIGIN_API_PREFIXES.openApi;
  }

  const appApiBaseUrl = normalizeText(aligned.VITE_CLOUDROUTER_APP_API_BASE_URL);
  const backendApiBaseUrl = normalizeText(aligned.VITE_CLOUDROUTER_BACKEND_API_BASE_URL)
    ?? STANDALONE_SAME_ORIGIN_API_PREFIXES.backendApi;

  if (!appApiBaseUrl?.startsWith('/')) {
    return aligned;
  }

  for (const key of Object.keys(aligned)) {
    if (!key.startsWith('VITE_SDKWORK_') || !isLoopbackAbsoluteUrl(aligned[key])) {
      continue;
    }

    if (key.endsWith('_APP_API_BASE_URL')) {
      aligned[key] = appApiBaseUrl;
      continue;
    }

    if (key.endsWith('_BACKEND_API_BASE_URL')) {
      aligned[key] = backendApiBaseUrl;
      continue;
    }

    if (key.endsWith('_OPEN_API_BASE_URL')) {
      aligned[key] = resolveStandaloneFeedsOpenApiBaseUrl(aligned, aligned[key]);
    }
  }

  return aligned;
}

function stripForbiddenRuntimeViteKeys(aligned) {
  for (const key of CLOUD_ROUTER_BROWSER_FORBIDDEN_RUNTIME_VITE_KEYS) {
    delete aligned[key];
  }
  return aligned;
}

function stripRetiredRuntimeViteKeys(aligned) {
  for (const key of CLOUD_ROUTER_BROWSER_RETIRED_RUNTIME_VITE_KEYS) {
    delete aligned[key];
  }
  return aligned;
}

/** Router-owned dependency *backend* SDK bases that must stay same-origin in dev. */
const ROUTER_OWNED_BACKEND_SDK_BASE_KEYS = Object.freeze([
  'VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL',
]);

/**
 * Fold router-owned dependency backend SDK bases onto the canonical
 * same-origin backend prefix.
 *
 * BROWSER_RUNTIME_ENV_SPEC.md §2.3 rejects every non-relative API base in a dev
 * document, not only the loopback ones: the dev ingress fronts the whole
 * router-owned surface, so an absolute `https://api.<domain>/backend/v3/api`
 * left in the dev bag points the browser straight at a deploy edge and bypasses
 * the ingress fan-out. `mergeDirectBrowserViteEnv` publishes whatever the shared
 * dotenv file carries (deploy-time values by design), so this fold must run
 * unconditionally for these keys — the same-origin prefix is the contract, not
 * a coincidence of the value happening to be loopback.
 *
 * DEV-ONLY. It is deliberately NOT called from
 * `alignStandaloneSameOriginBrowserSdkRuntimeEnv` (which also runs on the
 * release/build path, where a declared `PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL`
 * deploy origin is legitimate and must survive). Call it from the dev document
 * builder only.
 *
 * Federated sibling edges (drive, agents, voice, ...) are deliberately NOT in
 * this list: §5.3 lets them keep their declared remote origins in cloud
 * development.
 */
export function foldRouterOwnedBackendSdkBasesToSameOrigin(aligned) {
  for (const key of ROUTER_OWNED_BACKEND_SDK_BASE_KEYS) {
    if (normalizeText(aligned[key])) {
      aligned[key] = CLOUD_ROUTER_BROWSER_DEVELOPMENT_DEFAULT_VITE_ENV[key];
    }
  }
  return aligned;
}

/**
 * Every SDK base URL key a Cloud Router browser surface may publish in its dev
 * document. BROWSER_RUNTIME_ENV_SPEC.md §2.2/§5.1: each of these MUST end up on
 * its canonical same-origin prefix, because each is consumed by a generated SDK
 * client through `readCloudRouterRuntimeEnv` (PC) or the shared runtime
 * document (H5). A key that exists in the dev bag but is NOT force-authored here
 * silently keeps whatever deploy-time domain the shared dotenv file carries, so
 * adding a consumed key without adding it here is the regression this list
 * exists to prevent.
 *
 * `VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL` is the appbase backend SDK base
 * (consumed by `resolveRequiredAppbaseBackendBaseUrl` ->
 * `buildAppbaseBackendConfig` -> `new SdkworkAppbaseBackendClient`). It is an
 * independent dependency surface, but it is still a router-owned backend SDK
 * base: in dev it must be `/backend/v3/api`, exactly like the Cloud Router
 * backend family it falls back to.
 */
const BROWSER_DEV_CONTRACT_BASE_URL_KEYS = Object.freeze([
  'VITE_API_BASE_URL',
  'VITE_CLOUDROUTER_OPEN_API_BASE_URL',
  'VITE_CLOUDROUTER_APP_API_BASE_URL',
  'VITE_CLOUDROUTER_BACKEND_API_BASE_URL',
  'VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL',
]);

/**
 * Browser-visible runtime keys that no SDK client consumes. Publishing them in
 * a browser document violates BROWSER_RUNTIME_ENV_SPEC.md §5.4 (generated SDK
 * clients receive their base through the composition root; a dangling
 * deploy-time key is dead weight that invites future misuse). They are stripped
 * from every dev document.
 */
export const CLOUD_ROUTER_BROWSER_RETIRED_RUNTIME_VITE_KEYS = Object.freeze([
  'VITE_SDKWORK_COMMERCE_APP_API_BASE_URL',
  'VITE_SDKWORK_COMMERCE_BACKEND_API_BASE_URL',
]);

/**
 * Force the canonical same-origin SDK bases onto a dev browser document
 * (ENVIRONMENT_SPEC §5.1.4, CONFIG_SPEC §3.1). Dev surfaces share their dotenv
 * file with `vite build` (deploy-safe domain values), so the dev contract must
 * OVERRIDE those values, not merely fill gaps — same-origin is the contract,
 * never a coincidence of missing keys.
 *
 * DEV-ONLY. Retirement stripping runs here (not in
 * `alignStandaloneSameOriginBrowserSdkRuntimeEnv`) so the release/build path
 * keeps whatever the release host declares for its own surfaces.
 */
export function authorBrowserDevelopmentSdkBaseUrls(runtimeEnv = {}) {
  return foldRouterOwnedBackendSdkBasesToSameOrigin(
    stripRetiredRuntimeViteKeys(
      authorSameOriginSdkBaseUrls(
        runtimeEnv,
        BROWSER_DEV_CONTRACT_BASE_URL_KEYS.map((key) => [key, CLOUD_ROUTER_BROWSER_DEVELOPMENT_DEFAULT_VITE_ENV[key]]),
      ),
    ),
  );
}


/**
 * One dev runtime document shared by every browser surface (PC `/runtime-env.js`
 * bag, H5 `/runtime-env.json`): profile identity plus same-origin relative API
 * bases. The deployment profile changes only the server-side fan-out target
 * (standalone → application.public-ingress, cloud → the local platform
 * gateway) — never the browser-visible document shape.
 */
export function buildBrowserDevRuntimeEnvDocument({
  profileId,
  deploymentProfile,
  environment,
} = {}) {
  // Canonical implementation: sdkwork-specs/tools/browser-runtime-env.mjs
  // (BROWSER_RUNTIME_ENV_SPEC.md). Same-origin prefixes match
  // STANDALONE_SAME_ORIGIN_API_PREFIXES.
  return buildBrowserDevRuntimeEnvDocumentCanonical({ profileId, deploymentProfile, environment });
}

/**
 * Reusable alignment gate for every dev runtime document a browser surface
 * serves. Throws with one line per violation so the mode-matrix regression
 * test can run it against standalone AND cloud documents unchanged.
 *
 * Accepts both canonical shapes:
 * - H5 `/runtime-env.json` field style (`appApiBaseUrl`, `browserOriginMode`);
 * - PC `/runtime-env.js` Vite bag style (`VITE_CLOUDROUTER_APP_API_BASE_URL`).
 *
 * Contract: same-origin mode + relative canonical bases + router-owned
 * topology bindings never leak. Federated sibling edges (drive, agents, ...)
 * legitimately keep their declared remote origins in cloud development, so
 * only LOOPBACK absolutes are rejected unconditionally.
 */
export function assertBrowserDevRuntimeEnvDocument(document, { profileId, sameOriginBaseEntries } = {}) {
  // Canonical implementation: sdkwork-specs/tools/browser-runtime-env.mjs
  // (BROWSER_RUNTIME_ENV_SPEC.md) — shared gate for every SDKWork surface.
  // Shape-aware defaults: JSON documents enforce the three canonical fields;
  // Vite bags enforce the Cloud Router base keys. Both bind to the same
  // same-origin prefixes (STANDALONE_SAME_ORIGIN_API_PREFIXES).
  const jsonShape = document?.appApiBaseUrl !== undefined || document?.openApiBaseUrl !== undefined;
  return assertBrowserDevRuntimeEnvDocumentCanonical(document, {
    profileId,
    sameOriginBaseEntries:
      sameOriginBaseEntries
      ?? (jsonShape
        ? []
        : [
            ['VITE_CLOUDROUTER_APP_API_BASE_URL', STANDALONE_SAME_ORIGIN_API_PREFIXES.appApi],
            ['VITE_CLOUDROUTER_BACKEND_API_BASE_URL', STANDALONE_SAME_ORIGIN_API_PREFIXES.backendApi],
            ['VITE_CLOUDROUTER_OPEN_API_BASE_URL', STANDALONE_SAME_ORIGIN_API_PREFIXES.openApi],
          ]),
    requireSameOriginBases: sameOriginBaseEntries === undefined && jsonShape,
  });
}

