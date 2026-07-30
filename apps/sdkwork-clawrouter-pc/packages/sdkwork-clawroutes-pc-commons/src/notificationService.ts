import { getClawRouterAppSdkClient } from './sdk-clients.ts';
import type {
  SdkworkNotificationGeneratedClient,
  SdkworkNotificationItem,
  SdkworkNotificationService,
} from '@sdkwork/notification-pc-react';
import { createSdkworkNotificationService } from '@sdkwork/notification-pc-react';

const DEFAULT_NOTIFICATION_APP_ID = 'claw-router';
const DEFAULT_NOTIFICATION_PAGE = 1;
const DEFAULT_NOTIFICATION_PAGE_SIZE = 20;

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
    const { items } = await createPortalNotificationService().list();
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
  return createSdkworkNotificationService({
    appId: DEFAULT_NOTIFICATION_APP_ID,
    client,
    page_size: DEFAULT_NOTIFICATION_PAGE_SIZE,
  });
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
          appId: params?.appId,
          includeArchived: params?.includeArchived,
          page: params?.page ?? DEFAULT_NOTIFICATION_PAGE,
          pageSize: params?.page_size ?? DEFAULT_NOTIFICATION_PAGE_SIZE,
        }),
      acknowledge: {
        create: async (notificationId: string, params) =>
          appSdkClient.notification.acknowledge.create(notificationId, { appId: params?.appId }),
      },
      popupSeen: {
        create: async (notificationId: string, params) =>
          appSdkClient.notification.popupSeen.create(notificationId, { appId: params?.appId }),
      },
    },
  };
}

export function getPortalNotificationAppId(): string {
  return DEFAULT_NOTIFICATION_APP_ID;
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
  throw new Error(typeof value === 'string' ? `Unsupported notification type: ${value}` : 'Notification type is required');
}
