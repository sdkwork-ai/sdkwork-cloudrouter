//! Cloud Router host wiring for the account backend SDK.
//!
//! The account centre admin screens owned by `@sdkwork/account-pc-admin-accounts`
//! read the account backend API through the shared client owned by
//! `@sdkwork/account-service`. That client requires an Access-Token for non-open-api
//! calls, so without this wiring every request throws before dispatch and every
//! account centre page reports a load error.
//!
//! This mirrors `orderSdkHostWiring.ts`: the portal injects the same global
//! app-session token manager it already provides to every other backend SDK family,
//! plus the dependency base URL resolution used for the portal's own SDK family.

import {
  getSdkworkAccountBackendService,
  bootstrapSdkworkAccountBackendService,
} from '@sdkwork/account-service';
import {
  getCloudRouterGlobalTokenManager,
  resolveCloudRouterDependencyBackendBaseUrl,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';

import type { SdkworkAccountAdminClient } from '@sdkwork/account-pc-admin-accounts';

/**
 * Wires the shared account backend SDK client to the portal backend surface and the
 * portal's global app-session token manager. Called at application startup, before
 * the account centre module performs its first request.
 */
export function configureCloudRouterAccountBackendSdkClient(): void {
  bootstrapSdkworkAccountBackendService({
    baseUrl: resolveCloudRouterDependencyBackendBaseUrl('VITE_SDKWORK_ACCOUNT_BACKEND_API_BASE_URL'),
    platform: 'web-admin',
    tokenManager: getCloudRouterGlobalTokenManager(),
  });
}

/**
 * Adapts the shared backend service to the narrow surface the account admin
 * package consumes.
 *
 * The generated client nests the wallet surface under `commerce`; the admin package
 * deliberately depends on a small `wallet`-shaped interface so it never imports a
 * generated transport type. Both shapes are accepted here for that reason.
 */
export function getCloudRouterAccountAdminClient(): SdkworkAccountAdminClient {
  const service = getSdkworkAccountBackendService() as unknown as {
    commerce?: { wallet?: unknown };
    wallet?: unknown;
  };
  const wallet = service.commerce?.wallet ?? service.wallet;
  if (!wallet) {
    throw new Error('account backend service does not expose the wallet surface');
  }
  return { wallet } as SdkworkAccountAdminClient;
}
