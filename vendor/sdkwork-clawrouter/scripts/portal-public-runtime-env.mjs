export const PORTAL_PUBLIC_RUNTIME_DEFAULTS = Object.freeze({
  apiBaseUrl: '/v1',
  openApiBaseUrl: '/v1',
  appApiBaseUrl: '/app/v3/api',
  backendApiBaseUrl: '/backend/v3/api',
  toolApiEnabled: 'false',
});

const BACKEND_API_PREFIX = '/backend/v3/api';

export const PORTAL_PUBLIC_RUNTIME_ENV_NAMES = Object.freeze([
  'PORTAL_PUBLIC_SDK_BASE_URL',
  'PORTAL_PUBLIC_API_BASE_URL',
  'PORTAL_PUBLIC_OPEN_API_BASE_URL',
  'PORTAL_PUBLIC_APP_API_BASE_URL',
  'PORTAL_PUBLIC_BACKEND_API_BASE_URL',
  'PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL',
  'PORTAL_PUBLIC_TOOL_API_ENABLED',
]);

export function resolvePortalPublicRuntimeEnv(
  env = process.env,
  defaults = PORTAL_PUBLIC_RUNTIME_DEFAULTS,
) {
  const sdkBaseUrl = readConfiguredEnv(env, 'PORTAL_PUBLIC_SDK_BASE_URL');
  const apiBaseUrl = readConfiguredEnv(env, 'PORTAL_PUBLIC_API_BASE_URL');
  const openApiBaseUrl = readConfiguredEnv(env, 'PORTAL_PUBLIC_OPEN_API_BASE_URL');
  const appApiBaseUrl = readConfiguredEnv(env, 'PORTAL_PUBLIC_APP_API_BASE_URL');
  const backendApiBaseUrl = readConfiguredEnv(env, 'PORTAL_PUBLIC_BACKEND_API_BASE_URL');
  const effectiveBackendApiBaseUrl = backendApiBaseUrl
    ?? (!sdkBaseUrl && defaults.backendApiBaseUrl ? defaults.backendApiBaseUrl : undefined);
  const appbaseBackendApiBaseUrl = readConfiguredEnv(
    env,
    'PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL',
  )
    ?? appendPortalPublicSdkBaseUrl(sdkBaseUrl, BACKEND_API_PREFIX)
    ?? effectiveBackendApiBaseUrl;

  return {
    ...(sdkBaseUrl ? { PORTAL_PUBLIC_SDK_BASE_URL: sdkBaseUrl } : {}),
    ...(apiBaseUrl
      ? { PORTAL_PUBLIC_API_BASE_URL: apiBaseUrl }
      : !sdkBaseUrl && defaults.apiBaseUrl
        ? { PORTAL_PUBLIC_API_BASE_URL: defaults.apiBaseUrl }
        : {}),
    ...(openApiBaseUrl
      ? { PORTAL_PUBLIC_OPEN_API_BASE_URL: openApiBaseUrl }
      : apiBaseUrl
        ? { PORTAL_PUBLIC_OPEN_API_BASE_URL: apiBaseUrl }
        : !sdkBaseUrl && defaults.openApiBaseUrl
          ? { PORTAL_PUBLIC_OPEN_API_BASE_URL: defaults.openApiBaseUrl }
          : {}),
    ...(appApiBaseUrl
      ? { PORTAL_PUBLIC_APP_API_BASE_URL: appApiBaseUrl }
      : !sdkBaseUrl && defaults.appApiBaseUrl
        ? { PORTAL_PUBLIC_APP_API_BASE_URL: defaults.appApiBaseUrl }
        : {}),
    ...(backendApiBaseUrl
      ? { PORTAL_PUBLIC_BACKEND_API_BASE_URL: backendApiBaseUrl }
      : effectiveBackendApiBaseUrl
        ? { PORTAL_PUBLIC_BACKEND_API_BASE_URL: effectiveBackendApiBaseUrl }
        : {}),
    ...(appbaseBackendApiBaseUrl
      ? { PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL: appbaseBackendApiBaseUrl }
      : {}),
    PORTAL_PUBLIC_TOOL_API_ENABLED:
      readConfiguredEnv(env, 'PORTAL_PUBLIC_TOOL_API_ENABLED') ?? defaults.toolApiEnabled,
  };
}

export function omitPortalPublicRuntimeEnv(env = process.env) {
  const sanitizedEnv = { ...env };
  for (const name of PORTAL_PUBLIC_RUNTIME_ENV_NAMES) {
    delete sanitizedEnv[name];
  }
  return sanitizedEnv;
}

export function mergePortalPublicRuntimeEnv(
  env = process.env,
  defaults = PORTAL_PUBLIC_RUNTIME_DEFAULTS,
) {
  return {
    ...omitPortalPublicRuntimeEnv(env),
    ...resolvePortalPublicRuntimeEnv(env, defaults),
  };
}

export function portalPublicRuntimeEnvLineValue(runtimeEnv, name) {
  return runtimeEnv[name] ?? '(derived from PORTAL_PUBLIC_SDK_BASE_URL)';
}

function readConfiguredEnv(env, name) {
  const value = String(env[name] ?? '').trim();
  return value ? value : undefined;
}

function appendPortalPublicSdkBaseUrl(sdkBaseUrl, apiPrefix) {
  if (!sdkBaseUrl) {
    return undefined;
  }
  const normalizedPrefix = apiPrefix.startsWith('/') ? apiPrefix : `/${apiPrefix}`;
  const base = sdkBaseUrl.replace(/\/+$/u, '');
  return base ? `${base}${normalizedPrefix}` : normalizedPrefix;
}
