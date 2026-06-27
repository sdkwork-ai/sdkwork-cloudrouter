import type { MessagingTemplateCreateResponse } from './messaging-template-create-response';

/** Templates create result schema exposed by Claw Router. */
export interface TemplatesCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on templates create result. */
  data?: MessagingTemplateCreateResponse;
  /** Human-readable response message. */
  msg?: string;
}
