import { SdkworkAppClient } from '@sdkwork/cloudrouter-app-sdk';
import { getCloudRouterTokenManager } from '../session/tokenManager.js';

let appSdkClient: SdkworkAppClient | null = null;
let appSdkBaseUrl: string | null = null;

/** Builds the generated app SDK client, sharing the single root token manager. */
export function createCloudRouterMpAppSdkClient(baseUrl: string): SdkworkAppClient {
  return new SdkworkAppClient({
    baseUrl,
    platform: 'mp-weixin',
    tokenManager: getCloudRouterTokenManager(),
  });
}

/** Caches one client per base URL so a profile switch cannot reuse a stale origin. */
export function getCloudRouterMpAppSdkClient(baseUrl: string): SdkworkAppClient {
  if (!appSdkClient || appSdkBaseUrl !== baseUrl) {
    appSdkClient = createCloudRouterMpAppSdkClient(baseUrl);
    appSdkBaseUrl = baseUrl;
  }
  return appSdkClient;
}

export function resetCloudRouterMpAppSdkClient(): void {
  appSdkClient = null;
  appSdkBaseUrl = null;
}
