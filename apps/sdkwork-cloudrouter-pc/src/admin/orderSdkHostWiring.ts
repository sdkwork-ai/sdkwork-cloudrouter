//! Cloud Router host wiring for the SDKWork order capability backend SDK.
//!
//! The trading center admin screens owned by `@sdkwork/order-pc-admin-trade`
//! query the order API through the shared client owned by
//! `@sdkwork/order-service`, which is created on first use WITHOUT credentials
//! unless the hosting application injects them via
//! `bootstrapSdkworkOrderBackendSdk`. The generated order backend SDK requires
//! an `Access-Token` for non-open-api calls, so without this wiring every
//! request throws before dispatch and every trading center page reports a load
//! error.
//!
//! The portal injects the same global app-session token manager it already
//! provides to every other backend SDK family, plus the dependency base URL
//! resolution used for the portal's own backend SDK family (the order admin
//! API is served by the cloudrouter gateway under the backend API surface).

import { bootstrapSdkworkOrderBackendSdk } from '@sdkwork/order-service';
import {
  getCloudRouterGlobalTokenManager,
  resolveCloudRouterDependencyBackendBaseUrl,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';

/**
 * Wires the shared order backend SDK client to the portal backend surface and
 * the portal's global app-session token manager. Must run before the trading
 * center admin module performs its first request, so it is invoked at
 * application startup.
 */
export function configureCloudRouterOrderBackendSdkClient(): void {
  bootstrapSdkworkOrderBackendSdk({
    baseUrl: resolveCloudRouterDependencyBackendBaseUrl('VITE_SDKWORK_ORDER_BACKEND_API_BASE_URL'),
    platform: 'web-admin',
    tokenManager: getCloudRouterGlobalTokenManager(),
  });
}
