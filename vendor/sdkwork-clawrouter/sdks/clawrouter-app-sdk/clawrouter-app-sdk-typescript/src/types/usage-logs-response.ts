import type { UsageLogItem } from './usage-log-item';

/** Usage logs response schema exposed by Claw Router. */
export interface UsageLogsResponse {
  /** Logs field on usage logs response. */
  logs: UsageLogItem[];
  /** Page field on usage logs response. */
  page: string;
  /** Page size field on usage logs response. */
  pageSize: string;
  /** Total field on usage logs response. */
  total: string;
}
