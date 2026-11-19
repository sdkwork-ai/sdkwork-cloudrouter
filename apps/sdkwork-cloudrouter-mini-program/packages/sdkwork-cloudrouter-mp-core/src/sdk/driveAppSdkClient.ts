import {
  createClient,
  type SdkworkAppClient as DriveAppSdkClient,
} from '@sdkwork/drive-app-sdk';

import { getCloudRouterTokenManager } from '../session/tokenManager.js';

export type { DriveAppSdkClient };

/**
 * Drive App SDK client owned by the mini program core.
 *
 * Community media references are resolved to a short-lived download URL here,
 * so feature pages never speak raw HTTP or handle drive grants directly.
 */
export function createCloudRouterMpDriveAppSdkClient(
  baseUrl: string,
): DriveAppSdkClient {
  return createClient({
    baseUrl,
    platform: 'mp-weixin',
    tokenManager: getCloudRouterTokenManager(),
  });
}

export async function resolveCloudRouterDriveMediaUrl(
  client: DriveAppSdkClient,
  uri: string,
): Promise<string | null> {
  if (!uri.startsWith('drive://')) return uri;
  const matched = /^drive:\/\/spaces\/([^/]+)\/nodes\/([^/?#]+)/u.exec(uri);
  const nodeId = matched?.[2];
  if (!nodeId) return null;
  const grant = await client.drive.downloadGrants.create(nodeId, {
    requestedTtlSeconds: 900,
  });
  const record = grant as {
    downloadUrl?: unknown;
    data?: { downloadUrl?: unknown };
  };
  const downloadUrl = record.downloadUrl ?? record.data?.downloadUrl;
  return typeof downloadUrl === 'string' && downloadUrl.startsWith('http')
    ? downloadUrl
    : null;
}
