import { useEffect, useState } from 'react';
import type { DriveUploaderBlobLike, DriveUploaderUploadResult } from '@sdkwork/drive-app-sdk';

export type { DriveUploaderBlobLike };
import type { CloudRouterMediaResource } from './media-resource.ts';
import { readMediaResourceUrl } from './media-resource.ts';
import { getSdkworkDriveOpenSdkClient } from './sdk-clients.ts';

const DRIVE_MEDIA_URL_TTL_SECONDS = 3600;
const DRIVE_MEDIA_URL_REFRESH_MS = 25 * 60 * 1000;
const DRIVE_MEDIA_URI_PREFIX = 'drive://spaces/';

interface CachedDriveMediaUrl {
  url: string;
  expiresAtEpochMs: number;
}

const driveMediaUrlCache = new Map<string, CachedDriveMediaUrl>();

export function uploadResultToDriveMediaResource(
  result: DriveUploaderUploadResult,
): CloudRouterMediaResource {
  const uploadItem = result.uploadItem;
  return {
    id: uploadItem.nodeId,
    kind: 'image',
    source: 'drive',
    uri: `${DRIVE_MEDIA_URI_PREFIX}${uploadItem.spaceId}/nodes/${uploadItem.nodeId}`,
    fileName: uploadItem.originalFileName,
    mimeType: uploadItem.contentType,
    sizeBytes: uploadItem.contentLength,
    metadata: {
      drive: {
        spaceId: uploadItem.spaceId,
        nodeId: uploadItem.nodeId,
      },
    },
  };
}

export function attachDriveShareToken(
  media: CloudRouterMediaResource,
  token: string,
): CloudRouterMediaResource {
  const metadata = media.metadata ?? {};
  return {
    ...media,
    metadata: {
      ...metadata,
      drive: {
        ...(typeof metadata.drive === 'object' && metadata.drive !== null ? metadata.drive : {}),
        shareToken: token,
      },
    },
  };
}

export function readDriveShareToken(media: CloudRouterMediaResource | undefined): string {
  if (!media || media.source !== 'drive') {
    return '';
  }
  const driveMetadata = media.metadata?.drive;
  if (!driveMetadata || typeof driveMetadata !== 'object') {
    return '';
  }
  const token = (driveMetadata as Record<string, unknown>).shareToken;
  return typeof token === 'string' ? token : '';
}

export function isDriveMediaResource(media: CloudRouterMediaResource | undefined): boolean {
  return Boolean(media && media.source === 'drive');
}

export async function resolveDriveMediaUrl(
  media: CloudRouterMediaResource | undefined,
): Promise<string> {
  if (!media) {
    return '';
  }
  if (!isDriveMediaResource(media)) {
    return readMediaResourceUrl(media);
  }
  const token = readDriveShareToken(media);
  if (!token) {
    return '';
  }
  const cached = driveMediaUrlCache.get(token);
  if (cached && cached.expiresAtEpochMs > Date.now() + DRIVE_MEDIA_URL_REFRESH_MS) {
    return cached.url;
  }
  const client = getSdkworkDriveOpenSdkClient();
  const result = await client.drive.openShareLinksDownloadUrlsCreate(token, {
    requestedTtlSeconds: DRIVE_MEDIA_URL_TTL_SECONDS,
  });
  const download = result.data.item;
  const expiresAtEpochMs = download.expiresAtEpochMs
    ? Number(download.expiresAtEpochMs)
    : Date.now() + DRIVE_MEDIA_URL_TTL_SECONDS * 1000;
  driveMediaUrlCache.set(token, { url: download.downloadUrl, expiresAtEpochMs });
  return download.downloadUrl;
}

export function useResolvedMediaResourceUrl(
  media: CloudRouterMediaResource | undefined,
): string {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = () => {
      resolveDriveMediaUrl(media)
        .then((nextUrl) => {
          if (active) {
            setUrl(nextUrl);
          }
        })
        .catch(() => {
          if (active) {
            setUrl('');
          }
        });
    };
    refresh();
    const timer = window.setInterval(refresh, DRIVE_MEDIA_URL_REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [media]);
  return url;
}
