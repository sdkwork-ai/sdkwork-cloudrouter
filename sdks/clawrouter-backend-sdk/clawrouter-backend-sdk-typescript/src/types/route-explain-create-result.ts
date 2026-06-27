import type { AdminRuntimeRouteExplainResponse } from './admin-runtime-route-explain-response';

/** Route explain create result schema exposed by Claw Router. */
export interface RouteExplainCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on route explain create result. */
  data?: AdminRuntimeRouteExplainResponse;
  /** Human-readable response message. */
  msg?: string;
}
