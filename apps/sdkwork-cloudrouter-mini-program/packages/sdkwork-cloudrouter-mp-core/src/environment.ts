import { resolveBaseUrlWithAlignProtocol } from '@sdkwork/sdk-common';

/** Generated SDK appends this prefix itself, so an origin must not carry it. */
const APP_API_SUFFIX = '/app/v3/api';

export type CloudRouterMpLifecycleEnvironment = 'development' | 'test' | 'staging' | 'production';

/**
 * Mini-program runtime environment.
 *
 * A WeChat mini program has no `import.meta.env`, so the values are materialized
 * from `config/mini-program/runtime-env.<profile>.<environment>.json` into
 * `src/runtime/runtime-env.js` and injected on `globalThis` before `App()` runs.
 * Keys follow `ENVIRONMENT_SPEC.md` so every client root reads the same names.
 */
export interface CloudRouterMpRuntimeEnv {
  readonly appApiBaseUrl: string;
  readonly lifecycleEnvironment: CloudRouterMpLifecycleEnvironment;
  readonly profileId: string;
}

const LIFECYCLE_ENVIRONMENTS = new Set<CloudRouterMpLifecycleEnvironment>([
  'development',
  'test',
  'staging',
  'production',
]);

/** Runtime env surface injected by the bootstrap bundle. */
export interface CloudRouterMpRuntimeEnvSource {
  readonly SDKWORK_ENVIRONMENT?: unknown;
  readonly SDKWORK_PROFILE_ID?: unknown;
  readonly SDKWORK_CLOUDROUTER_ROUTER_APP_API_BASE_URL?: unknown;
}

function readEnv(
  source: CloudRouterMpRuntimeEnvSource,
  key: keyof CloudRouterMpRuntimeEnvSource,
): string | undefined {
  const value = source[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

function defaultRuntimeEnvSource(): CloudRouterMpRuntimeEnvSource {
  return globalThis as unknown as CloudRouterMpRuntimeEnvSource;
}

/** Resolves the runtime environment of the running mini program. */
export function resolveRuntimeEnv(
  source: CloudRouterMpRuntimeEnvSource = defaultRuntimeEnvSource(),
): CloudRouterMpRuntimeEnv {
  const lifecycle = readEnv(source, 'SDKWORK_ENVIRONMENT') ?? 'production';
  const appApiBaseUrl = readEnv(source, 'SDKWORK_CLOUDROUTER_ROUTER_APP_API_BASE_URL');
  if (!appApiBaseUrl) {
    throw new Error(
      'Cloud Router mini program requires SDKWORK_CLOUDROUTER_ROUTER_APP_API_BASE_URL in the runtime environment.',
    );
  }
  return {
    appApiBaseUrl: resolveCloudRouterAppApiBaseUrl(appApiBaseUrl),
    lifecycleEnvironment: LIFECYCLE_ENVIRONMENTS.has(lifecycle as CloudRouterMpLifecycleEnvironment)
      ? (lifecycle as CloudRouterMpLifecycleEnvironment)
      : 'production',
    profileId: readEnv(source, 'SDKWORK_PROFILE_ID') ?? 'standalone.production',
  };
}

/**
 * Resolves the generated app SDK origin.
 *
 * The generated SDK appends `/app/v3/api` itself (`appApiPath`), so the value
 * handed to the client must be the bare origin. ENVIRONMENT_SPEC.md section 6.3
 * protocol adaptation is pinned to `https`: WeChat only loads request domains
 * over TLS, and a native request has no page protocol to align to. Host, port
 * and path are preserved.
 */
export function resolveCloudRouterAppApiBaseUrl(candidate: string): string {
  const stripped = candidate.replace(/\/+$/u, '');
  const withoutSuffix = stripped.endsWith(APP_API_SUFFIX)
    ? stripped.slice(0, -APP_API_SUFFIX.length)
    : stripped;
  return resolveBaseUrlWithAlignProtocol({
    baseUrls: [withoutSuffix],
    preservePath: true,
    protocol: 'https',
  }).url;
}
