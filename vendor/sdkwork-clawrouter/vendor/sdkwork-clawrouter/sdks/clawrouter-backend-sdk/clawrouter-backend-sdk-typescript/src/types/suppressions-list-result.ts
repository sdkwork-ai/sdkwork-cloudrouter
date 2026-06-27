import type { MessagingSuppressionListResponse } from './messaging-suppression-list-response';

/** Suppressions list result schema exposed by Claw Router. */
export interface SuppressionsListResult {
  /** Business response code. */
  code: string;
  /** Data field on suppressions list result. */
  data?: MessagingSuppressionListResponse;
  /** Human-readable response message. */
  msg?: string;
}
