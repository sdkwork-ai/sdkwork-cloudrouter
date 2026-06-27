import type { MessagingTemplateVersionPublishResponse } from './messaging-template-version-publish-response';

/** Templates versions publish result schema exposed by Claw Router. */
export interface TemplatesVersionsPublishResult {
  /** Business response code. */
  code: string;
  /** Data field on templates versions publish result. */
  data?: MessagingTemplateVersionPublishResponse;
  /** Human-readable response message. */
  msg?: string;
}
