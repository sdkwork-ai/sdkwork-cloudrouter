import {
  createCloudRouterH5ConsolePorts,
  initCloudRouterH5AppSdkClient,
  publishRuntimeEnvGlobal,
  resolveCloudRouterAppApiBaseUrl,
  resolveRuntimeEnv,
} from '@sdkwork/cloudrouter-h5-core/sdk';
import type { CloudRouterConsolePorts } from '@sdkwork/cloudrouter-sdk-ports';

export interface CloudRouterH5SdkBootstrap {
  readonly appApiBaseUrl: string;
  readonly consolePorts: CloudRouterConsolePorts;
}

/**
 * Constructs the generated app SDK client and the shared console ports once per
 * page load. `APP_SDK_INTEGRATION_SPEC.md` §4 requires the inventory to be built
 * before feature services are constructed.
 *
 * BROWSER_RUNTIME_ENV_SPEC.md §4: the runtime document is bridged to
 * `globalThis.SDKWORK_RUNTIME_ENV` BEFORE the first SDK client is created, so
 * shared SDK packages can resolve deployment mode and base URLs.
 */
export function bootstrapH5SdkClients(): CloudRouterH5SdkBootstrap {
  publishRuntimeEnvGlobal(resolveRuntimeEnv());
  const appApiBaseUrl = resolveCloudRouterAppApiBaseUrl();
  initCloudRouterH5AppSdkClient();
  return { appApiBaseUrl, consolePorts: createCloudRouterH5ConsolePorts() };
}
