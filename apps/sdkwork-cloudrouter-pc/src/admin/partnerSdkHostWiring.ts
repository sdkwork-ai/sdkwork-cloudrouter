//! Cloud Router host wiring for the SDKWork partner backend SDK client.
//!
//! The partner admin module (`@sdkwork/cloudrouter-pc-admin-partner`) queries
//! the partner API through the shared client owned by
//! `@sdkwork/partner-pc-admin-core`, which is created on first use WITHOUT
//! credentials unless the hosting application injects them via
//! `configurePartnerBackendSdkClient`. The generated partner backend SDK
//! requires an `Access-Token` for non-open-api calls, so without this wiring
//! every request throws before dispatch
//! (`non-open-api request requires Access-Token before request dispatch`) and
//! every partner page reports a load error.
//!
//! The portal injects the same global app-session token manager it already
//! provides to every other backend SDK family, plus the dependency base URL
//! resolution used for the portal's own `@sdkwork/partner-backend-sdk` client
//! (the partner admin API is served by the cloudrouter gateway under
//! under the backend API surface).

import { configurePartnerBackendSdkClient } from '@sdkwork/partner-pc-admin-core';
import {
  getCloudRouterGlobalTokenManager,
  resolveCloudRouterDependencyBackendBaseUrl,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';

/**
 * Wires the shared partner backend SDK client to the portal backend surface
 * and the portal's global app-session token manager. Must run before the
 * partner admin module performs its first request, so it is invoked at
 * application startup.
 */
export function configureCloudRouterPartnerBackendSdkClient(): void {
  configurePartnerBackendSdkClient({
    baseUrl: resolveCloudRouterDependencyBackendBaseUrl('VITE_SDKWORK_PARTNER_BACKEND_API_BASE_URL'),
    platform: 'web-admin',
    tokenManager: getCloudRouterGlobalTokenManager(),
  });
}
