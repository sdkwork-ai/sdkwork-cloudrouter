import type { MessagingTemplateSendResponse } from './messaging-template-send-response';

/** Template sends create result schema exposed by Claw Router. */
export interface TemplateSendsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on template sends create result. */
  data?: MessagingTemplateSendResponse;
  /** Human-readable response message. */
  msg?: string;
}
