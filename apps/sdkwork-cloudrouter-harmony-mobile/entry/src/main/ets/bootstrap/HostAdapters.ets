import {
  CloudRouterHarmonyHostAdapters,
  createHostAdapters,
} from '@sdkwork/sdkwork-cloudrouter-harmony-mobile-host';

/**
 * Host adapter registration.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 7. Feature
 * packages depend on these typed interfaces and never call HarmonyOS system
 * APIs directly.
 */

let hostAdapters: CloudRouterHarmonyHostAdapters | null = null;

export function registerCloudRouterHarmonyHostAdapters(): CloudRouterHarmonyHostAdapters {
  hostAdapters = createHostAdapters();
  return hostAdapters;
}

export function getCloudRouterHarmonyHostAdapters(): CloudRouterHarmonyHostAdapters {
  if (hostAdapters === null) {
    return registerCloudRouterHarmonyHostAdapters();
  }
  return hostAdapters;
}
