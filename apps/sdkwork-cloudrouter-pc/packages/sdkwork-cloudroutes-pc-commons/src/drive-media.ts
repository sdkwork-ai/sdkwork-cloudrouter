import { useEffect, useState } from 'react';
import { uuid } from '@sdkwork/utils/id';
import type { DriveUploaderBlobLike, DriveUploaderUploadResult } from '@sdkwork/drive-app-sdk';

export type { DriveUploaderBlobLike };
import type { CloudRouterMediaKind, CloudRouterMediaResource } from './media-resource.ts';
import { readMediaResourceUrl, toExternalUrlMediaResource } from './media-resource.ts';
import { getSdkworkDriveAppSdkClient, getSdkworkDriveOpenSdkClient } from './sdk-clients.ts';

const DRIVE_MEDIA_URL_TTL_SECONDS = 3600;
const DRIVE_MEDIA_URL_REFRESH_MS = 25 * 60 * 1000;
const DRIVE_MEDIA_URI_PREFIX = 'drive://spaces/';

interface CachedDriveMediaUrl {
  url: string;
  expiresAtEpochMs: number;
}

const driveMediaUrlCache = new Map<string, CachedDriveMediaUrl>();

export interface UploadResultToDriveMediaOptions {
  /** 显式指定媒体种类；未提供时按 Drive 返回的 contentTypeGroup / contentType 推导。 */
  kind?: CloudRouterMediaKind;
  /** 统一上传目录归类，便于运营侧按类别检索 drive 引用。 */
  category?: string;
  /** 统一上传目录用途标识。 */
  slot?: string;
}

export function uploadResultToDriveMediaResource(
  result: DriveUploaderUploadResult,
  options: UploadResultToDriveMediaOptions = {},
): CloudRouterMediaResource {
  const uploadItem = result.uploadItem;
  const kind = options.kind ?? inferDriveMediaKind(uploadItem.contentTypeGroup, uploadItem.contentType);
  return {
    id: uploadItem.nodeId,
    kind,
    source: 'drive',
    uri: `${DRIVE_MEDIA_URI_PREFIX}${uploadItem.spaceId}/nodes/${uploadItem.nodeId}`,
    fileName: uploadItem.originalFileName,
    mimeType: uploadItem.contentType,
    sizeBytes: uploadItem.contentLength,
    metadata: {
      drive: {
        spaceId: uploadItem.spaceId,
        nodeId: uploadItem.nodeId,
        ...(uploadItem.storageProviderId ? { storageProviderId: uploadItem.storageProviderId } : {}),
        ...(uploadItem.scene ? { scene: uploadItem.scene } : {}),
        ...(uploadItem.source ? { source: uploadItem.source } : {}),
        ...(uploadItem.uploadProfileCode ? { uploadProfileCode: uploadItem.uploadProfileCode } : {}),
        ...(uploadItem.contentTypeGroup ? { contentTypeGroup: uploadItem.contentTypeGroup } : {}),
      },
      ...(options.category ? { uploadCategory: options.category } : {}),
      ...(options.slot ? { uploadSlot: options.slot } : {}),
    },
  };
}

/** 由 Drive 的 contentTypeGroup / contentType 推导媒体种类。 */
export function inferDriveMediaKind(
  contentTypeGroup: string | undefined,
  contentType: string | undefined,
): CloudRouterMediaKind {
  const group = (contentTypeGroup ?? '').trim().toLowerCase();
  if (group === 'image' || group === 'video' || group === 'audio') {
    return group;
  }
  if (group === 'text' || group === 'document' || group === 'archive' || group === 'binary') {
    return 'document';
  }
  const mime = (contentType ?? '').trim().toLowerCase();
  if (mime.startsWith('image/')) {
    return 'image';
  }
  if (mime.startsWith('video/')) {
    return 'video';
  }
  if (mime.startsWith('audio/')) {
    return 'audio';
  }
  return 'document';
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

/** 从 drive 媒体引用中解出空间与节点标识。 */
export function readDriveNodeRef(
  media: CloudRouterMediaResource | undefined,
): { spaceId: string; nodeId: string } | undefined {
  if (!media || media.source !== 'drive') {
    return undefined;
  }
  const driveMetadata = media.metadata?.drive;
  const record = driveMetadata && typeof driveMetadata === 'object'
    ? (driveMetadata as Record<string, unknown>)
    : undefined;
  const metadataSpaceId = typeof record?.spaceId === 'string' ? record.spaceId : '';
  const metadataNodeId = typeof record?.nodeId === 'string' ? record.nodeId : '';
  if (metadataSpaceId && metadataNodeId) {
    return { spaceId: metadataSpaceId, nodeId: metadataNodeId };
  }
  return parseDriveMediaUri(media.uri ?? '');
}

/** 解析 `drive://spaces/<spaceId>/nodes/<nodeId>` 形式的引用。 */
export function parseDriveMediaUri(
  uri: string,
): { spaceId: string; nodeId: string } | undefined {
  if (!uri.startsWith(DRIVE_MEDIA_URI_PREFIX)) {
    return undefined;
  }
  const segments = uri.slice(DRIVE_MEDIA_URI_PREFIX.length).split('/');
  const spaceId = segments[0] ?? '';
  const nodeId = segments[2] ?? '';
  if (!spaceId || segments[1] !== 'nodes' || !nodeId) {
    return undefined;
  }
  return { spaceId, nodeId };
}

/**
 * 读取业务侧持久化的媒体字段。
 *
 * 兼容三种形态：Drive 媒体对象、`drive://` 引用字符串（业务表仅能存字符串时使用）、
 * 以及历史遗留的普通外链 URL。
 */
export function readDriveMediaReference(
  value: unknown,
  kind: CloudRouterMediaKind = 'image',
): CloudRouterMediaResource | undefined {
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }
    const ref = parseDriveMediaUri(normalized);
    if (ref) {
      return {
        kind,
        source: 'drive',
        uri: normalized,
        metadata: { drive: { ...ref } },
      };
    }
    return toExternalUrlMediaResource(normalized, kind);
  }
  return readDriveMediaResource(value, kind);
}

function readDriveMediaResource(
  value: unknown,
  kind: CloudRouterMediaKind,
): CloudRouterMediaResource | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.kind === 'string' && typeof record.source === 'string') {
    return value as CloudRouterMediaResource;
  }
  const uri = typeof record.uri === 'string' ? record.uri : '';
  const url = readMediaResourceUrl(value);
  if (uri.startsWith(DRIVE_MEDIA_URI_PREFIX)) {
    return readDriveMediaReference(uri, kind);
  }
  return url ? toExternalUrlMediaResource(url, kind) : undefined;
}

/**
 * 序列化为可持久化到「仅接受字符串」的业务字段的引用。
 *
 * Drive 分享链接只提供一次性 token、下载地址带 TTL，因此这里持久化稳定的
 * `drive://` 引用；读取时通过 {@link readDriveMediaReference} 还原。
 */
export function toDriveMediaReference(
  media: CloudRouterMediaResource | undefined,
): string | undefined {
  if (!media) {
    return undefined;
  }
  if (isDriveMediaResource(media)) {
    return media.uri ?? undefined;
  }
  return readMediaResourceUrl(media) || undefined;
}

const driveNodeShareTokenCache = new Map<string, string>();

/** 无预存 token 时为节点补建只读分享链接，使 drive 引用可独立解析。 */
async function ensureDriveShareToken(media: CloudRouterMediaResource): Promise<string> {
  const existing = readDriveShareToken(media);
  if (existing) {
    return existing;
  }
  const ref = readDriveNodeRef(media);
  if (!ref) {
    return '';
  }
  const cached = driveNodeShareTokenCache.get(ref.nodeId);
  if (cached) {
    return cached;
  }
  const client = getSdkworkDriveAppSdkClient();
  const shareLink = await client.drive.shareLinks.create(ref.nodeId, {
    id: uuid(),
    role: 'reader',
  });
  driveNodeShareTokenCache.set(ref.nodeId, shareLink.token);
  return shareLink.token;
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
  const token = await ensureDriveShareToken(media);
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
