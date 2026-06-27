import type { MessagingTemplateListResponse } from './messaging-template-list-response';

/** Templates list result schema exposed by Claw Router. */
export interface TemplatesListResult {
  /** Business response code. */
  code: string;
  /** Data field on templates list result. */
  data?: MessagingTemplateListResponse;
  /** Human-readable response message. */
  msg?: string;
}
