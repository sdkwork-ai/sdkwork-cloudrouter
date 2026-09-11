import type { DriveUploaderProfile } from '@sdkwork/drive-app-sdk';

/**
 * CloudRouter 统一上传目录。
 *
 * 所有前端上传必须通过 `@sdkwork/drive-app-sdk` 的 `client.uploader.*` 完成，
 * 并通过本目录声明自己的归类、Drive 上传 profile、保留策略与准入约束。
 *
 * 归类维度（category）决定文件落到哪一类 Drive 空间，便于运营管理与用量统计；
 * 用途维度（slot）决定 scene / appResourceType / 允许的 MIME 与体积上限。
 */

/** Drive 空间类型（与 drive `CreateSpaceRequest.spaceType` 枚举保持一致）。 */
export type CloudRouterDriveSpaceType =
  | 'ai_generated'
  | 'app_upload'
  | 'deployment'
  | 'git_repository'
  | 'im'
  | 'knowledge_base'
  | 'notary'
  | 'personal'
  | 'rtc'
  | 'team'
  | 'website';

/** 上传归类。用于分门别类管理与按类统计。 */
export type CloudRouterUploadCategoryCode =
  | 'admin_asset'
  | 'ai_generated'
  | 'public_asset'
  | 'team_asset'
  | 'temporary'
  | 'user_private';

export type CloudRouterUploadVisibility = 'private' | 'public';

export interface CloudRouterUploadRetention {
  mode: 'long_term' | 'temporary';
  /** int64 秒数，遵循 SDKWork int64 线格式（字符串）。 */
  ttlSeconds?: string;
  cleanupAction?: 'hard_delete' | 'soft_delete';
  /** int64 秒数，遵循 SDKWork int64 线格式（字符串）。 */
  hardDeleteAfterSeconds?: string;
}

export interface CloudRouterUploadCategory {
  code: CloudRouterUploadCategoryCode;
  /** 中文显示名，用于运营界面分组。 */
  label: string;
  description: string;
  /** 归类默认落地的 Drive 空间类型。 */
  spaceType: CloudRouterDriveSpaceType;
  /** 资源可见性；决定是否默认创建只读分享链接。 */
  visibility: CloudRouterUploadVisibility;
  /** 归类默认保留策略，可被单个 slot 覆盖。 */
  retention: CloudRouterUploadRetention;
}

const LONG_TERM: CloudRouterUploadRetention = { mode: 'long_term' };

/**
 * 归类目录。新增归类必须在此登记，避免上传点各自为政。
 */
export const CLOUDROUTER_UPLOAD_CATEGORIES: readonly CloudRouterUploadCategory[] = [
  {
    code: 'public_asset',
    label: '公开资源文件',
    description: '站点对外可见的品牌与入口资源，可公开读取。',
    spaceType: 'website',
    visibility: 'public',
    retention: LONG_TERM,
  },
  {
    code: 'user_private',
    label: '用户私有文件',
    description: '归属于单个用户的个人资源，按用户独立统计与隔离。',
    spaceType: 'personal',
    visibility: 'private',
    retention: LONG_TERM,
  },
  {
    code: 'team_asset',
    label: '团队组织文件',
    description: '归属于组织或社群的共享资源。',
    spaceType: 'team',
    visibility: 'public',
    retention: LONG_TERM,
  },
  {
    code: 'admin_asset',
    label: '运营配置资源',
    description: '后台运营配置使用的图标与展示资源。',
    spaceType: 'app_upload',
    visibility: 'public',
    retention: LONG_TERM,
  },
  {
    code: 'ai_generated',
    label: '人工智能生成文件',
    description: '模型生成的图片、视频与音频产物，独立成库便于生命周期治理。',
    spaceType: 'ai_generated',
    visibility: 'private',
    retention: LONG_TERM,
  },
  {
    code: 'temporary',
    label: '临时文件',
    description: '导入、导出与中间产物，到期由 Drive 清理。',
    spaceType: 'app_upload',
    visibility: 'private',
    retention: {
      mode: 'temporary',
      ttlSeconds: String(7 * 24 * 60 * 60),
      cleanupAction: 'soft_delete',
    },
  },
];

/** 上传用途标识。每个用户可达的文件选择入口都必须登记一个 slot。 */
export type CloudRouterUploadSlotCode =
  | 'admin-category-icon'
  | 'admin-membership-icon'
  | 'admin-provider-logo'
  | 'ai-audio'
  | 'ai-image'
  | 'ai-video'
  | 'community-circle-avatar'
  | 'community-circle-cover'
  | 'community-group-qr-code'
  | 'site-favicon'
  | 'site-icon'
  | 'site-logo'
  | 'site-qr-code'
  | 'temporary-asset'
  | 'user-avatar';

export interface CloudRouterUploadSlot {
  code: CloudRouterUploadSlotCode;
  category: CloudRouterUploadCategoryCode;
  label: string;
  description: string;
  /** Drive uploader profile，决定分片大小与处理链路。 */
  uploadProfileCode: DriveUploaderProfile;
  /** 传给 Drive 的业务场景标识；决定自动空间的归类落点。 */
  scene: string;
  /** 业务资源类型，供 Drive 侧按来源聚合。 */
  appResourceType: string;
  /** 业务资源 ID，默认与 scene 对齐，可由调用方覆盖为具体实体 ID。 */
  appResourceId: string;
  /** 调用来源标识，用于审计与问题定位。 */
  source: string;
  /** 允许的 MIME 前缀或精确值。 */
  accept: readonly string[];
  maxSizeBytes: number;
  retention?: CloudRouterUploadRetention;
  /** 'reader' 表示上传后创建只读分享链接，业务侧凭 token 换取下载地址。 */
  shareLink: 'none' | 'reader';
  /** 媒体种类，用于构造 CloudRouterMediaResource。 */
  mediaKind: 'audio' | 'document' | 'image' | 'video';
}

const SOURCE_PREFIX = 'cloudrouter-pc';

const SLOTS: readonly CloudRouterUploadSlot[] = [
  {
    code: 'site-logo',
    category: 'public_asset',
    label: '站点 Logo',
    description: '站点主标识，公开展示。',
    uploadProfileCode: 'image',
    scene: 'website-brand',
    appResourceType: 'site-settings',
    appResourceId: 'site-settings-brand',
    source: `${SOURCE_PREFIX}-admin-site-logo-upload`,
    accept: ['image/'],
    maxSizeBytes: 2 * 1024 * 1024,
    shareLink: 'reader',
    mediaKind: 'image',
  },
  {
    code: 'site-icon',
    category: 'public_asset',
    label: '站点图标',
    description: '站点功能图标，公开展示。',
    uploadProfileCode: 'image',
    scene: 'website-brand',
    appResourceType: 'site-settings',
    appResourceId: 'site-settings-brand',
    source: `${SOURCE_PREFIX}-admin-site-icon-upload`,
    accept: ['image/'],
    maxSizeBytes: 2 * 1024 * 1024,
    shareLink: 'reader',
    mediaKind: 'image',
  },
  {
    code: 'site-favicon',
    category: 'public_asset',
    label: '站点 Favicon',
    description: '浏览器页签图标。',
    uploadProfileCode: 'image',
    scene: 'website-brand',
    appResourceType: 'site-settings',
    appResourceId: 'site-settings-brand',
    source: `${SOURCE_PREFIX}-admin-site-favicon-upload`,
    accept: ['image/'],
    maxSizeBytes: 1024 * 1024,
    shareLink: 'reader',
    mediaKind: 'image',
  },
  {
    code: 'site-qr-code',
    category: 'public_asset',
    label: '站点二维码',
    description: '公众号与社群二维码图片。',
    uploadProfileCode: 'image',
    scene: 'website-brand',
    appResourceType: 'site-settings',
    appResourceId: 'site-settings-qr-codes',
    source: `${SOURCE_PREFIX}-admin-site-qr-code-upload`,
    accept: ['image/'],
    maxSizeBytes: 10 * 1024 * 1024,
    shareLink: 'reader',
    mediaKind: 'image',
  },
  {
    code: 'user-avatar',
    category: 'user_private',
    label: '用户头像',
    description: '当前登录用户的个人头像。',
    uploadProfileCode: 'avatar',
    scene: 'avatar',
    appResourceType: 'user-profile',
    appResourceId: 'user-profile-avatar',
    source: `${SOURCE_PREFIX}-console-user-avatar-upload`,
    accept: ['image/'],
    maxSizeBytes: 5 * 1024 * 1024,
    shareLink: 'none',
    mediaKind: 'image',
  },
  {
    code: 'community-circle-avatar',
    category: 'team_asset',
    label: '社群头像',
    description: '社区圈子头像。',
    uploadProfileCode: 'image',
    scene: 'team-asset',
    appResourceType: 'community-circle',
    appResourceId: 'community-circle-avatar',
    source: `${SOURCE_PREFIX}-admin-community-circle-avatar-upload`,
    accept: ['image/'],
    maxSizeBytes: 5 * 1024 * 1024,
    shareLink: 'reader',
    mediaKind: 'image',
  },
  {
    code: 'community-circle-cover',
    category: 'team_asset',
    label: '社群封面',
    description: '社区圈子封面图。',
    uploadProfileCode: 'image',
    scene: 'team-asset',
    appResourceType: 'community-circle',
    appResourceId: 'community-circle-cover',
    source: `${SOURCE_PREFIX}-admin-community-circle-cover-upload`,
    accept: ['image/'],
    maxSizeBytes: 10 * 1024 * 1024,
    shareLink: 'reader',
    mediaKind: 'image',
  },
  {
    code: 'community-group-qr-code',
    category: 'team_asset',
    label: '社群群二维码',
    description: '社群群聊二维码图片。',
    uploadProfileCode: 'image',
    scene: 'team-asset',
    appResourceType: 'community-group',
    appResourceId: 'community-group-qr-code',
    source: `${SOURCE_PREFIX}-admin-community-group-qr-code-upload`,
    accept: ['image/'],
    maxSizeBytes: 10 * 1024 * 1024,
    shareLink: 'reader',
    mediaKind: 'image',
  },
  {
    code: 'admin-membership-icon',
    category: 'admin_asset',
    label: '会员套餐图标',
    description: '会员等级与套餐的展示图标。',
    uploadProfileCode: 'image',
    scene: 'admin-asset',
    appResourceType: 'membership-plan',
    appResourceId: 'membership-plan-icon',
    source: `${SOURCE_PREFIX}-admin-membership-icon-upload`,
    accept: ['image/'],
    maxSizeBytes: 2 * 1024 * 1024,
    shareLink: 'reader',
    mediaKind: 'image',
  },
  {
    code: 'admin-category-icon',
    category: 'admin_asset',
    label: '分类图标',
    description: '业务分类的展示图标。',
    uploadProfileCode: 'image',
    scene: 'admin-asset',
    appResourceType: 'admin-category',
    appResourceId: 'admin-category-icon',
    source: `${SOURCE_PREFIX}-admin-category-icon-upload`,
    accept: ['image/'],
    maxSizeBytes: 2 * 1024 * 1024,
    shareLink: 'reader',
    mediaKind: 'image',
  },
  {
    code: 'admin-provider-logo',
    category: 'admin_asset',
    label: '供应商 Logo',
    description: '上游供应商展示 Logo。',
    uploadProfileCode: 'image',
    scene: 'admin-asset',
    appResourceType: 'upstream-provider',
    appResourceId: 'upstream-provider-logo',
    source: `${SOURCE_PREFIX}-admin-provider-logo-upload`,
    accept: ['image/'],
    maxSizeBytes: 2 * 1024 * 1024,
    shareLink: 'reader',
    mediaKind: 'image',
  },
  {
    code: 'ai-image',
    category: 'ai_generated',
    label: '生成图片',
    description: '模型生成的图片产物。',
    uploadProfileCode: 'image',
    scene: 'ai-generated',
    appResourceType: 'generation-artifact',
    appResourceId: 'generation-artifact-image',
    source: `${SOURCE_PREFIX}-playground-generation-image`,
    accept: ['image/'],
    maxSizeBytes: 20 * 1024 * 1024,
    shareLink: 'none',
    mediaKind: 'image',
  },
  {
    code: 'ai-video',
    category: 'ai_generated',
    label: '生成视频',
    description: '模型生成的视频产物。',
    uploadProfileCode: 'video',
    scene: 'ai-generated',
    appResourceType: 'generation-artifact',
    appResourceId: 'generation-artifact-video',
    source: `${SOURCE_PREFIX}-playground-generation-video`,
    accept: ['video/'],
    maxSizeBytes: 500 * 1024 * 1024,
    shareLink: 'none',
    mediaKind: 'video',
  },
  {
    code: 'ai-audio',
    category: 'ai_generated',
    label: '生成音频',
    description: '模型生成的语音与音频产物。',
    uploadProfileCode: 'audio',
    scene: 'ai-generated',
    appResourceType: 'generation-artifact',
    appResourceId: 'generation-artifact-audio',
    source: `${SOURCE_PREFIX}-playground-generation-audio`,
    accept: ['audio/'],
    maxSizeBytes: 100 * 1024 * 1024,
    shareLink: 'none',
    mediaKind: 'audio',
  },
  {
    code: 'temporary-asset',
    category: 'temporary',
    label: '临时文件',
    description: '导入导出与中间产物，到期自动清理。',
    uploadProfileCode: 'document',
    scene: 'temporary',
    appResourceType: 'cloudrouter-temporary',
    appResourceId: 'cloudrouter-temporary',
    source: `${SOURCE_PREFIX}-temporary-upload`,
    accept: ['*'],
    maxSizeBytes: 50 * 1024 * 1024,
    shareLink: 'none',
    mediaKind: 'document',
  },
];

const SLOTS_BY_CODE = new Map<CloudRouterUploadSlotCode, CloudRouterUploadSlot>(
  SLOTS.map((slot) => [slot.code, slot]),
);

const CATEGORIES_BY_CODE = new Map<CloudRouterUploadCategoryCode, CloudRouterUploadCategory>(
  CLOUDROUTER_UPLOAD_CATEGORIES.map((category) => [category.code, category]),
);

export function listCloudRouterUploadSlots(): readonly CloudRouterUploadSlot[] {
  return SLOTS;
}

export function listCloudRouterUploadCategories(): readonly CloudRouterUploadCategory[] {
  return CLOUDROUTER_UPLOAD_CATEGORIES;
}

export function getCloudRouterUploadSlot(code: CloudRouterUploadSlotCode): CloudRouterUploadSlot {
  const slot = SLOTS_BY_CODE.get(code);
  if (!slot) {
    throw new Error(`Unknown CloudRouter upload slot: ${String(code)}`);
  }
  return slot;
}

export function getCloudRouterUploadCategory(
  code: CloudRouterUploadCategoryCode,
): CloudRouterUploadCategory {
  const category = CATEGORIES_BY_CODE.get(code);
  if (!category) {
    throw new Error(`Unknown CloudRouter upload category: ${String(code)}`);
  }
  return category;
}

export function resolveCloudRouterUploadRetention(
  slot: CloudRouterUploadSlot,
): CloudRouterUploadRetention {
  return slot.retention ?? getCloudRouterUploadCategory(slot.category).retention;
}

export function isCloudRouterUploadVisibilityPublic(
  slot: CloudRouterUploadSlot,
): boolean {
  return getCloudRouterUploadCategory(slot.category).visibility === 'public';
}

/** 按 slot 的 accept 规则判断 MIME 是否准入。 */
export function isCloudRouterUploadMimeAccepted(
  slot: CloudRouterUploadSlot,
  contentType: string,
): boolean {
  const normalized = contentType.trim().toLowerCase();
  if (!normalized || slot.accept.includes('*')) {
    return true;
  }
  return slot.accept.some((rule) =>
    rule.endsWith('/') ? normalized.startsWith(rule) : normalized === rule);
}

/** 校验体积上限；`sizeBytes` 为负数或非有限值视为非法。 */
export function assertCloudRouterUploadSizeAllowed(
  slot: CloudRouterUploadSlot,
  sizeBytes: number,
): void {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error(`${slot.label} 文件大小无效`);
  }
  if (sizeBytes > slot.maxSizeBytes) {
    throw new Error(
      `${slot.label} 超出体积上限（最大 ${formatCloudRouterUploadBytes(slot.maxSizeBytes)}）`,
    );
  }
}

export function assertCloudRouterUploadMimeAllowed(
  slot: CloudRouterUploadSlot,
  contentType: string,
): void {
  if (!isCloudRouterUploadMimeAccepted(slot, contentType)) {
    throw new Error(`${slot.label} 不支持该文件类型：${contentType || '未知'}`);
  }
}

export function formatCloudRouterUploadBytes(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = sizeBytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = value >= 10 || unitIndex === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}
