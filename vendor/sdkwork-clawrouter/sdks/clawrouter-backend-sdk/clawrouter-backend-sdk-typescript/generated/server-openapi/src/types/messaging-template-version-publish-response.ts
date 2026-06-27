import type { JsonValue } from './json-value';

/** Messaging template version publish response schema exposed by Claw Router. */
export interface MessagingTemplateVersionPublishResponse {
  /** Channel field on messaging template version publish response. */
  channel?: string;
  /** Id field on messaging template version publish response. */
  id?: string;
  /** Status field on messaging template version publish response. */
  status?: string;
}
