//! Cloud Router host wiring for the messaging notify admin pages.
//!
//! The messaging admin module (`@sdkwork/messaging-pc-admin-notify`) never
//! constructs transport clients itself; the hosting portal injects the
//! generated `@sdkwork/messaging-backend-sdk` client through
//! `configureMessagingBackendSdkClient` (same pattern as the partner and log
//! host wirings). The messaging admin API is served by the cloudrouter
//! gateway under the backend API surface, so the client uses the same backend
//! base URL chain and the portal's global app-session token manager.

import { configureMessagingBackendSdkClient } from '@sdkwork/messaging-pc-admin-notify';
import {
  getCloudRouterGlobalTokenManager,
  getSdkworkMessagingBackendSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';

/**
 * Wires the messaging notify admin pages to the portal backend surface and
 * the portal's global app-session token manager. Must run before the
 * messaging admin module performs its first request, so it is invoked at
 * application startup.
 */
export function configureCloudRouterMessagingBackendSdkClient(): void {
  configureMessagingBackendSdkClient(getSdkworkMessagingBackendSdkClient());
  void getCloudRouterGlobalTokenManager();
}
