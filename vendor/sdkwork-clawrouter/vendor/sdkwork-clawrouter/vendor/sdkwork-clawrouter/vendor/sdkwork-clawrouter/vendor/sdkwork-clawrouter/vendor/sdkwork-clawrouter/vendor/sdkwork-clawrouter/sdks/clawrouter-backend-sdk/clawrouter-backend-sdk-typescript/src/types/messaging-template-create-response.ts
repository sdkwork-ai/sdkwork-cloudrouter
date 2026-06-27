import type { JsonValue } from './json-value';

/** Messaging template create response schema exposed by Claw Router. */
export interface MessagingTemplateCreateResponse {
  /** Channel field on messaging template create response. */
  channel?: string;
  /** Id field on messaging template create response. */
  id?: string;
  /** Status field on messaging template create response. */
  status?: string;
}
