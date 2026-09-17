import { resolveBaseUrlWithAlignProtocol } from '@sdkwork/sdk-common';

export interface CloudRouterH5RuntimeEnv {
  readonly environment: string;
  readonly deploymentProfile: string;
  readonly profileId: string;
  readonly appApiBaseUrl: string | null;
  readonly backendApiBaseUrl: string | null;
  readonly openApiBaseUrl: string | null;
}

const DEFAULT_RUNTIME_ENV: CloudRouterH5RuntimeEnv = {
  environment: 'development',
  deploymentProfile: 'standalone',
  profileId: 'standalone.development',
  appApiBaseUrl: null,
  backendApiBaseUrl: null,
  openApiBaseUrl: null,
};

const RUNTIME_ENV_URL = '/runtime-env.json';
const APP_API_SUFFIX = '/app/v3/api';

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function normalizeRuntimeEnv(source: Record<string, unknown>): CloudRouterH5RuntimeEnv {
  return {
    environment: readString(source, 'environment') ?? DEFAULT_RUNTIME_ENV.environment,
    deploymentProfile: readString(source, 'deploymentProfile') ?? DEFAULT_RUNTIME_ENV.deploymentProfile,
    profileId: readString(source, 'profileId') ?? DEFAULT_RUNTIME_ENV.profileId,
    appApiBaseUrl: readString(source, 'appApiBaseUrl'),
    backendApiBaseUrl: readString(source, 'backendApiBaseUrl'),
    openApiBaseUrl: readString(source, 'openApiBaseUrl'),
  };
}

export async function loadRuntimeEnv(fetchImpl: typeof fetch = fetch): Promise<CloudRouterH5RuntimeEnv> {
  try {
    const response = await fetchImpl(RUNTIME_ENV_URL, { cache: 'no-store' });
    if (!response.ok) return DEFAULT_RUNTIME_ENV;
    const payload = (await response.json()) as Record<string, unknown>;
    return normalizeRuntimeEnv(payload);
  } catch {
    return DEFAULT_RUNTIME_ENV;
  }
}

export function resolveRuntimeEnv(): CloudRouterH5RuntimeEnv {
  return normalizeRuntimeEnv(
    typeof import.meta === 'undefined' ? {} : (import.meta.env as unknown as Record<string, unknown>),
  );
}

/**
 * Resolves the generated app SDK origin.
 *
 * The generated SDK appends `/app/v3/api` itself (`appApiPath`), so the origin
 * passed to `createClient` must not carry that suffix. ENVIRONMENT_SPEC.md §6.3
 * protocol adaptation is applied so an http page calls the http origin and an
 * https page the https origin.
 */
export function resolveCloudRouterAppApiBaseUrl(env: CloudRouterH5RuntimeEnv = resolveRuntimeEnv()): string {
  const pageOrigin = typeof window === 'undefined' ? '' : window.location.origin;
  const candidate = env.appApiBaseUrl ?? pageOrigin;
  if (!candidate) {
    throw new Error(
      'Cloud Router H5 requires appApiBaseUrl in runtime-env.json or a browser page origin.',
    );
  }
  const stripped = candidate.replace(/\/+$/u, '');
  const withoutSuffix = stripped.endsWith(APP_API_SUFFIX)
    ? stripped.slice(0, -APP_API_SUFFIX.length)
    : stripped;
  return resolveBaseUrlWithAlignProtocol({ baseUrls: [withoutSuffix], preservePath: true }).url;
}
