import { createClient, type SdkworkCommunityAppClient } from '@sdkwork/community-app-sdk';

import { getCloudRouterTokenManager } from '../session/tokenManager.js';

export type { SdkworkCommunityAppClient };

/**
 * Community App SDK client owned by the mini program core.
 *
 * Feature packages consume this factory instead of importing the generated
 * package directly, keeping the generated transport behind one composition
 * boundary and sharing the root TokenManager.
 */
export function createCloudRouterMpCommunityAppSdkClient(
  baseUrl: string,
): SdkworkCommunityAppClient {
  return createClient({
    baseUrl,
    platform: 'mp-weixin',
    tokenManager: getCloudRouterTokenManager(),
  });
}
