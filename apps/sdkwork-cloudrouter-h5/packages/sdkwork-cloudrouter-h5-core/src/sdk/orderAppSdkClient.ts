import {
  createClient,
  type SdkworkAppClient,
  type SdkworkAppConfig,
} from '@sdkwork/order-app-sdk';

import { getCloudRouterTokenManager } from '../session/tokenManager.js';
import { resolveCloudRouterAppApiBaseUrl } from './runtimeEnv.js';

export type { SdkworkAppClient as SdkworkOrderAppClient };

let orderAppSdkClient: SdkworkAppClient | null = null;

/**
 * Builds the generated Order app SDK client bound to the shared TokenManager.
 *
 * The order cashier surface (`@sdkwork/order-mobile-react-orders`) receives
 * this client through `configureOrderMobileRuntime` at bootstrap, so the
 * generated SDK is constructed exactly once and every order/cashier call rides
 * the same dual-token session as the console client (`APP_SDK_INTEGRATION_SPEC`
 * section 4). The app API origin is shared with `@sdkwork/cloudrouter-app-sdk`:
 * both SDKs append their own `/app/v3/api` prefix.
 */
export function createCloudRouterH5OrderAppSdkClient(
  overrides: Partial<SdkworkAppConfig> = {},
): SdkworkAppClient {
  // No tenant/organization identity is declared here: identity projection
  // headers are forbidden on the wire (API_SPEC section 10.2) and the dual
  // tokens already carry the session identity.
  return createClient({
    baseUrl: resolveCloudRouterAppApiBaseUrl(),
    platform: 'H5',
    tokenManager: getCloudRouterTokenManager(),
    ...overrides,
  });
}

export function initCloudRouterH5OrderAppSdkClient(): SdkworkAppClient {
  orderAppSdkClient = createCloudRouterH5OrderAppSdkClient();
  return orderAppSdkClient;
}

export function getCloudRouterH5OrderAppSdkClient(): SdkworkAppClient {
  if (!orderAppSdkClient) return initCloudRouterH5OrderAppSdkClient();
  return orderAppSdkClient;
}

export function resetCloudRouterH5OrderAppSdkClient(): void {
  orderAppSdkClient = null;
}
