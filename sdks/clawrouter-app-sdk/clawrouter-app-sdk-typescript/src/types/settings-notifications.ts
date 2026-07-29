/** Settings notifications schema exposed by Claw Router. */
export interface SettingsNotifications {
  /** Api monitor field on settings notifications. */
  apiMonitor: boolean;
  /** Bill reminder field on settings notifications. */
  billReminder: boolean;
  /** Quota warning field on settings notifications. */
  quotaWarning: boolean;
}
