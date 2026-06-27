import type { MessagingSendRequestListResponse } from './messaging-send-request-list-response';

/** Send requests list result schema exposed by Claw Router. */
export interface SendRequestsListResult {
  /** Business response code. */
  code: string;
  /** Data field on send requests list result. */
  data?: MessagingSendRequestListResponse;
  /** Human-readable response message. */
  msg?: string;
}
