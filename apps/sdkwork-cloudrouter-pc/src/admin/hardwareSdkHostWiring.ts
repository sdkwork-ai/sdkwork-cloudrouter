//! Cloud Router host wiring for the Smart Hardware Center.
//!
//! The hardware admin block (`@sdkwork/cloudrouter-pc-admin-hardware`) never
//! builds a transport client itself: the hosting portal injects the generated
//! `@sdkwork/aiot-backend-sdk` client into the AIoT core port, exactly like the
//! messaging, partner, and order host wirings. The AIoT management API is served
//! on the same backend API surface (`/backend/v3/api/iot/...`), so the client
//! reuses the portal backend base-url chain and the portal's global app-session
//! token manager.

import { configureAiotAdminBackendClient } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import {
  getCloudRouterGlobalTokenManager,
  getSdkworkAiotBackendSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';

/**
 * Binds the Smart Hardware Center to the portal backend surface and the global
 * app-session token manager. Must run before the first hardware admin request,
 * so it is invoked at application startup.
 */
export function configureCloudRouterHardwareBackendSdkClient(): void {
  configureAiotAdminBackendClient(getSdkworkAiotBackendSdkClient());
  void getCloudRouterGlobalTokenManager();
}
