/**
 * Private Rust edge-server env naming contract (SDKWORK_CLOUDROUTER_*).
 * Legacy PORTAL_* aliases are read for migration only; do not write new values.
 */

export const CLOUD_ROUTER_LEGACY_PRIVATE_EDGE_ENV_PREFIXES = Object.freeze([
  'PORTAL_TOOL_API_',
  'PORTAL_CSP_',
  'PORTAL_SECURITY_',
  'PORTAL_STATIC_',
]);

export const CLOUD_ROUTER_BROWSER_FORBIDDEN_PRIVATE_EDGE_PREFIXES = Object.freeze([
  'SDKWORK_CLOUDROUTER_EDGE_',
  'SDKWORK_CLOUDROUTER_TOOL_API_',
  ...CLOUD_ROUTER_LEGACY_PRIVATE_EDGE_ENV_PREFIXES,
]);

export const CLOUD_ROUTER_EDGE_ENV_KEYS = Object.freeze({
  cspConnectSrc: 'SDKWORK_CLOUDROUTER_EDGE_CSP_CONNECT_SRC',
  staticHtmlCacheControl: 'SDKWORK_CLOUDROUTER_EDGE_PORTAL_STATIC_HTML_CACHE_CONTROL',
  staticAssetCacheControl: 'SDKWORK_CLOUDROUTER_EDGE_PORTAL_STATIC_ASSET_CACHE_CONTROL',
  hstsEnabled: 'SDKWORK_CLOUDROUTER_EDGE_HSTS_ENABLED',
  hstsMaxAgeSeconds: 'SDKWORK_CLOUDROUTER_EDGE_HSTS_MAX_AGE_SECONDS',
  hstsIncludeSubdomains: 'SDKWORK_CLOUDROUTER_EDGE_HSTS_INCLUDE_SUBDOMAINS',
  hstsPreload: 'SDKWORK_CLOUDROUTER_EDGE_HSTS_PRELOAD',
  cspFrameSrc: 'SDKWORK_CLOUDROUTER_EDGE_CSP_FRAME_SRC',
  toolApiMaxBodyBytes: 'SDKWORK_CLOUDROUTER_TOOL_API_MAX_BODY_BYTES',
  toolApiRateLimitRequests: 'SDKWORK_CLOUDROUTER_TOOL_API_RATE_LIMIT_REQUESTS',
  toolApiRateLimitWindowSeconds: 'SDKWORK_CLOUDROUTER_TOOL_API_RATE_LIMIT_WINDOW_SECONDS',
  toolApiSdkArchiveRoot: 'SDKWORK_CLOUDROUTER_TOOL_API_SDK_ARCHIVE_ROOT',
  toolApiSdkGeneratorBaseUrl: 'SDKWORK_CLOUDROUTER_TOOL_API_SDK_GENERATOR_BASE_URL',
  toolApiSdkGeneratorApiKey: 'SDKWORK_CLOUDROUTER_TOOL_API_SDK_GENERATOR_API_KEY',
  toolApiSdkGeneratorApiKeyFile: 'SDKWORK_CLOUDROUTER_TOOL_API_SDK_GENERATOR_API_KEY_FILE',
});

export const CLOUD_ROUTER_EDGE_ENV_LEGACY_ALIASES = Object.freeze({
  [CLOUD_ROUTER_EDGE_ENV_KEYS.cspConnectSrc]: 'PORTAL_CSP_CONNECT_SRC',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.staticHtmlCacheControl]: 'PORTAL_STATIC_HTML_CACHE_CONTROL',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.staticAssetCacheControl]: 'PORTAL_STATIC_ASSET_CACHE_CONTROL',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.hstsEnabled]: 'PORTAL_SECURITY_HSTS_ENABLED',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.hstsMaxAgeSeconds]: 'PORTAL_SECURITY_HSTS_MAX_AGE_SECONDS',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.hstsIncludeSubdomains]: 'PORTAL_SECURITY_HSTS_INCLUDE_SUBDOMAINS',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.hstsPreload]: 'PORTAL_SECURITY_HSTS_PRELOAD',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.cspFrameSrc]: 'PORTAL_SECURITY_CSP_FRAME_SRC',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiMaxBodyBytes]: 'PORTAL_TOOL_API_MAX_BODY_BYTES',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitRequests]: 'PORTAL_TOOL_API_RATE_LIMIT_REQUESTS',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitWindowSeconds]: 'PORTAL_TOOL_API_RATE_LIMIT_WINDOW_SECONDS',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiSdkArchiveRoot]: 'PORTAL_TOOL_API_SDK_ARCHIVE_ROOT',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiSdkGeneratorBaseUrl]: 'PORTAL_TOOL_API_SDK_GENERATOR_BASE_URL',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiSdkGeneratorApiKey]: 'PORTAL_TOOL_API_SDK_GENERATOR_API_KEY',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiSdkGeneratorApiKeyFile]: 'PORTAL_TOOL_API_SDK_GENERATOR_API_KEY_FILE',
});

export const CLOUD_ROUTER_RELEASE_EDGE_ENV_KEY_ORDER = Object.freeze([
  CLOUD_ROUTER_EDGE_ENV_KEYS.cspConnectSrc,
  CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitRequests,
  CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitWindowSeconds,
  CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiSdkGeneratorBaseUrl,
  CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiSdkGeneratorApiKey,
  CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiSdkArchiveRoot,
]);

export const CLOUD_ROUTER_RELEASE_EDGE_ENV_DEFAULTS = Object.freeze({
  [CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitRequests]: '120',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitWindowSeconds]: '60',
});

export const CLOUD_ROUTER_RELEASE_EDGE_ENV_KEY_COMMENTS = Object.freeze({
  [CLOUD_ROUTER_EDGE_ENV_KEYS.cspConnectSrc]:
    '# Additional HTTP/HTTPS origins for production CSP connect-src.',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitRequests]:
    '# Server-side rate limit for the Rust edge local tool API when enabled.',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitWindowSeconds]:
    '# Rate limit window in seconds for the Rust edge local tool API.',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiSdkGeneratorBaseUrl]:
    '# Optional SDK generator origin for /api/generate-sdk.',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiSdkGeneratorApiKey]:
    '# Optional bearer token for the SDK generator. Prefer secret files on release hosts.',
  [CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiSdkArchiveRoot]:
    '# Optional directory of prebuilt SDK ZIP archives for /api/generate-sdk fallback.',
});

function normalizeText(value) {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

export function resolveEdgeEnvValue(env, canonicalKey, fallback) {
  const legacyKey = CLOUD_ROUTER_EDGE_ENV_LEGACY_ALIASES[canonicalKey];
  return normalizeText(env[canonicalKey])
    ?? (legacyKey ? normalizeText(env[legacyKey]) : undefined)
    ?? fallback;
}

export function pickCanonicalEdgeEnv(env = {}) {
  const picked = {};
  for (const canonicalKey of Object.values(CLOUD_ROUTER_EDGE_ENV_KEYS)) {
    const value = resolveEdgeEnvValue(env, canonicalKey);
    if (value !== undefined) {
      picked[canonicalKey] = value;
    }
  }
  return picked;
}

export function migrateLegacyReleaseHostEdgeEnvRecord(record = {}) {
  const migrated = { ...record };
  for (const [canonicalKey, legacyKey] of Object.entries(CLOUD_ROUTER_EDGE_ENV_LEGACY_ALIASES)) {
    const legacyValue = normalizeText(migrated[legacyKey]);
    if (legacyValue && !normalizeText(migrated[canonicalKey])) {
      migrated[canonicalKey] = legacyValue;
    }
    delete migrated[legacyKey];
  }
  return migrated;
}

export function sanitizeReleaseHostEnvRecord(record = {}) {
  const sanitized = migrateLegacyReleaseHostEdgeEnvRecord(record);
  delete sanitized.SDKWORK_ACCESS_TOKEN;
  delete sanitized.SDKWORK_DATABASE_URL;
  for (const key of Object.keys(sanitized)) {
    if (CLOUD_ROUTER_LEGACY_PRIVATE_EDGE_ENV_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      delete sanitized[key];
    }
  }
  return sanitized;
}

export function buildReleaseHostEdgeGeneratedEnv(env = {}) {
  const generated = {};
  for (const key of CLOUD_ROUTER_RELEASE_EDGE_ENV_KEY_ORDER) {
    const fallback = CLOUD_ROUTER_RELEASE_EDGE_ENV_DEFAULTS[key] ?? '';
    generated[key] = resolveEdgeEnvValue(env, key, fallback) ?? fallback;
  }
  return generated;
}

export function buildRuntimeEdgePrivateEnv(env = {}, overrides = {}) {
  return {
    ...buildReleaseHostEdgeGeneratedEnv(env),
    ...overrides,
  };
}
