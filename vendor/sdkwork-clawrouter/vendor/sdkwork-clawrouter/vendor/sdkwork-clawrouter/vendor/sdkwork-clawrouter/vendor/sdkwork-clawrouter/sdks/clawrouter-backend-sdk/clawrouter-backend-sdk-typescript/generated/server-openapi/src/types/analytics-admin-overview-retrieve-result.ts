import type { AdminAnalyticsOverviewResponse } from './admin-analytics-overview-response';

/** Analytics admin overview retrieve result schema exposed by Claw Router. */
export interface AnalyticsAdminOverviewRetrieveResult {
  /** Business response code. */
  code: string;
  /** Data field on analytics admin overview retrieve result. */
  data?: AdminAnalyticsOverviewResponse;
  /** Human-readable response message. */
  msg?: string;
}
