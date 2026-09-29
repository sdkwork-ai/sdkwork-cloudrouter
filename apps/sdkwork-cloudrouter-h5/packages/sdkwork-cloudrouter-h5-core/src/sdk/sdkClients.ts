import {
  createClient,
  type SdkworkAppClient,
  type SdkworkAppConfig,
} from '@sdkwork/cloudrouter-app-sdk';

import { getCloudRouterTokenManager } from '../session/tokenManager.js';
import { resolveCloudRouterAppApiBaseUrl } from './runtimeEnv.js';

export type { SdkworkAppClient, SdkworkAppConfig };

let appSdkClient: SdkworkAppClient | null = null;

/** Builds one generated app SDK client bound to the shared TokenManager. */
export function createCloudRouterH5AppSdkClient(
  overrides: Partial<SdkworkAppConfig> = {},
): SdkworkAppClient {
  // No `tenantId`/`organizationId` here: the app manifest binding is a server-side
  // deployment concern and identity projection headers are forbidden on the wire
  // (API_SPEC §10.2), so the client never declares a hardcoded tenant.
  return createClient({
    baseUrl: resolveCloudRouterAppApiBaseUrl(),
    platform: 'H5',
    tokenManager: getCloudRouterTokenManager(),
    ...overrides,
  });
}

export function initCloudRouterH5AppSdkClient(): SdkworkAppClient {
  appSdkClient = createCloudRouterH5AppSdkClient();
  return appSdkClient;
}

export function getCloudRouterH5AppSdkClient(): SdkworkAppClient {
  if (!appSdkClient) return initCloudRouterH5AppSdkClient();
  return appSdkClient;
}

export function resetCloudRouterH5AppSdkClient(): void {
  appSdkClient = null;
}
