import {
  isRecord,
  readRequiredString,
  readBoolean,
  readString,
} from './api-result.ts';
import { createIdempotencyParams } from './idempotency.ts';
import { getClawRouterAppSdkClient } from './sdk-clients.ts';
import type {
  SdkworkNotificationGeneratedClient,
  SdkworkNotificationItem,
  SdkworkNotificationService,
} from '@sdkwork/notification-pc-react';

const DEFAULT_NOTIFICATION_APP_ID = 'claw-router';
const DEFAULT_NOTIFICATION_PAGE = 1;
const DEFAULT_NOTIFICATION_PAGE_SIZE = 50;

export type PortalNotificationClient = SdkworkNotificationGeneratedClient;

export interface NotificationItem {
  actionUrl: string | null;
  appId: string;
  archived: boolean;
  content: string;
  desc: string;
  id: string;
  popupSeen: boolean;
  read: boolean;
  showAsPopup: boolean;
  time: string;
  title: string;
  type: 'info' | 'billing' | 'warning' | 'alert';
}

export class NotificationService {
  static async fetchNotifications(): Promise<NotificationItem[]> {
    const items = await createPortalNotificationService().list();
    return items.map(readNotificationFromSdkworkItem);
  }

  static async acknowledge(notificationId: string): Promise<void> {
    await createPortalNotificationService().acknowledge(notificationId);
  }

  static async markPopupSeen(notificationId: string): Promise<void> {
    await createPortalNotificationService().markPopupSeen(notificationId);
  }
}

export function createPortalNotificationService(
  client: PortalNotificationClient = getPortalNotificationClient(),
): SdkworkNotificationService {
  return {
    async list(options = {}) {
      const result = await client.notification.listNotifications({
        includeArchived: options.includeArchived ?? false,
        page: options.page ?? DEFAULT_NOTIFICATION_PAGE,
        pageSize: options.pageSize ?? DEFAULT_NOTIFICATION_PAGE_SIZE,
      });
      ensureNotificationSuccess(result, 'Failed to list notifications');
      return readNotificationItems(result).map((item) => toSdkworkNotificationItem(readNotification(item)));
    },
    async acknowledge(notificationId: string): Promise<void> {
      const result = await client.notification.acknowledge.create(notificationId);
      ensureNotificationSuccess(result, 'Failed to acknowledge notification');
    },
    async markPopupSeen(notificationId: string): Promise<void> {
      const result = await client.notification.popupSeen.create(notificationId);
      ensureNotificationSuccess(result, 'Failed to mark notification popup seen');
    },
  };
}

export function getPortalNotificationClient(): PortalNotificationClient {
  return createPortalNotificationSdkClient(getClawRouterAppSdkClient());
}

function createPortalNotificationSdkClient(
  appSdkClient: ReturnType<typeof getClawRouterAppSdkClient>,
): PortalNotificationClient {
  return {
    notification: {
      listNotifications: async (params) =>
        appSdkClient.notification.list({
          includeArchived: params?.includeArchived,
          page: String(params?.page ?? DEFAULT_NOTIFICATION_PAGE),
          pageSize: String(params?.pageSize ?? DEFAULT_NOTIFICATION_PAGE_SIZE),
        }),
      acknowledge: {
        create: async (notificationId: string) =>
          appSdkClient.notification.acknowledge.create(
            notificationId,
            createIdempotencyParams('notification-acknowledge'),
          ),
      },
      popupSeen: {
        create: async (notificationId: string) =>
          appSdkClient.notification.popupSeen.create(
            notificationId,
            createIdempotencyParams('notification-popup-seen'),
          ),
      },
    },
  };
}

export function getPortalNotificationAppId(): string {
  return DEFAULT_NOTIFICATION_APP_ID;
}

function readNotification(value: unknown): NotificationItem {
  if (!isRecord(value)) {
    throw new Error('Notification record is required');
  }

  return {
    id: readRequiredString(value, 'id', 'Notification id is required'),
    appId: readRequiredString(value, 'appId', 'Notification app id is required'),
    title: readRequiredString(value, 'title', 'Notification title is required'),
    desc: readRequiredString(value, 'desc', 'Notification description is required'),
    content: readRequiredString(value, 'content', 'Notification content is required'),
    time: readRequiredString(value, 'time', 'Notification time is required'),
    type: readNotificationType(value.type),
    read: readNotificationRead(value.read),
    showAsPopup: readBoolean(value, 'showAsPopup', false),
    popupSeen: readBoolean(value, 'popupSeen', false),
    archived: readBoolean(value, 'archived', false),
    actionUrl: readString(value, 'actionUrl') || null,
  };
}

function readNotificationFromSdkworkItem(item: SdkworkNotificationItem): NotificationItem {
  return {
    id: item.id,
    appId: item.appId ?? DEFAULT_NOTIFICATION_APP_ID,
    title: item.title,
    desc: item.desc ?? '',
    content: item.content ?? '',
    time: item.time ?? item.createdAt,
    type: readNotificationType(item.type ?? item.kind),
    read: item.read ?? (item.status === 'read' || item.status === 'archived'),
    showAsPopup: item.showAsPopup ?? false,
    popupSeen: item.popupSeen ?? false,
    archived: item.archived ?? item.status === 'archived',
    actionUrl: item.actionUrl ?? item.route ?? null,
  };
}

function ensureNotificationSuccess(value: { code?: string | number; msg?: string }, fallback: string): void {
  if (value.code === undefined || value.code === '2000' || value.code === '0' || value.code === 0) {
    return;
  }
  throw new Error(value.msg || `${fallback}: ${value.code}`);
}

function readNotificationItems(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (!isRecord(value)) {
    throw new Error('Notification list response is required');
  }
  if (Array.isArray(value.items)) {
    return value.items;
  }
  if (isRecord(value.data) && Array.isArray(value.data.items)) {
    return value.data.items;
  }
  throw new Error('Notification list response missing items');
}

function toSdkworkNotificationItem(item: NotificationItem): SdkworkNotificationItem {
  return {
    actionUrl: item.actionUrl,
    appId: item.appId,
    archived: item.archived,
    createdAt: item.time,
    content: item.content,
    desc: item.desc,
    id: item.id,
    kind: item.type === 'alert' ? 'error' : item.type === 'billing' ? 'info' : item.type,
    popupSeen: item.popupSeen,
    read: item.read,
    route: item.actionUrl ?? undefined,
    showAsPopup: item.showAsPopup,
    status: item.archived ? 'archived' : item.read ? 'read' : 'unread',
    time: item.time,
    title: item.title,
    type: item.type,
  };
}

function readNotificationType(value: unknown): NotificationItem['type'] {
  if (value === 'info' || value === 'billing' || value === 'warning' || value === 'alert') {
    return value;
  }
  if (value === 'error') {
    return 'alert';
  }
  if (value === 'success' || value === 'message' || value === 'security' || value === 'task') {
    return 'info';
  }
  const notificationType = readString({ value }, 'value');
  throw new Error(notificationType ? `Unsupported notification type: ${notificationType}` : 'Notification type is required');
}

function readNotificationRead(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  throw new Error('Notification read state is required');
}
