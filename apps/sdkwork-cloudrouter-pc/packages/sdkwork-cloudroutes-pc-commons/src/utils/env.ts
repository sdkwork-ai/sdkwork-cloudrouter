import { isBlank, trim } from '../sdkwork-utils.ts';
import { resolveBrowserReachableBaseUrl } from '../browser-base-url.ts';

type CloudRouterRuntimeWindow = Window & {
  __CLOUDROUTER_ENV__?: Record<string, unknown>;
};

export const DEFAULT_API_BASE_URL = '/v1';
export const CLOUDROUTER_DEV_SESSION_AUTH_REDIRECT_BYPASS_ENV_KEY =
  'VITE_SDKWORK_CLOUDROUTER_DEV_SESSION_AUTH_REDIRECT_BYPASS';

export function readCloudRouterRuntimeEnv(name: string): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const value = (window as CloudRouterRuntimeWindow).__CLOUDROUTER_ENV__?.[name];
  if (typeof value !== 'string' || isBlank(value)) {
    return undefined;
  }
  const trimmed = trim(value);
  if (name === 'VITE_API_BASE_URL' || /^(?:PORTAL_PUBLIC_|VITE_CLOUDROUTER_|VITE_SDKWORK_).*BASE_URL$/u.test(name)) {
    return resolveBrowserReachableBaseUrl(trimmed, window.location);
  }
  return trimmed;
}

export function resolveCloudRouterRuntimeBoolean(name: string, defaultValue = false): boolean {
  const value = readCloudRouterRuntimeEnv(name);
  if (!value) {
    return defaultValue;
  }

  const normalized = trim(value).toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

function resolveApiBaseUrl(): string {
  const configuredUrl = readCloudRouterRuntimeEnv('VITE_API_BASE_URL');
  const baseUrl = configuredUrl ?? DEFAULT_API_BASE_URL;

  try {
    new URL(baseUrl);
    return baseUrl;
  } catch {
    if (typeof window === 'undefined') {
      return DEFAULT_API_BASE_URL;
    }
    return baseUrl;
  }
}

function resolveOpenApiBaseUrl(): string {
  const configuredUrl =
    readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_OPEN_API_BASE_URL')
    ?? readCloudRouterRuntimeEnv('VITE_API_BASE_URL');
  const baseUrl = configuredUrl ?? DEFAULT_API_BASE_URL;

  try {
    new URL(baseUrl);
    return baseUrl;
  } catch {
    if (typeof window === 'undefined') {
      return DEFAULT_API_BASE_URL;
    }
    return baseUrl;
  }
}

export const API_BASE_URL = resolveApiBaseUrl();
export const OPEN_API_BASE_URL = resolveOpenApiBaseUrl();
