import type { JsonValue } from './json-value';

/** Messaging route rule create response schema exposed by Claw Router. */
export interface MessagingRouteRuleCreateResponse {
  /** Channel field on messaging route rule create response. */
  channel?: string;
  /** Id field on messaging route rule create response. */
  id?: string;
  /** Status field on messaging route rule create response. */
  status?: string;
}
