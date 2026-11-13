import {
  createCloudRouterH5ConsolePorts,
  initCloudRouterH5AppSdkClient,
  initCloudRouterH5OrderAppSdkClient,
  resolveCloudRouterAppApiBaseUrl,
} from '@sdkwork/cloudrouter-h5-core/sdk';
import { configureCloudRouterOrderRuntime } from '@sdkwork/cloudrouter-h5-orders/runtime';
import { configureCloudRouterPlayground } from '@sdkwork/cloudrouter-h5-playground';
import { configureCloudRouterIm } from '@sdkwork/cloudrouter-h5-messages';
import { resolveConsoleLocale } from '@sdkwork/cloudrouter-h5-i18n';
import type { CloudRouterConsolePorts } from '@sdkwork/cloudrouter-sdk-ports';

export interface CloudRouterH5SdkBootstrap {
  readonly appApiBaseUrl: string;
  readonly consolePorts: CloudRouterConsolePorts;
}

/**
 * Constructs the generated app SDK clients and the shared console ports once per
 * page load. `APP_SDK_INTEGRATION_SPEC.md` §4 requires the inventory to be built
 * before feature services are constructed.
 *
 * The Order app SDK client is the same dual-token session as the console
 * client; it is injected into the order-owned mobile runtime so the cashier
 * surface (`@sdkwork/cloudrouter-h5-orders`) never constructs its own client.
 *
 * BROWSER_RUNTIME_ENV_SPEC.md §4: `loadRuntimeEnv()` (bootstrap/runtime.ts) has
 * already published the `/runtime-env.json` document to
 * `globalThis.SDKWORK_RUNTIME_ENV`; the SDK base is resolved from that loaded
 * document. Re-publishing `resolveRuntimeEnv()` here would overwrite a cloud
 * document with the standalone build-time defaults.
 */
export function bootstrapH5SdkClients(): CloudRouterH5SdkBootstrap {
  const appApiBaseUrl = resolveCloudRouterAppApiBaseUrl();
  initCloudRouterH5AppSdkClient();
  configureCloudRouterOrderRuntime({ client: initCloudRouterH5OrderAppSdkClient() });
  // Messages (SDKWork IM H5) shares the same dual-token session and API origin.
  configureCloudRouterIm();
  // The Playground is an owned Agents H5 capability; bind it to the same dual-
  // token session and API base as the console/order clients.
  configureCloudRouterPlayground({ locale: resolveConsoleLocale() });
  return { appApiBaseUrl, consolePorts: createCloudRouterH5ConsolePorts() };
}
