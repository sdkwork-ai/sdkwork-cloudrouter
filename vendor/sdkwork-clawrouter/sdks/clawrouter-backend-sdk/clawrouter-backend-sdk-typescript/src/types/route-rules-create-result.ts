import type { MessagingRouteRuleCreateResponse } from './messaging-route-rule-create-response';

/** Route rules create result schema exposed by Claw Router. */
export interface RouteRulesCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on route rules create result. */
  data?: MessagingRouteRuleCreateResponse;
  /** Human-readable response message. */
  msg?: string;
}
