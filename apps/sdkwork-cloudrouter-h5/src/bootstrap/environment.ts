/**
 * H5 build/deploy environment selection.
 *
 * ``vite build`` is always invoked as ``vite --mode <deploymentProfile>.<environment>``
 * (``sdkwork-specs/tools/build-browser-client.mjs`` L383), so ``import.meta.env.MODE``
 * IS a profile id — not a bare lifecycle name. Selection therefore has to honour both
 * the ``<profile>.`` prefix and the full five-name lifecycle vocabulary (``demo``
 * included).
 *
 * Authority: ``sdkwork-specs/tools/vite-runtime-profile.mjs``
 * (``resolveViteRuntimeProfile``), ENVIRONMENT_SPEC.md §5.1.0.2. That module is a
 * Vite-config-time (Node) library, so it cannot be imported from browser source;
 * this file is the browser-safe counterpart and ``tests/h5-environment.test.mjs``
 * asserts the two agree on every profile id so the pair cannot drift.
 *
 * Drift history: a previous revision of this module compared ``MODE`` against a
 * four-name lifecycle set with no profile prefix, so every canonical build threw
 * before the first render (``main.tsx`` swallowed the rejection, producing a blank
 * page with a clean console).
 */

export type CloudRouterH5LifecycleEnvironment =
  | 'development'
  | 'test'
  | 'staging'
  | 'demo'
  | 'production';

export type CloudRouterH5DeploymentProfile = 'standalone' | 'cloud';

export interface CloudRouterH5HostEnvironment {
  readonly appApiBaseUrl: string;
  readonly deploymentProfile: CloudRouterH5DeploymentProfile;
  readonly lifecycleEnvironment: CloudRouterH5LifecycleEnvironment;
  readonly profileId: string;
}

/** Mirrors ``LIFECYCLE_ENVIRONMENTS`` in the specs authority (order included). */
export const CLOUDROUTER_H5_LIFECYCLE_ENVIRONMENTS: readonly CloudRouterH5LifecycleEnvironment[] =
  Object.freeze(['development', 'test', 'staging', 'demo', 'production']);

/** Mirrors ``DEPLOYMENT_PROFILES`` in the specs authority (order included). */
export const CLOUDROUTER_H5_DEPLOYMENT_PROFILES: readonly CloudRouterH5DeploymentProfile[] =
  Object.freeze(['standalone', 'cloud']);

const LIFECYCLE_ENVIRONMENTS = new Set<string>(CLOUDROUTER_H5_LIFECYCLE_ENVIRONMENTS);

/** Mirrors ``PROFILE_ID_PATTERN`` in the specs authority. */
const PROFILE_ID_PATTERN = /^(standalone|cloud)\.(development|test|staging|demo|production)$/u;

export interface CloudRouterH5ProfileId {
  readonly deploymentProfile: CloudRouterH5DeploymentProfile;
  readonly lifecycleEnvironment: CloudRouterH5LifecycleEnvironment;
  readonly profileId: string;
}

function readEnv(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Parses a canonical ``<deploymentProfile>.<environment>`` profile id, as carried by
 * ``import.meta.env.MODE`` and by the materialized ``runtime-env.json``. Returns
 * ``null`` for anything that is not a profile id.
 */
export function parseCloudRouterH5ProfileId(
  value: string | undefined,
): CloudRouterH5ProfileId | null {
  const match = PROFILE_ID_PATTERN.exec(String(value ?? '').trim().toLowerCase());
  if (!match) return null;
  const deploymentProfile = match[1] as CloudRouterH5DeploymentProfile;
  const lifecycleEnvironment = match[2] as CloudRouterH5LifecycleEnvironment;
  return {
    deploymentProfile,
    lifecycleEnvironment,
    profileId: `${deploymentProfile}.${lifecycleEnvironment}`,
  };
}

export function resolveLifecycleEnvironment(
  source: Record<string, unknown>,
): CloudRouterH5LifecycleEnvironment {
  const configured = readEnv(source, 'VITE_SDKWORK_CLOUDROUTER_H5_ENVIRONMENT');
  if (configured) {
    const normalized = configured.toLowerCase();
    if (LIFECYCLE_ENVIRONMENTS.has(normalized)) {
      return normalized as CloudRouterH5LifecycleEnvironment;
    }
    const fromProfileId = parseCloudRouterH5ProfileId(normalized);
    if (fromProfileId) return fromProfileId.lifecycleEnvironment;
    throw new Error(
      'VITE_SDKWORK_CLOUDROUTER_H5_ENVIRONMENT must name a lifecycle environment '
        + '(development, test, staging, demo, production) or a '
        + '<deploymentProfile>.<environment> profile id.',
    );
  }
  const mode = readEnv(source, 'MODE');
  const fromMode = parseCloudRouterH5ProfileId(mode);
  if (fromMode) return fromMode.lifecycleEnvironment;
  if (mode && LIFECYCLE_ENVIRONMENTS.has(mode.toLowerCase())) {
    return mode.toLowerCase() as CloudRouterH5LifecycleEnvironment;
  }
  return source.PROD === true || source.PROD === 'true' ? 'production' : 'development';
}

export function resolveDeploymentProfile(
  source: Record<string, unknown>,
): CloudRouterH5DeploymentProfile {
  const configured = readEnv(source, 'VITE_SDKWORK_CLOUDROUTER_H5_DEPLOYMENT_PROFILE')?.toLowerCase();
  if (configured === 'standalone' || configured === 'cloud') return configured;
  return parseCloudRouterH5ProfileId(readEnv(source, 'MODE'))?.deploymentProfile ?? 'standalone';
}

/**
 * The profile id the build selected. ``MODE`` already carries it, so it is preferred
 * over the synthesized fallback; only a plain ``vite dev`` (where ``MODE`` is a bare
 * lifecycle name) falls back to ``<deploymentProfile>.<environment>``.
 */
export function resolveProfileId(source: Record<string, unknown>): string {
  const configured = parseCloudRouterH5ProfileId(
    readEnv(source, 'VITE_SDKWORK_CLOUDROUTER_H5_PROFILE_ID'),
  );
  if (configured) return configured.profileId;
  const fromMode = parseCloudRouterH5ProfileId(readEnv(source, 'MODE'));
  if (fromMode) return fromMode.profileId;
  return `${resolveDeploymentProfile(source)}.${resolveLifecycleEnvironment(source)}`;
}

export function createHostEnvironment(
  source: Record<string, unknown>,
  appApiBaseUrl: string,
): CloudRouterH5HostEnvironment {
  return {
    appApiBaseUrl,
    deploymentProfile: resolveDeploymentProfile(source),
    lifecycleEnvironment: resolveLifecycleEnvironment(source),
    profileId: resolveProfileId(source),
  };
}
