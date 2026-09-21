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

/**
 * Canonical browser bridge global (BROWSER_RUNTIME_ENV_SPEC.md §4).
 *
 * Shared SDK packages resolve deployment mode and base URLs from
 * `readRuntimeEnv`, whose browser channels (dynamic `import.meta.env` access,
 * `process.env`) are unreliable in bundled apps. The surface therefore has to
 * publish its runtime document to `globalThis.SDKWORK_RUNTIME_ENV` before the
 * first SDK client call, including the deployment-profile aliases the shared
 * resolver inspects.
 */
const RUNTIME_ENV_GLOBAL_KEY = 'SDKWORK_RUNTIME_ENV';

declare global {
  // eslint-disable-next-line no-var
  var SDKWORK_RUNTIME_ENV: Record<string, unknown> | undefined;
}

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

/**
 * Publishes a runtime document to the canonical browser global
 * (BROWSER_RUNTIME_ENV_SPEC.md §4). The document itself carries
 * `deploymentProfile`; the `VITE_SDKWORK_DEPLOY*` aliases are derived here
 * because the shared resolver looks for them under their Vite-prefixed names
 * and a JSON document has no Vite-inlined copies.
 */
export function publishRuntimeEnvGlobal(
  document: CloudRouterH5RuntimeEnv,
  target: Record<string, unknown> = globalThis as unknown as Record<string, unknown>,
): void {
  target[RUNTIME_ENV_GLOBAL_KEY] = Object.freeze({
    environment: document.environment,
    deploymentProfile: document.deploymentProfile,
    profileId: document.profileId,
    browserOriginMode:
      document.deploymentProfile === 'standalone' ? 'same-origin' : 'cross-origin',
    appApiBaseUrl: document.appApiBaseUrl ?? undefined,
    backendApiBaseUrl: document.backendApiBaseUrl ?? undefined,
    openApiBaseUrl: document.openApiBaseUrl ?? undefined,
    SDKWORK_DEPLOYMENT_PROFILE: document.deploymentProfile,
    SDKWORK_DEPLOY_MODE: document.deploymentProfile,
    VITE_SDKWORK_DEPLOYMENT_PROFILE: document.deploymentProfile,
    VITE_SDKWORK_DEPLOY_MODE: document.deploymentProfile,
  });
}

export async function loadRuntimeEnv(fetchImpl: typeof fetch = fetch): Promise<CloudRouterH5RuntimeEnv> {
  let resolved: CloudRouterH5RuntimeEnv;
  try {
    const response = await fetchImpl(RUNTIME_ENV_URL, { cache: 'no-store' });
    resolved = response.ok
      ? normalizeRuntimeEnv((await response.json()) as Record<string, unknown>)
      : DEFAULT_RUNTIME_ENV;
  } catch {
    resolved = DEFAULT_RUNTIME_ENV;
  }
  // §4: the bridge must exist before the first SDK client call, so it is
  // published here (the single point where the document is resolved) rather
  // than left to each caller.
  publishRuntimeEnvGlobal(resolved);
  return resolved;
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
