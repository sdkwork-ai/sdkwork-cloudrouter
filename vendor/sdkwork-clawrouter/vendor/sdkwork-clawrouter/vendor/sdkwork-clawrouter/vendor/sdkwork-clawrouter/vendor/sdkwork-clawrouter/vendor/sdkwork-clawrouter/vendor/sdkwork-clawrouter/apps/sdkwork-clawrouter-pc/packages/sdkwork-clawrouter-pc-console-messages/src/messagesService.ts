import type { NotificationItem } from '@sdkwork/clawroutes-pc-commons/runtime';
import { NotificationService } from '@sdkwork/clawroutes-pc-commons/runtime';
import type { SdkworkNotificationItem } from '@sdkwork/notification-pc-react';

export type MessageItem = NotificationItem;
export type MessagesNotificationItem = SdkworkNotificationItem;

export class MessagesService {
  static async fetchMessages(): Promise<MessageItem[]> {
    return NotificationService.fetchNotifications();
  }

  static async acknowledge(messageId: string): Promise<void> {
    await NotificationService.acknowledge(messageId);
  }

  static async markPopupSeen(messageId: string): Promise<void> {
    await NotificationService.markPopupSeen(messageId);
  }
}
