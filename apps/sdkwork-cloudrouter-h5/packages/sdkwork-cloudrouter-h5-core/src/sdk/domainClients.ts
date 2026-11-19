import {
  createClient as createCommunityClient,
  type SdkworkCommunityAppClient,
} from '@sdkwork/community-app-sdk';
import { createDriveAppClient, type SdkworkDriveAppClient } from '@sdkwork/drive-app-sdk';
import { createClient as createFeedsClient, type SdkworkFeedsOpenClient } from '@sdkwork/feeds-sdk';

import { getCloudRouterTokenManager } from '../session/tokenManager.js';
import { resolveCloudRouterAppApiBaseUrl } from './runtimeEnv.js';

/**
 * Generated SDK clients for dependency-owned consumer domains.
 *
 * Capability packages must not construct generated SDK clients themselves
 * (APP_SDK_INTEGRATION_SPEC section 4); the H5 core owns the transport roots
 * and the shared dual-token session, and exposes one getter per client.
 */
const FEEDS_OPEN_API_PREFIX = '/feeds/v3/api';

function resolveFeedsOpenBaseUrl(): string {
  const configured = readBuildEnv('VITE_SDKWORK_FEEDS_OPEN_API_BASE_URL');
  const candidate = configured || FEEDS_OPEN_API_PREFIX;
  const stripped = candidate.replace(/\/+$/u, '');
  const withoutSuffix = stripped.endsWith(FEEDS_OPEN_API_PREFIX)
    ? stripped.slice(0, -FEEDS_OPEN_API_PREFIX.length)
    : stripped;
  // A same-origin path (standalone/dev) keeps the page origin; an absolute
  // gateway origin is passed through unchanged. The generated feeds client
  // appends `/feeds/v3/api` itself.
  if (!withoutSuffix || withoutSuffix === '/') {
    return resolveCloudRouterAppApiBaseUrl();
  }
  return withoutSuffix;
}

function readBuildEnv(key: string): string {
  const env = (import.meta as ImportMeta & { readonly env?: Record<string, unknown> }).env;
  const value = env?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

let communityClient: SdkworkCommunityAppClient | null = null;
let feedsClient: SdkworkFeedsOpenClient | null = null;
let driveClient: SdkworkDriveAppClient | null = null;

export function createCloudRouterH5CommunityAppSdkClient(): SdkworkCommunityAppClient {
  return createCommunityClient({
    baseUrl: resolveCloudRouterAppApiBaseUrl(),
    platform: 'H5',
    tokenManager: getCloudRouterTokenManager(),
  });
}

export function getCloudRouterH5CommunityAppSdkClient(): SdkworkCommunityAppClient {
  communityClient ??= createCloudRouterH5CommunityAppSdkClient();
  return communityClient;
}

export function getCloudRouterH5FeedsOpenSdkClient(): SdkworkFeedsOpenClient {
  feedsClient ??= createFeedsClient({
    baseUrl: resolveFeedsOpenBaseUrl(),
    platform: 'H5',
  });
  return feedsClient;
}

export function getCloudRouterH5DriveAppSdkClient(): SdkworkDriveAppClient {
  driveClient ??= createDriveAppClient({
    baseUrl: resolveCloudRouterAppApiBaseUrl(),
    platform: 'H5',
    tokenManager: getCloudRouterTokenManager(),
  });
  return driveClient;
}

export function resetCloudRouterH5DomainSdkClients(): void {
  communityClient = null;
  feedsClient = null;
  driveClient = null;
}
