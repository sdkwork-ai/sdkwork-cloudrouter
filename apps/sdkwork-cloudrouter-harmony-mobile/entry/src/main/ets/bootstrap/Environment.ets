/**
 * HarmonyOS runtime environment resolution.
 *
 * Authority: `config/app/runtime-env.<deploymentProfile>.<environment>.json`
 * (see `CONFIG_SPEC.md` and `ENVIRONMENT_SPEC.md`). The build projects exactly
 * one selected non-secret runtime JSON resource; this module only validates and
 * reads it. Base URLs in those payloads are derived from the enclosing
 * application authority `../etc/sdkwork.deployment.config.json`.
 */

export type CloudRouterHarmonyRuntimeTarget = 'harmony-native';

export interface CloudRouterHarmonyEnvironment {
  readonly environment: string;
  readonly deploymentProfile: string;
  readonly profileId: string;
  readonly runtimeTarget: CloudRouterHarmonyRuntimeTarget;
  readonly routerAppApiBaseUrl: string;
  readonly routerBackendApiBaseUrl: string;
  readonly appbaseAppApiBaseUrl: string;
  readonly appbaseLoginUrl: string;
  readonly applicationPublicHttpUrl: string;
}

const APP_API_SUFFIX: string = '/app/v3/api';
const BACKEND_API_SUFFIX: string = '/backend/v3/api';

function requireNonEmpty(value: string | undefined, key: string): string {
  const normalized: string = value === undefined ? '' : value.trim();
  if (normalized.length === 0) {
    throw new Error(key + ' is required by the HarmonyOS runtime config');
  }
  return normalized;
}

function stripTrailingSlashes(value: string): string {
  let normalized: string = value.trim();
  while (normalized.endsWith('/')) {
    normalized = normalized.slice(0, normalized.length - 1);
  }
  return normalized;
}

function normalizeSuffixedBaseUrl(value: string, key: string, suffix: string): string {
  const normalized: string = stripTrailingSlashes(requireNonEmpty(value, key));
  if (!normalized.endsWith(suffix)) {
    throw new Error(key + ' must end with ' + suffix);
  }
  const prefix: string = normalized.slice(0, normalized.length - suffix.length);
  if (prefix.endsWith(suffix)) {
    throw new Error(key + ' must contain ' + suffix + ' exactly once');
  }
  return normalized;
}

export function normalizeCloudRouterAppApiBaseUrl(value: string): string {
  return normalizeSuffixedBaseUrl(value, 'router.appApiBaseUrl', APP_API_SUFFIX);
}

export function normalizeCloudRouterBackendApiBaseUrl(value: string): string {
  return normalizeSuffixedBaseUrl(value, 'router.backendApiBaseUrl', BACKEND_API_SUFFIX);
}

export function createCloudRouterHarmonyEnvironment(
  runtimeConfig: Record<string, Object>,
): CloudRouterHarmonyEnvironment {
  const router: Record<string, Object> = runtimeConfig.router as Record<string, Object>;
  const appbase: Record<string, Object> = runtimeConfig.appbase as Record<string, Object>;
  const metadata: Record<string, Object> = runtimeConfig.metadata as Record<string, Object>;
  const target: string = requireNonEmpty(runtimeConfig.runtimeTarget as string, 'runtimeTarget');
  if (target !== 'harmony-native') {
    throw new Error('runtimeTarget must be harmony-native for this application root');
  }
  return {
    environment: requireNonEmpty(runtimeConfig.environment as string, 'environment'),
    deploymentProfile: requireNonEmpty(runtimeConfig.deploymentProfile as string, 'deploymentProfile'),
    profileId: requireNonEmpty(runtimeConfig.profileId as string, 'profileId'),
    runtimeTarget: 'harmony-native',
    routerAppApiBaseUrl: normalizeCloudRouterAppApiBaseUrl(router.appApiBaseUrl as string),
    routerBackendApiBaseUrl: normalizeCloudRouterBackendApiBaseUrl(router.backendApiBaseUrl as string),
    appbaseAppApiBaseUrl: requireNonEmpty(appbase.appApiBaseUrl as string, 'appbase.appApiBaseUrl'),
    appbaseLoginUrl: requireNonEmpty(appbase.loginUrl as string, 'appbase.loginUrl'),
    applicationPublicHttpUrl: requireNonEmpty(metadata.applicationPublicHttpUrl as string, 'metadata.applicationPublicHttpUrl'),
  };
}
