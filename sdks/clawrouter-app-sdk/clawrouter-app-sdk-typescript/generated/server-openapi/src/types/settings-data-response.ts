import type { SettingsNotifications } from './settings-notifications';

/** Settings data response schema exposed by Claw Router. */
export interface SettingsDataResponse {
  /** Language field on settings data response. */
  language: string;
  /** Notifications field on settings data response. */
  notifications: SettingsNotifications;
  /** Timezone field on settings data response. */
  timezone: string;
  /** Webhook url field on settings data response. */
  webhookUrl: string;
}
