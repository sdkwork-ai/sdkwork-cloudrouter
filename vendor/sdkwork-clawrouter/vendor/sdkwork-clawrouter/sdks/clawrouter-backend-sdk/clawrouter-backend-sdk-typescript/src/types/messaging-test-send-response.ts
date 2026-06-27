import type { JsonValue } from './json-value';

/** Messaging test send response schema exposed by Claw Router. */
export interface MessagingTestSendResponse {
  /** Channel field on messaging test send response. */
  channel?: string;
  /** Id field on messaging test send response. */
  id?: string;
  /** Status field on messaging test send response. */
  status?: string;
}
