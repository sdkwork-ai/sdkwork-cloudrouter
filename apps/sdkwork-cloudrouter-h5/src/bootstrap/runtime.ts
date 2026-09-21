import {
  loadRuntimeEnv,
  resolveCloudRouterAppApiBaseUrl,
} from '@sdkwork/cloudrouter-h5-core/sdk';

import { createHostEnvironment } from './environment.js';
import { registerHostAdapters } from './hostAdapters.js';
import { bootstrapIamRuntime } from './iamRuntime.js';
import { bootstrapH5SdkClients } from './sdkClients.js';
import { configureConsoleRuntime } from '../providers/AppProviders.js';

/**
 * Single application bootstrap: environment selection, host adapters, the IAM
 * runtime, the generated app SDK client, and the console ports, in the order
 * required by `APP_SDK_INTEGRATION_SPEC.md` §4.
 *
 * BROWSER_RUNTIME_ENV_SPEC.md §3/§4: `/runtime-env.json` is the deploy-time
 * authority for profile identity and SDK bases. It is loaded — which also
 * publishes the `SDKWORK_RUNTIME_ENV` bridge — before any SDK client is
 * constructed, so a deployed artifact never falls back to build-time defaults.
 */
export async function bootstrapH5Application(): Promise<void> {
  const runtimeEnv = await loadRuntimeEnv();
  const environment = createHostEnvironment(
    import.meta.env as unknown as Record<string, unknown>,
    resolveCloudRouterAppApiBaseUrl(runtimeEnv),
  );
  registerHostAdapters();
  bootstrapIamRuntime();
  const sdk = bootstrapH5SdkClients();
  configureConsoleRuntime({
    platform: 'h5',
    environment: environment.lifecycleEnvironment,
    profileId: environment.profileId,
    ports: sdk.consolePorts,
  });
}
