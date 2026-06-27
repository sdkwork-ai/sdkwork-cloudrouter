import type { MessagingRouteRuleListResponse } from './messaging-route-rule-list-response';

/** Route rules list result schema exposed by Claw Router. */
export interface RouteRulesListResult {
  /** Business response code. */
  code: string;
  /** Data field on route rules list result. */
  data?: MessagingRouteRuleListResponse;
  /** Human-readable response message. */
  msg?: string;
}
