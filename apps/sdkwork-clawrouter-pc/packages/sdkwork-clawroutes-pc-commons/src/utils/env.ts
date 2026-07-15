import { isBlank, trim } from '../sdkwork-utils.ts';
import { resolveBrowserReachableBaseUrl } from '../browser-base-url.ts';

type ClawRouterRuntimeWindow = Window & {
  __CLAWROUTER_ENV__?: Record<string, unknown>;
};

export const DEFAULT_API_BASE_URL = '/v1';
export const CLAWROUTER_DEV_SESSION_AUTH_REDIRECT_BYPASS_ENV_KEY =
  'VITE_SDKWORK_CLAWROUTER_DEV_SESSION_AUTH_REDIRECT_BYPASS';

export function readClawRouterRuntimeEnv(name: string): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const value = (window as ClawRouterRuntimeWindow).__CLAWROUTER_ENV__?.[name];
  if (typeof value !== 'string' || isBlank(value)) {
    return undefined;
  }
  const trimmed = trim(value);
  if (name === 'VITE_API_BASE_URL' || /^(?:PORTAL_PUBLIC_|VITE_CLAWROUTER_|VITE_SDKWORK_).*BASE_URL$/u.test(name)) {
    return resolveBrowserReachableBaseUrl(trimmed, window.location);
  }
  return trimmed;
}

export function resolveClawRouterRuntimeBoolean(name: string, defaultValue = false): boolean {
  const value = readClawRouterRuntimeEnv(name);
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
  const configuredUrl = readClawRouterRuntimeEnv('VITE_API_BASE_URL');
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
    readClawRouterRuntimeEnv('VITE_CLAWROUTER_OPEN_API_BASE_URL')
    ?? readClawRouterRuntimeEnv('VITE_API_BASE_URL');
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
