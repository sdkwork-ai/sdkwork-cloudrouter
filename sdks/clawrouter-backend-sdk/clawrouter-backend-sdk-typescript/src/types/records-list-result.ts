import type { AdminRecordLogsResponse } from './admin-record-logs-response';

/** Records list result schema exposed by Claw Router. */
export interface RecordsListResult {
  /** Business response code. */
  code: string;
  /** Data field on records list result. */
  data?: AdminRecordLogsResponse;
  /** Human-readable response message. */
  msg?: string;
}
