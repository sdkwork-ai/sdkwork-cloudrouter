import { uuid } from '@sdkwork/utils/id';
import type {
  DriveUploaderBlobLike,
  DriveUploaderProfile,
  DriveUploaderProgress,
} from '@sdkwork/drive-app-sdk';

import type { CloudRouterMediaResource } from '../media-resource.ts';
import { attachDriveShareToken, uploadResultToDriveMediaResource } from '../drive-media.ts';
import { getSdkworkDriveAppSdkClient } from '../sdk-clients.ts';
import {
  assertCloudRouterUploadMimeAllowed,
  assertCloudRouterUploadSizeAllowed,
  getCloudRouterUploadCategory,
  getCloudRouterUploadSlot,
  isCloudRouterUploadVisibilityPublic,
  resolveCloudRouterUploadRetention,
  type CloudRouterUploadCategory,
  type CloudRouterUploadRetention,
  type CloudRouterUploadSlot,
  type CloudRouterUploadSlotCode,
} from './upload-catalog.ts';

/** 可上传的文件对象。浏览器 `File`、`Blob` 与 Tauri 侧 blob 适配器均满足该形状。 */
export type CloudRouterUploadFileLike = DriveUploaderBlobLike & {
  readonly name?: string;
  readonly type?: string;
};

export interface CloudRouterUploadProgress {
  phase: DriveUploaderProgress['status'];
  uploadedBytes: number;
  totalBytes: number;
  /** 0-100 整数百分比。 */
  percent: number;
  uploadedPartsCount: number;
  totalParts: number;
}

export interface CloudRouterUploadFileInput {
  /** 上传用途；必须是统一上传目录中登记的 slot。 */
  slot: CloudRouterUploadSlotCode;
  file: CloudRouterUploadFileLike;
  /** 覆盖默认业务资源 ID（例如具体实体主键）。 */
  appResourceId?: string;
  /** 显式指定目标空间；缺省时由 Drive 按 scene 自动解析或创建。 */
  spaceId?: string;
  parentNodeId?: string;
  /** 团队类资源需要携带组织上下文。 */
  organizationId?: string;
  fileName?: string;
  contentType?: string;
  uploadProfileCode?: DriveUploaderProfile;
  retention?: CloudRouterUploadRetention;
  /** 覆盖是否创建只读分享链接；缺省跟随归类可见性。 */
  shareLink?: 'none' | 'reader';
  onProgress?: (progress: CloudRouterUploadProgress) => void;
  signal?: AbortSignal;
}

export interface CloudRouterUploadedDriveRef {
  spaceId: string;
  nodeId: string;
  uploadItemId: string;
  uploadSessionId: string;
  storageProviderId?: string;
  /** 仅当创建了只读分享链接时存在。 */
  shareToken?: string;
}

export interface CloudRouterUploadedFile {
  slot: CloudRouterUploadSlot;
  category: CloudRouterUploadCategory;
  media: CloudRouterMediaResource;
  drive: CloudRouterUploadedDriveRef;
  file: {
    name: string;
    contentType: string;
    sizeBytes: number;
  };
}

function toProgress(progress: DriveUploaderProgress): CloudRouterUploadProgress {
  const totalBytes = progress.totalBytes > 0 ? progress.totalBytes : 0;
  const percent = totalBytes > 0
    ? Math.min(100, Math.max(0, Math.round((progress.uploadedBytes / totalBytes) * 100)))
    : 0;
  return {
    phase: progress.status,
    uploadedBytes: progress.uploadedBytes,
    totalBytes,
    percent,
    uploadedPartsCount: progress.uploadedPartsCount,
    totalParts: progress.totalParts,
  };
}

function resolveUploadFileName(
  slot: CloudRouterUploadSlot,
  file: CloudRouterUploadFileLike,
  explicitName: string | undefined,
): string {
  const name = (explicitName ?? file.name ?? '').trim();
  if (name) {
    return name;
  }
  return `${slot.code}-${uuid()}`;
}

function resolveUploadContentType(
  file: CloudRouterUploadFileLike,
  explicitContentType: string | undefined,
): string {
  const contentType = (explicitContentType ?? file.type ?? '').trim();
  return contentType || 'application/octet-stream';
}

/**
 * 上传前校验：体积上限与 MIME 准入。
 * 供 UI 在用户选择文件后立即反馈，避免无谓的网络往返。
 */
export function validateCloudRouterUploadFile(
  slotCode: CloudRouterUploadSlotCode,
  file: { size: number; type?: string },
): { ok: true } | { ok: false; message: string } {
  const slot = getCloudRouterUploadSlot(slotCode);
  try {
    assertCloudRouterUploadSizeAllowed(slot, file.size);
    assertCloudRouterUploadMimeAllowed(slot, file.type ?? '');
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 统一文件上传入口。
 *
 * 所有 CloudRouter 前端上传都必须经过本函数：它负责归类解析、准入校验、Drive
 * `client.uploader` 调用、媒体引用构造与可选的只读分享链接，业务侧拿到的是稳定的
 * Drive space/node 引用，不接触 upload session、object key 或供应商细节。
 */
export async function uploadCloudRouterFile(
  input: CloudRouterUploadFileInput,
): Promise<CloudRouterUploadedFile> {
  const slot = getCloudRouterUploadSlot(input.slot);
  const category = getCloudRouterUploadCategory(slot.category);
  const fileName = resolveUploadFileName(slot, input.file, input.fileName);
  const contentType = resolveUploadContentType(input.file, input.contentType);

  assertCloudRouterUploadSizeAllowed(slot, input.file.size);
  assertCloudRouterUploadMimeAllowed(slot, contentType);

  const retention = input.retention ?? resolveCloudRouterUploadRetention(slot);
  const shareLinkMode = input.shareLink ?? slot.shareLink;
  const client = getSdkworkDriveAppSdkClient();

  const result = await client.uploader.uploadByProfile(slot.uploadProfileCode, {
    file: input.file,
    appResourceType: slot.appResourceType,
    appResourceId: input.appResourceId ?? slot.appResourceId,
    scene: slot.scene,
    source: slot.source,
    originalFileName: fileName,
    contentType,
    retention,
    ...(input.spaceId ? { spaceId: input.spaceId } : {}),
    ...(input.parentNodeId ? { parentNodeId: input.parentNodeId } : {}),
    ...(input.uploadProfileCode ? { uploadProfileCode: input.uploadProfileCode } : {}),
    ...(input.signal ? { signal: input.signal } : {}),
    ...(input.onProgress ? { onProgress: (progress) => input.onProgress?.(toProgress(progress)) } : {}),
  });

  const uploadItem = result.uploadItem;
  let media = uploadResultToDriveMediaResource(result, {
    kind: slot.mediaKind,
    category: slot.category,
    slot: slot.code,
  });

  let shareToken: string | undefined;
  if (shareLinkMode === 'reader' && uploadItem.nodeId) {
    const shareLink = await client.drive.shareLinks.create(uploadItem.nodeId, {
      id: uuid(),
      role: 'reader',
    });
    shareToken = shareLink.token;
    media = attachDriveShareToken(media, shareToken);
  }

  return {
    slot,
    category,
    media,
    drive: {
      spaceId: uploadItem.spaceId,
      nodeId: uploadItem.nodeId,
      uploadItemId: uploadItem.id,
      uploadSessionId: result.uploadSession.id,
      ...(uploadItem.storageProviderId ? { storageProviderId: uploadItem.storageProviderId } : {}),
      ...(shareToken ? { shareToken } : {}),
    },
    file: {
      name: fileName,
      contentType,
      sizeBytes: input.file.size,
    },
  };
}

/** 归类是否为公开可见；用于展示与权限提示。 */
export function isCloudRouterUploadSlotPublic(slotCode: CloudRouterUploadSlotCode): boolean {
  return isCloudRouterUploadVisibilityPublic(getCloudRouterUploadSlot(slotCode));
}
