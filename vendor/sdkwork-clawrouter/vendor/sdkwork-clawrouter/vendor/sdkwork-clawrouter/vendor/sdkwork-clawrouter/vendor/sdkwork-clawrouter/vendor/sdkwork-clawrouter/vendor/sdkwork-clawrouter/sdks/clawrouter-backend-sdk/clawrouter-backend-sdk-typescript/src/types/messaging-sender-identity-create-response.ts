import type { JsonValue } from './json-value';

/** Messaging sender identity create response schema exposed by Claw Router. */
export interface MessagingSenderIdentityCreateResponse {
  /** Channel field on messaging sender identity create response. */
  channel?: string;
  /** Id field on messaging sender identity create response. */
  id?: string;
  /** Status field on messaging sender identity create response. */
  status?: string;
}
