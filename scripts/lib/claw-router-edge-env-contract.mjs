/**
 * Private Rust edge-server env naming contract (SDKWORK_CLAW_*).
 * Legacy PORTAL_* aliases are read for migration only; do not write new values.
 */

export const CLAW_ROUTER_LEGACY_PRIVATE_EDGE_ENV_PREFIXES = Object.freeze([
  'PORTAL_TOOL_API_',
  'PORTAL_CSP_',
  'PORTAL_SECURITY_',
  'PORTAL_STATIC_',
]);

export const CLAW_ROUTER_BROWSER_FORBIDDEN_PRIVATE_EDGE_PREFIXES = Object.freeze([
  'SDKWORK_CLAW_EDGE_',
  'SDKWORK_CLAW_TOOL_API_',
  ...CLAW_ROUTER_LEGACY_PRIVATE_EDGE_ENV_PREFIXES,
]);

export const CLAW_ROUTER_EDGE_ENV_KEYS = Object.freeze({
  cspConnectSrc: 'SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC',
  staticHtmlCacheControl: 'SDKWORK_CLAW_EDGE_PORTAL_STATIC_HTML_CACHE_CONTROL',
  staticAssetCacheControl: 'SDKWORK_CLAW_EDGE_PORTAL_STATIC_ASSET_CACHE_CONTROL',
  hstsEnabled: 'SDKWORK_CLAW_EDGE_HSTS_ENABLED',
  hstsMaxAgeSeconds: 'SDKWORK_CLAW_EDGE_HSTS_MAX_AGE_SECONDS',
  hstsIncludeSubdomains: 'SDKWORK_CLAW_EDGE_HSTS_INCLUDE_SUBDOMAINS',
  hstsPreload: 'SDKWORK_CLAW_EDGE_HSTS_PRELOAD',
  cspFrameSrc: 'SDKWORK_CLAW_EDGE_CSP_FRAME_SRC',
  toolApiMaxBodyBytes: 'SDKWORK_CLAW_TOOL_API_MAX_BODY_BYTES',
  toolApiRateLimitRequests: 'SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS',
  toolApiRateLimitWindowSeconds: 'SDKWORK_CLAW_TOOL_API_RATE_LIMIT_WINDOW_SECONDS',
  toolApiSdkArchiveRoot: 'SDKWORK_CLAW_TOOL_API_SDK_ARCHIVE_ROOT',
  toolApiSdkGeneratorBaseUrl: 'SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_BASE_URL',
  toolApiSdkGeneratorApiKey: 'SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_API_KEY',
  toolApiSdkGeneratorApiKeyFile: 'SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_API_KEY_FILE',
});

export const CLAW_ROUTER_EDGE_ENV_LEGACY_ALIASES = Object.freeze({
  [CLAW_ROUTER_EDGE_ENV_KEYS.cspConnectSrc]: 'PORTAL_CSP_CONNECT_SRC',
  [CLAW_ROUTER_EDGE_ENV_KEYS.staticHtmlCacheControl]: 'PORTAL_STATIC_HTML_CACHE_CONTROL',
  [CLAW_ROUTER_EDGE_ENV_KEYS.staticAssetCacheControl]: 'PORTAL_STATIC_ASSET_CACHE_CONTROL',
  [CLAW_ROUTER_EDGE_ENV_KEYS.hstsEnabled]: 'PORTAL_SECURITY_HSTS_ENABLED',
  [CLAW_ROUTER_EDGE_ENV_KEYS.hstsMaxAgeSeconds]: 'PORTAL_SECURITY_HSTS_MAX_AGE_SECONDS',
  [CLAW_ROUTER_EDGE_ENV_KEYS.hstsIncludeSubdomains]: 'PORTAL_SECURITY_HSTS_INCLUDE_SUBDOMAINS',
  [CLAW_ROUTER_EDGE_ENV_KEYS.hstsPreload]: 'PORTAL_SECURITY_HSTS_PRELOAD',
  [CLAW_ROUTER_EDGE_ENV_KEYS.cspFrameSrc]: 'PORTAL_SECURITY_CSP_FRAME_SRC',
  [CLAW_ROUTER_EDGE_ENV_KEYS.toolApiMaxBodyBytes]: 'PORTAL_TOOL_API_MAX_BODY_BYTES',
  [CLAW_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitRequests]: 'PORTAL_TOOL_API_RATE_LIMIT_REQUESTS',
  [CLAW_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitWindowSeconds]: 'PORTAL_TOOL_API_RATE_LIMIT_WINDOW_SECONDS',
  [CLAW_ROUTER_EDGE_ENV_KEYS.toolApiSdkArchiveRoot]: 'PORTAL_TOOL_API_SDK_ARCHIVE_ROOT',
  [CLAW_ROUTER_EDGE_ENV_KEYS.toolApiSdkGeneratorBaseUrl]: 'PORTAL_TOOL_API_SDK_GENERATOR_BASE_URL',
  [CLAW_ROUTER_EDGE_ENV_KEYS.toolApiSdkGeneratorApiKey]: 'PORTAL_TOOL_API_SDK_GENERATOR_API_KEY',
  [CLAW_ROUTER_EDGE_ENV_KEYS.toolApiSdkGeneratorApiKeyFile]: 'PORTAL_TOOL_API_SDK_GENERATOR_API_KEY_FILE',
});

export const CLAW_ROUTER_RELEASE_EDGE_ENV_KEY_ORDER = Object.freeze([
  CLAW_ROUTER_EDGE_ENV_KEYS.cspConnectSrc,
  CLAW_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitRequests,
  CLAW_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitWindowSeconds,
  CLAW_ROUTER_EDGE_ENV_KEYS.toolApiSdkGeneratorBaseUrl,
  CLAW_ROUTER_EDGE_ENV_KEYS.toolApiSdkGeneratorApiKey,
  CLAW_ROUTER_EDGE_ENV_KEYS.toolApiSdkArchiveRoot,
]);

export const CLAW_ROUTER_RELEASE_EDGE_ENV_DEFAULTS = Object.freeze({
  [CLAW_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitRequests]: '120',
  [CLAW_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitWindowSeconds]: '60',
});

export const CLAW_ROUTER_RELEASE_EDGE_ENV_KEY_COMMENTS = Object.freeze({
  [CLAW_ROUTER_EDGE_ENV_KEYS.cspConnectSrc]:
    '# Additional HTTP/HTTPS origins for production CSP connect-src.',
  [CLAW_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitRequests]:
    '# Server-side rate limit for the Rust edge local tool API when enabled.',
  [CLAW_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitWindowSeconds]:
    '# Rate limit window in seconds for the Rust edge local tool API.',
  [CLAW_ROUTER_EDGE_ENV_KEYS.toolApiSdkGeneratorBaseUrl]:
    '# Optional SDK generator origin for /api/generate-sdk.',
  [CLAW_ROUTER_EDGE_ENV_KEYS.toolApiSdkGeneratorApiKey]:
    '# Optional bearer token for the SDK generator. Prefer secret files on release hosts.',
  [CLAW_ROUTER_EDGE_ENV_KEYS.toolApiSdkArchiveRoot]:
    '# Optional directory of prebuilt SDK ZIP archives for /api/generate-sdk fallback.',
});

function normalizeText(value) {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

export function resolveEdgeEnvValue(env, canonicalKey, fallback) {
  const legacyKey = CLAW_ROUTER_EDGE_ENV_LEGACY_ALIASES[canonicalKey];
  return normalizeText(env[canonicalKey])
    ?? (legacyKey ? normalizeText(env[legacyKey]) : undefined)
    ?? fallback;
}

export function pickCanonicalEdgeEnv(env = {}) {
  const picked = {};
  for (const canonicalKey of Object.values(CLAW_ROUTER_EDGE_ENV_KEYS)) {
    const value = resolveEdgeEnvValue(env, canonicalKey);
    if (value !== undefined) {
      picked[canonicalKey] = value;
    }
  }
  return picked;
}

export function migrateLegacyReleaseHostEdgeEnvRecord(record = {}) {
  const migrated = { ...record };
  for (const [canonicalKey, legacyKey] of Object.entries(CLAW_ROUTER_EDGE_ENV_LEGACY_ALIASES)) {
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
    if (CLAW_ROUTER_LEGACY_PRIVATE_EDGE_ENV_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      delete sanitized[key];
    }
  }
  return sanitized;
}

export function buildReleaseHostEdgeGeneratedEnv(env = {}) {
  const generated = {};
  for (const key of CLAW_ROUTER_RELEASE_EDGE_ENV_KEY_ORDER) {
    const fallback = CLAW_ROUTER_RELEASE_EDGE_ENV_DEFAULTS[key] ?? '';
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
