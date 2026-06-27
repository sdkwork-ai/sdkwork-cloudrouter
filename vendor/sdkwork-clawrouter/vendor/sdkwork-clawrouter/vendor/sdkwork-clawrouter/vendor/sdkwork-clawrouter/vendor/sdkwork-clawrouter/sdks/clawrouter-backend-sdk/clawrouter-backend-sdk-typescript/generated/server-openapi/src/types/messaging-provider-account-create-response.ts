import type { JsonValue } from './json-value';

/** Messaging provider account create response schema exposed by Claw Router. */
export interface MessagingProviderAccountCreateResponse {
  /** Channel field on messaging provider account create response. */
  channel?: string;
  /** Id field on messaging provider account create response. */
  id?: string;
  /** Status field on messaging provider account create response. */
  status?: string;
}
