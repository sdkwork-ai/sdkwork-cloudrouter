import type { JsonValue } from './json-value';

/** Messaging suppression create response schema exposed by Claw Router. */
export interface MessagingSuppressionCreateResponse {
  /** Channel field on messaging suppression create response. */
  channel?: string;
  /** Id field on messaging suppression create response. */
  id?: string;
  /** Status field on messaging suppression create response. */
  status?: string;
}
