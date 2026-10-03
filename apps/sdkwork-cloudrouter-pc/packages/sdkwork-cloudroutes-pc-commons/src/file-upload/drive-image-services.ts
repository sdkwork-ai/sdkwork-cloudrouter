import { uuid } from '@sdkwork/utils/id';
import {
  assertDriveUploadImageDeclaration,
  createDriveNodesImagePreviewReader,
  createDriveUploadImageService,
  parseDriveImageUri,
  type DriveUploadImageDeclaration,
  type DriveUploadImageDriveMetadata,
  type DriveUploadImageFileLike,
  type DriveUploadImageProfile,
  type DriveUploadImageProgress,
  type DriveUploadImageService,
  type DriveUploadImageValue,
} from '@sdkwork/drive-upload-image-core';

import type { CloudRouterMediaKind, CloudRouterMediaResource } from '../media-resource.ts';
import { readMediaResourceUrl, toExternalUrlMediaResource } from '../media-resource.ts';
import { attachDriveShareToken, isDriveMediaResource } from '../drive-media.ts';
import { getSdkworkDriveAppSdkClient } from '../sdk-clients.ts';
import {
  getCloudRouterUploadSlot,
  type CloudRouterUploadSlot,
  type CloudRouterUploadSlotCode,
} from './upload-catalog.ts';

/**
 * 统一上传目录到共享 Drive 图片上传组件族（`sdkwork-drive-pc-upload-image`）的服务桥。
 *
 * 声明值（appResourceType / scene / source / uploadProfileCode）只来自统一上传目录
 * （`upload.declaration.json` 的代码镜像），本模块是唯一把它们映射成
 * `DriveUploadImageDeclaration` 的地方；UI 组件只接收构造好的
 * `DriveUploadImageService`，不内联任何声明字面量（DRIVE_SPEC.md §18.3）。
 *
 * 公开展示 slot（目录 `shareLink: 'reader'`）上传后照旧创建只读分享链接并写入
 * `metadata.drive.shareToken`，保证既有持久化媒体形状与展示链路不漂移。
 */

/** 图片型上传 profile；目录中非图片 slot 不能构造图片上传服务。 */
const DRIVE_IMAGE_PROFILES: readonly DriveUploadImageProfile[] = ['image', 'avatar', 'thumbnail'];

/** 扩展 Drive 元数据：补齐目录声明回执与公开展示所需的分享 token。 */
export interface CloudRouterDriveImageDriveMetadata extends DriveUploadImageDriveMetadata {
  /** 上传后创建的只读分享链接 token（仅公开展示 slot）。 */
  shareToken?: string;
  scene?: string;
  source?: string;
  uploadProfileCode?: string;
  storageProviderId?: string;
  contentTypeGroup?: string;
}

/**
 * 上传服务产出的值：满足共享组件族的 `DriveUploadImageValue` 契约，同时携带
 * `uploadResultToDriveMediaResource` 写入的持久化字段（id / kind / fileName /
 * mimeType / sizeBytes / uploadCategory / uploadSlot），调用方可原样存入业务表单。
 */
export interface CloudRouterDriveImageValue extends DriveUploadImageValue {
  /** Drive 节点标识，等价于 `CloudRouterMediaResource.id`。 */
  id?: string;
  kind?: CloudRouterMediaKind;
  fileName?: string;
  mimeType?: string;
  /** int64 字节数，遵循 SDKWork int64 线格式（字符串）。 */
  sizeBytes?: string;
  metadata: {
    drive?: CloudRouterDriveImageDriveMetadata;
    uploadCategory?: string;
    uploadSlot?: string;
    [key: string]: unknown;
  };
}

/** 图片上传服务：契约同 `DriveUploadImageService`，产出带 CloudRouter 持久化字段。 */
export interface CloudRouterDriveImageService extends DriveUploadImageService {
  upload(input: {
    file: DriveUploadImageFileLike;
    appResourceId: string;
    signal?: AbortSignal | undefined;
    onProgress?: ((progress: DriveUploadImageProgress) => void) | undefined;
  }): Promise<CloudRouterDriveImageValue>;
}

export interface CloudRouterDriveImageServiceOptions {
  /** 覆盖是否创建只读分享链接；缺省跟随统一上传目录 slot 的 shareLink 归类。 */
  publicShare?: boolean;
}

/** 把统一上传目录 slot 映射为共享组件族的上传声明（DRIVE_SPEC.md §18）。 */
export function slotToDriveUploadImageDeclaration(
  slot: CloudRouterUploadSlot,
): DriveUploadImageDeclaration {
  const uploadProfileCode = DRIVE_IMAGE_PROFILES.find(
    (candidate) => candidate === slot.uploadProfileCode,
  );
  if (uploadProfileCode === undefined) {
    throw new Error(
      `Upload slot ${slot.code} is not an image-shaped slot (profile: ${slot.uploadProfileCode}).`,
    );
  }
  const purpose = slot.description.trim() !== '' ? slot.description : `${slot.label}的上传用途。`;
  const declaration: DriveUploadImageDeclaration = {
    appResourceType: slot.appResourceType,
    appResourceIdKind: 'entity',
    scene: slot.scene,
    source: slot.source,
    uploadProfileCode,
    retention: 'long_term',
    purpose,
  };
  assertDriveUploadImageDeclaration(declaration);
  return declaration;
}

const serviceCache = new Map<string, CloudRouterDriveImageService>();

/**
 * 构造（并按 slot + 分享策略记忆化）注入共享 `DriveUploadImage` 组件的图片上传服务。
 *
 * uploader 与预览读取器绑定 `@sdkwork/drive-app-sdk` 客户端；slot 为公开展示
 * （目录 `shareLink: 'reader'`，与 `uploadCloudRouterFile` 今天的条件一致）时，
 * 上传成功后创建只读分享链接并回填 `metadata.drive.shareToken`。
 */
export function getCloudRouterDriveImageService(
  slotCode: CloudRouterUploadSlotCode,
  options: CloudRouterDriveImageServiceOptions = {},
): CloudRouterDriveImageService {
  const shareLinkMode = options.publicShare === undefined
    ? undefined
    : options.publicShare
      ? 'reader'
      : 'none';
  const cacheKey = `${slotCode}:${shareLinkMode ?? ''}`;
  const cached = serviceCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const slot = getCloudRouterUploadSlot(slotCode);
  const client = getSdkworkDriveAppSdkClient();
  const inner = createDriveUploadImageService({
    uploader: client.uploader,
    declaration: slotToDriveUploadImageDeclaration(slot),
    previewReader: createDriveNodesImagePreviewReader(client.drive.nodes),
  });
  const effectiveShareLinkMode = shareLinkMode ?? slot.shareLink;
  const service: CloudRouterDriveImageService = {
    async upload(input) {
      const value = await inner.upload(input);
      return toCloudRouterDriveImageValue(value, slot, effectiveShareLinkMode);
    },
    resolvePreview: (input) => inner.resolvePreview(input),
  };
  serviceCache.set(cacheKey, service);
  return service;
}

async function toCloudRouterDriveImageValue(
  value: DriveUploadImageValue,
  slot: CloudRouterUploadSlot,
  shareLinkMode: 'none' | 'reader',
): Promise<CloudRouterDriveImageValue> {
  if (value.source !== 'drive') {
    return { ...value, metadata: value.metadata ?? {} };
  }
  const ref = parseDriveImageUri(value.uri);
  if (ref === null) {
    return { ...value, metadata: value.metadata ?? {} };
  }
  const driveMetadata = value.metadata?.drive;
  let media: CloudRouterMediaResource = {
    id: ref.nodeId,
    kind: slot.mediaKind,
    source: 'drive',
    uri: value.uri,
    ...(driveMetadata?.originalFileName === undefined
      ? {}
      : { fileName: driveMetadata.originalFileName }),
    ...(driveMetadata?.contentType === undefined ? {} : { mimeType: driveMetadata.contentType }),
    ...(driveMetadata?.contentLength === undefined ? {} : { sizeBytes: driveMetadata.contentLength }),
    metadata: {
      drive: {
        ...driveMetadata,
        scene: slot.scene,
        source: slot.source,
        uploadProfileCode: slot.uploadProfileCode,
      },
      uploadCategory: slot.category,
      uploadSlot: slot.code,
    },
  };
  // 与 `uploadCloudRouterFile` 保持一致：公开展示 slot 上传后创建只读分享链接，
  // 业务侧凭 `metadata.drive.shareToken` 换取下载地址。
  if (shareLinkMode === 'reader' && ref.nodeId !== '') {
    const client = getSdkworkDriveAppSdkClient();
    const shareLink = await client.drive.shareLinks.create(ref.nodeId, {
      id: uuid(),
      role: 'reader',
    });
    media = attachDriveShareToken(media, shareLink.token);
  }
  return cloudRouterDriveImageValueFromMedia(media);
}

function readDriveMetadataRecord(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  const drive = metadata?.drive;
  return typeof drive === 'object' && drive !== null ? (drive as Record<string, unknown>) : {};
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function cloudRouterDriveImageValueFromMedia(
  media: CloudRouterMediaResource,
): CloudRouterDriveImageValue {
  const metadata = media.metadata ?? {};
  const drive = readDriveMetadataRecord(metadata);
  return {
    uri: media.uri ?? '',
    source: 'drive',
    id: media.id,
    kind: media.kind,
    fileName: media.fileName,
    mimeType: media.mimeType,
    sizeBytes: media.sizeBytes,
    metadata: {
      ...metadata,
      drive: {
        spaceId: optionalString(drive, 'spaceId') ?? '',
        nodeId: optionalString(drive, 'nodeId') ?? '',
        spaceType: optionalString(drive, 'spaceType'),
        nodeVersion: optionalString(drive, 'nodeVersion'),
        contentType: optionalString(drive, 'contentType'),
        contentLength: optionalString(drive, 'contentLength'),
        originalFileName: optionalString(drive, 'originalFileName'),
        checksumSha256Hex: optionalString(drive, 'checksumSha256Hex'),
        contentTypeGroup: optionalString(drive, 'contentTypeGroup'),
        scene: optionalString(drive, 'scene'),
        source: optionalString(drive, 'source'),
        storageProviderId: optionalString(drive, 'storageProviderId'),
        uploadProfileCode: optionalString(drive, 'uploadProfileCode'),
        shareToken: optionalString(drive, 'shareToken'),
      },
      uploadCategory: optionalString(metadata, 'uploadCategory'),
      uploadSlot: optionalString(metadata, 'uploadSlot'),
    },
  };
}

/**
 * 既有持久化媒体（Drive 引用或历史外链）→ 共享组件族的受控值。
 * 历史 `external_url` 资源映射为 `source: 'external'`，预览按原 URL 直读。
 */
export function cloudRouterMediaResourceToDriveUploadImageValue(
  media: CloudRouterMediaResource | undefined,
): DriveUploadImageValue | null {
  if (!media) {
    return null;
  }
  if (isDriveMediaResource(media)) {
    const metadata = media.metadata ?? {};
    const drive = readDriveMetadataRecord(metadata);
    return {
      uri: media.uri ?? '',
      source: 'drive',
      metadata: {
        ...metadata,
        drive: {
          spaceId: optionalString(drive, 'spaceId') ?? '',
          nodeId: optionalString(drive, 'nodeId') ?? '',
          spaceType: optionalString(drive, 'spaceType'),
          nodeVersion: optionalString(drive, 'nodeVersion'),
          contentType: optionalString(drive, 'contentType'),
          contentLength: optionalString(drive, 'contentLength'),
          originalFileName: optionalString(drive, 'originalFileName'),
          checksumSha256Hex: optionalString(drive, 'checksumSha256Hex'),
        },
      },
    };
  }
  const url = readMediaResourceUrl(media);
  return url === '' ? null : { uri: url, source: 'external' };
}

/**
 * 共享组件族的值 → 业务侧持久化的 `CloudRouterMediaResource`。
 * Drive 引用回填节点 id 与元数据；移除（null）归一为 undefined；外链沿用
 * `toExternalUrlMediaResource` 的历史形状。
 */
export function driveUploadImageValueToCloudRouterMediaResource(
  value: DriveUploadImageValue | null | undefined,
  kind: CloudRouterMediaKind = 'image',
): CloudRouterMediaResource | undefined {
  if (!value) {
    return undefined;
  }
  const uri = value.uri.trim();
  if (uri === '') {
    return undefined;
  }
  if (value.source !== 'drive') {
    return toExternalUrlMediaResource(uri, kind);
  }
  const ref = parseDriveImageUri(uri);
  const drive = value.metadata?.drive;
  return {
    ...(ref === null ? {} : { id: ref.nodeId }),
    kind,
    source: 'drive',
    uri,
    ...(drive?.originalFileName === undefined ? {} : { fileName: drive.originalFileName }),
    ...(drive?.contentType === undefined ? {} : { mimeType: drive.contentType }),
    ...(drive?.contentLength === undefined ? {} : { sizeBytes: drive.contentLength }),
    metadata: value.metadata ?? {},
  };
}
