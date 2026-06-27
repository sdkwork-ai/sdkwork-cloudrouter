import type { I18nMessageBundle } from '../types';

export const adminFilePlatformMessages = {
  en: {
    "admin.filePlatform.storage.title": "Storage Center",
    "admin.filePlatform.storage.desc": "Provider, bucket, default route, quota, and reconciliation governance.",
    "admin.filePlatform.drive.title": "Drive Center",
    "admin.filePlatform.drive.desc": "Drive spaces, nodes, permissions, share links, and audit governance.",
  },
  zh: {
    "admin.filePlatform.storage.title": "存储中心",
    "admin.filePlatform.storage.desc": "维护 Provider、Bucket、默认路由、配额和对账治理。",
    "admin.filePlatform.drive.title": "网盘中心",
    "admin.filePlatform.drive.desc": "维护网盘空间、节点、权限、分享链接和审计治理。",
  },
} satisfies I18nMessageBundle;
