/** Admin analytics insight schema exposed by Claw Router. */
export interface AdminAnalyticsInsight {
  /** Detail field on admin analytics insight. */
  detail: string;
  /** Key field on admin analytics insight. */
  key: string;
  /** Severity field on admin analytics insight. */
  severity: 'info' | 'warning' | 'critical';
  /** Title field on admin analytics insight. */
  title: string;
  /** Value field on admin analytics insight. */
  value: string;
}
