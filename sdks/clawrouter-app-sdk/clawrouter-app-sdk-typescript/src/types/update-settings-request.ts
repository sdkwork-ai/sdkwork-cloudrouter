import type { UpdateSettingsNotificationsRequest } from './update-settings-notifications-request';

/** Update settings request schema exposed by Claw Router. */
export interface UpdateSettingsRequest {
  /** Language field on update settings request. */
  language: string;
  /** Notifications field on update settings request. */
  notifications: UpdateSettingsNotificationsRequest;
  /** Timezone field on update settings request. */
  timezone: string;
  /** Webhook url field on update settings request. */
  webhookUrl: string;
}
