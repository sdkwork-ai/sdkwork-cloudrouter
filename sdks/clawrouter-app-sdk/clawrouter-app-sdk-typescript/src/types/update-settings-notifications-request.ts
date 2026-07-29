/** Update settings notifications request schema exposed by Claw Router. */
export interface UpdateSettingsNotificationsRequest {
  /** Api monitor field on update settings notifications request. */
  apiMonitor: boolean;
  /** Bill reminder field on update settings notifications request. */
  billReminder: boolean;
  /** Quota warning field on update settings notifications request. */
  quotaWarning: boolean;
}
