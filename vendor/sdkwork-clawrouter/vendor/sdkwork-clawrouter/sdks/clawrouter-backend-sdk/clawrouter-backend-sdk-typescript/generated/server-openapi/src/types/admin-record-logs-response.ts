import type { AdminRecordLogItem } from './admin-record-log-item';

/** Admin record logs response schema exposed by Claw Router. */
export interface AdminRecordLogsResponse {
  /** Logs field on admin record logs response. */
  logs: AdminRecordLogItem[];
  /** Page field on admin record logs response. */
  page: string;
  /** Page size field on admin record logs response. */
  pageSize: string;
  /** Total field on admin record logs response. */
  total: string;
}
