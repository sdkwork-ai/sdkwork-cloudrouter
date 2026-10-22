import { resolveBaseUrlWithAlignProtocol } from '@sdkwork/sdk-common';

export type CloudRouterH5BrowserOriginMode = 'same-origin' | 'cross-origin';

export interface CloudRouterH5RuntimeEnv {
  readonly environment: string;
  readonly deploymentProfile: string;
  readonly profileId: string;
  readonly browserOriginMode: CloudRouterH5BrowserOriginMode;
  readonly appApiBaseUrl: string | null;
  readonly backendApiBaseUrl: string | null;
  readonly openApiBaseUrl: string | null;
}

const DEFAULT_RUNTIME_ENV: CloudRouterH5RuntimeEnv = {
  environment: 'development',
  deploymentProfile: 'standalone',
  profileId: 'standalone.development',
  browserOriginMode: 'same-origin',
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

/**
 * The `/runtime-env.json` document resolved at bootstrap. It is the
 * deploy-time authority (BROWSER_RUNTIME_ENV_SPEC.md §3) and must win over any
 * build-time `import.meta.env` fallback: a JSON document has no Vite-inlined
 * copies, so `import.meta.env` can only ever carry defaults here.
 */
let loadedRuntimeEnv: CloudRouterH5RuntimeEnv | null = null;

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeBrowserOriginMode(
  source: Record<string, unknown>,
  deploymentProfile: string,
): CloudRouterH5BrowserOriginMode {
  const declared = readString(source, 'browserOriginMode');
  if (declared === 'same-origin' || declared === 'cross-origin') {
    return declared;
  }
  return deploymentProfile === 'standalone' ? 'same-origin' : 'cross-origin';
}

export function normalizeRuntimeEnv(source: Record<string, unknown> = {}): CloudRouterH5RuntimeEnv {
  const deploymentProfile = readString(source, 'deploymentProfile') ?? DEFAULT_RUNTIME_ENV.deploymentProfile;
  return {
    environment: readString(source, 'environment') ?? DEFAULT_RUNTIME_ENV.environment,
    deploymentProfile,
    profileId: readString(source, 'profileId') ?? DEFAULT_RUNTIME_ENV.profileId,
    // The document's declared origin mode is authoritative: a cloud
    // DEVELOPMENT document is `same-origin` (dev ingress), while a deployed
    // cloud document is `cross-origin` (BROWSER_RUNTIME_ENV_SPEC §2).
    browserOriginMode: normalizeBrowserOriginMode(source, deploymentProfile),
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
    browserOriginMode: document.browserOriginMode,
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
  loadedRuntimeEnv = resolved;
  publishRuntimeEnvGlobal(resolved);
  return resolved;
}

/**
 * Current runtime document: the `/runtime-env.json` document loaded at
 * bootstrap, falling back to build-time `import.meta.env` only before it is
 * loaded (and in tests). Reading `import.meta.env` after bootstrap would
 * silently replace a cloud deployment document with the standalone defaults
 * and point the generated SDK at the static page origin.
 */
export function resolveRuntimeEnv(): CloudRouterH5RuntimeEnv {
  if (loadedRuntimeEnv) {
    return loadedRuntimeEnv;
  }
  return normalizeRuntimeEnv(
    typeof import.meta === 'undefined'
      ? {}
      : ((import.meta.env ?? {}) as unknown as Record<string, unknown>),
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
  // Same-origin relative base (`/app/v3/api` in the dev and standalone
  // documents): the page origin fronts the canonical prefix, so the generated
  // SDK transport root is the empty same-origin base. Passing an empty string
  // through `resolveBaseUrl` would treat it as "no candidate", fall back to
  // deployment-mode derivation and fabricate the cloud-gateway dev port
  // (`<host>:3910`) that the dev ingress never serves
  // (BROWSER_RUNTIME_ENV_SPEC.md §5.1/§5.2).
  if (!withoutSuffix || withoutSuffix === '/') {
    return '';
  }
  if (withoutSuffix.startsWith('/')) {
    return withoutSuffix;
  }
  return resolveBaseUrlWithAlignProtocol({ baseUrls: [withoutSuffix], preservePath: true })
    .url
    .replace(/\/+$/u, '');
}
