import type { MessagingTestSendResponse } from './messaging-test-send-response';

/** Diagnostics test sends create result schema exposed by Claw Router. */
export interface DiagnosticsTestSendsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on diagnostics test sends create result. */
  data?: MessagingTestSendResponse;
  /** Human-readable response message. */
  msg?: string;
}
