import type { JsonValue } from './json-value';

/** Messaging template send response schema exposed by Claw Router. */
export interface MessagingTemplateSendResponse {
  /** Channel field on messaging template send response. */
  channel?: string;
  /** Id field on messaging template send response. */
  id?: string;
  /** Status field on messaging template send response. */
  status?: string;
}
