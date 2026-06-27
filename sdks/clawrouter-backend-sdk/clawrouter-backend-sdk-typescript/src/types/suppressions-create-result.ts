import type { MessagingSuppressionCreateResponse } from './messaging-suppression-create-response';

/** Suppressions create result schema exposed by Claw Router. */
export interface SuppressionsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on suppressions create result. */
  data?: MessagingSuppressionCreateResponse;
  /** Human-readable response message. */
  msg?: string;
}
