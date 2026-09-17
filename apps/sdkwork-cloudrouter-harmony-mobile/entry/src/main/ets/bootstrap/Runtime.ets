import { AbilityContext } from '@kit.AbilityKit';
import { hilog } from '@kit.PerformanceAnalysisKit';

import { createCloudRouterHarmonyEnvironment, type CloudRouterHarmonyEnvironment } from './Environment';
import { registerCloudRouterHarmonyHostAdapters } from './HostAdapters';
import { createCloudRouterHarmonyIamRuntime } from './IamRuntime';
import { createCloudRouterHarmonySdkClients } from './SdkClients';
import { createCloudRouterHarmonyRoutes, type CloudRouterHarmonyRouteRegistration } from './Routes';

const DOMAIN: number = 0x0000;
const TAG: string = 'SdkworkCloudRouterBootstrap';

/**
 * Root composition entry.
 *
 * This module assembles the environment, SDK clients, IAM runtime, host
 * adapters, and route registry only. It must not own product business logic.
 */
export interface CloudRouterHarmonyRuntime {
  readonly environment: CloudRouterHarmonyEnvironment;
  readonly routes: CloudRouterHarmonyRouteRegistration[];
}

export function bootstrapCloudRouterHarmonyApp(
  context: AbilityContext,
): CloudRouterHarmonyRuntime | null {
  try {
    const environment: CloudRouterHarmonyEnvironment = createCloudRouterHarmonyEnvironment(
      createCloudRouterHarmonyRuntimeConfig(),
    );
    createCloudRouterHarmonySdkClients().initialize(
      environment.routerAppApiBaseUrl,
      environment.routerBackendApiBaseUrl,
    );
    createCloudRouterHarmonyIamRuntime();
    registerCloudRouterHarmonyHostAdapters();
    const routes: CloudRouterHarmonyRouteRegistration[] = createCloudRouterHarmonyRoutes();
    hilog.info(DOMAIN, TAG, 'bootstrap completed for profile %{public}s', environment.profileId);
    return { environment, routes };
  } catch (error) {
    hilog.error(DOMAIN, TAG, 'bootstrap failed: %{public}s', JSON.stringify(error));
    return null;
  }
}

/**
 * Runtime config projection.
 *
 * The build projects exactly one non-secret
 * `config/app/runtime-env.<deploymentProfile>.<environment>.json` resource
 * into the HAP. Until the resource projection step is wired into the hvigor
 * pipeline, bootstrap fails fast instead of falling back to a hand-written
 * environment.
 */
function createCloudRouterHarmonyRuntimeConfig(): Record<string, Object> {
  throw new Error(
    'Harmony runtime config projection is not wired yet: provide config/app/runtime-env.<profile-id>.json as an ArkTS resource module',
  );
}
