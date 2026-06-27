/**
 * Claw Router browser env naming contract aligned with ../sdkwork-specs/ENVIRONMENT_SPEC.md.
 *
 * Development profile (.env.development):
 *   - SDKWORK_CLAW_* profile metadata
 *   - SDKWORK_ACCESS_TOKEN private bootstrap access credential
 *   - SDKWORK_CLAW_BROWSER_DEV_PROXY_* private Vite proxy origins
 *   - VITE_* browser-visible SDK/runtime values
 *
 * Release profile (.env.release):
 *   - PORTAL_PUBLIC_* server inputs for /runtime-env.js (never in .env.development)
 *   - SDKWORK_CLAW_EDGE_* / SDKWORK_CLAW_TOOL_API_* private edge-server settings
 */

import {
  CLAW_ROUTER_BROWSER_FORBIDDEN_PRIVATE_EDGE_PREFIXES,
} from './claw-router-edge-env-contract.mjs';

export const CLAW_ROUTER_BROWSER_DEVELOPMENT_FORBIDDEN_KEY_PREFIX = 'PORTAL_PUBLIC_';

export const CLAW_ROUTER_BROWSER_DEVELOPMENT_LEGACY_PROXY_KEYS = Object.freeze([
  'PORTAL_DEV_PROXY_GATEWAY_TARGET',
  'PORTAL_DEV_PROXY_BACKEND_API_TARGET',
  'PORTAL_DEV_PROXY_APP_API_TARGET',
]);

export const CLAW_ROUTER_BROWSER_PROFILE_FORBIDDEN_LEGACY_PREFIXES = Object.freeze([
  'PORTAL_PUBLIC_',
  'PORTAL_DEV_PROXY_',
  'PORTAL_FORWARD_',
  ...CLAW_ROUTER_BROWSER_FORBIDDEN_PRIVATE_EDGE_PREFIXES,
]);

export const CLAW_ROUTER_BROWSER_PRODUCTION_FORBIDDEN_KEY_PREFIXES =
  CLAW_ROUTER_BROWSER_PROFILE_FORBIDDEN_LEGACY_PREFIXES;

export const CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS = Object.freeze({
  openApi: 'SDKWORK_CLAW_BROWSER_DEV_PROXY_OPEN_API_ORIGIN',
  backendApi: 'SDKWORK_CLAW_BROWSER_DEV_PROXY_BACKEND_API_ORIGIN',
  appApi: 'SDKWORK_CLAW_BROWSER_DEV_PROXY_APP_API_ORIGIN',
});

export const CLAW_ROUTER_BROWSER_DEV_PROXY_LEGACY_ALIASES = Object.freeze({
  [CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi]: 'PORTAL_DEV_PROXY_GATEWAY_TARGET',
  [CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.backendApi]: 'PORTAL_DEV_PROXY_BACKEND_API_TARGET',
  [CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.appApi]: 'PORTAL_DEV_PROXY_APP_API_TARGET',
});

export const CLAW_ROUTER_BROWSER_DEVELOPMENT_DEFAULT_VITE_ENV = Object.freeze({
  VITE_SDKWORK_APP_ID: 'sdkwork-clawrouter',
  VITE_API_BASE_URL: '/v1',
  VITE_CLAWROUTER_OPEN_API_BASE_URL: '/v1',
  VITE_CLAWROUTER_APP_API_BASE_URL: '/app/v3/api',
  VITE_CLAWROUTER_BACKEND_API_BASE_URL: '/backend/v3/api',
  VITE_TOOL_API_ENABLED: 'false',
});

export const CLAW_ROUTER_BROWSER_DEVELOPMENT_ENV_KEY_ORDER = Object.freeze([
  'SDKWORK_CLAW_CONFIG_PROFILE',
  'SDKWORK_CLAW_ENVIRONMENT',
  'SDKWORK_CLAW_DEPLOYMENT_PROFILE',
  'SDKWORK_CLAW_RUNTIME_TARGET',
  'SDKWORK_ACCESS_TOKEN',
  CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi,
  CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.backendApi,
  CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.appApi,
  'VITE_SDKWORK_APP_ID',
  'VITE_API_BASE_URL',
  'VITE_CLAWROUTER_OPEN_API_BASE_URL',
  'VITE_CLAWROUTER_APP_API_BASE_URL',
  'VITE_CLAWROUTER_BACKEND_API_BASE_URL',
  'VITE_TOOL_API_ENABLED',
]);

export const CLAW_ROUTER_BROWSER_DEVELOPMENT_ENV_SECTIONS = Object.freeze([
  {
    beforeKey: 'SDKWORK_CLAW_CONFIG_PROFILE',
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
    beforeKey: CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi,
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

export const CLAW_ROUTER_BROWSER_DEVELOPMENT_ENV_KEY_COMMENTS = Object.freeze({
  [CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi]:
    '# Upstream origin for /v1, /openapi.json, and OpenAI-compatible gateway routes.',
  [CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.backendApi]:
    '# Upstream origin for /backend/v3/api admin SDK routes.',
  [CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.appApi]:
    '# Upstream origin for /app/v3/api product SDK routes.',
  VITE_SDKWORK_APP_ID: '# SDKWork application key from sdkwork.app.config.json.',
  VITE_API_BASE_URL: '# Public API reference and generic SDK root path.',
  VITE_CLAWROUTER_OPEN_API_BASE_URL: '# @sdkwork/clawrouter-open-sdk base URL.',
  VITE_CLAWROUTER_APP_API_BASE_URL: '# @sdkwork/clawrouter-app-sdk base URL.',
  VITE_CLAWROUTER_BACKEND_API_BASE_URL: '# @sdkwork/clawrouter-backend-sdk base URL.',
  VITE_TOOL_API_ENABLED: '# Browser gate for local tool/codegen routes.',
});

const LEGACY_PUBLIC_TO_VITE_ENV = Object.freeze([
  ['PORTAL_PUBLIC_API_BASE_URL', 'VITE_API_BASE_URL'],
  ['PORTAL_PUBLIC_OPEN_API_BASE_URL', 'VITE_CLAWROUTER_OPEN_API_BASE_URL'],
  ['PORTAL_PUBLIC_APP_API_BASE_URL', 'VITE_CLAWROUTER_APP_API_BASE_URL'],
  ['PORTAL_PUBLIC_BACKEND_API_BASE_URL', 'VITE_CLAWROUTER_BACKEND_API_BASE_URL'],
  ['PORTAL_PUBLIC_TOOL_API_ENABLED', 'VITE_TOOL_API_ENABLED'],
]);

function normalizeText(value) {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

export function isForbiddenBrowserDevelopmentEnvKey(key) {
  return CLAW_ROUTER_BROWSER_PROFILE_FORBIDDEN_LEGACY_PREFIXES.some(
    (prefix) => key.startsWith(prefix),
  );
}

export function isForbiddenBrowserProductionEnvKey(key) {
  return CLAW_ROUTER_BROWSER_PRODUCTION_FORBIDDEN_KEY_PREFIXES.some(
    (prefix) => key.startsWith(prefix),
  );
}

export function findForbiddenEnvKeysInContent(content, {
  forbiddenPrefixes = CLAW_ROUTER_BROWSER_PROFILE_FORBIDDEN_LEGACY_PREFIXES,
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
    forbiddenPrefixes = CLAW_ROUTER_BROWSER_PROFILE_FORBIDDEN_LEGACY_PREFIXES,
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
  const legacyKey = CLAW_ROUTER_BROWSER_DEV_PROXY_LEGACY_ALIASES[canonicalKey];
  return normalizeText(env[canonicalKey])
    ?? normalizeText(env[legacyKey])
    ?? fallback;
}

export function pickBrowserDevelopmentPortalRuntimeEnv(portalRuntimeEnv = {}) {
  const picked = {};
  for (const key of CLAW_ROUTER_BROWSER_DEVELOPMENT_ENV_KEY_ORDER) {
    if (key.startsWith('SDKWORK_CLAW_CONFIG_') || key === 'SDKWORK_ACCESS_TOKEN') {
      continue;
    }
    const value = normalizeText(portalRuntimeEnv[key]);
    if (value) {
      picked[key] = value;
    }
  }
  for (const [canonicalKey, legacyKey] of Object.entries(CLAW_ROUTER_BROWSER_DEV_PROXY_LEGACY_ALIASES)) {
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

export function migrateLegacyBrowserDevelopmentEnvRecord(record = {}) {
  const migrated = { ...record };
  for (const [canonicalKey, legacyKey] of Object.entries(CLAW_ROUTER_BROWSER_DEV_PROXY_LEGACY_ALIASES)) {
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
  const sanitized = { ...record };
  delete sanitized.SDKWORK_AUTH_TOKEN;
  if (Object.prototype.hasOwnProperty.call(sanitized, 'SDKWORK_ACCESS_TOKEN')
    && `${sanitized.SDKWORK_ACCESS_TOKEN ?? ''}`.trim()) {
    sanitized.SDKWORK_ACCESS_TOKEN = '';
  }
  for (const key of Object.keys(sanitized)) {
    if (isForbiddenBrowserProductionEnvKey(key)) {
      delete sanitized[key];
    }
  }
  return sanitized;
}
