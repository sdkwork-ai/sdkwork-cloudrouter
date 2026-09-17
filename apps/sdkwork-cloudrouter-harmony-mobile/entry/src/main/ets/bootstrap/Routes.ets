import {
  type CloudRouterHarmonyRouteRegistration,
} from '@sdkwork/sdkwork-cloudrouter-harmony-mobile-shell';
import { consoleDashboardRouteContributions } from '@sdkwork/sdkwork-cloudrouter-harmony-mobile-console-dashboard';
import { consoleUsageRouteContributions } from '@sdkwork/sdkwork-cloudrouter-harmony-mobile-console-usage';
import { consoleApiKeysRouteContributions } from '@sdkwork/sdkwork-cloudrouter-harmony-mobile-console-api-keys';
import { consoleCatalogRouteContributions } from '@sdkwork/sdkwork-cloudrouter-harmony-mobile-console-catalog';

/**
 * Route/page registry assembly.
 *
 * Route ids are the canonical Cloud Router console route ids from
 * `@sdkwork/cloudrouter-contracts` and stay aligned with the PC, H5, mini
 * program, and Flutter roots (`APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md`
 * section 7). Physical Harmony page paths may differ from other platforms.
 */
export function createCloudRouterHarmonyRoutes(): CloudRouterHarmonyRouteRegistration[] {
  return [
    ...consoleDashboardRouteContributions,
    ...consoleUsageRouteContributions,
    ...consoleApiKeysRouteContributions,
    ...consoleCatalogRouteContributions,
  ];
}
