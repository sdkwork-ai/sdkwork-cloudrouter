import type { AppRoutingRequestTrace } from './app-routing-request-trace';
import type { PageInfo } from './page-info';

/** App routing request trace list response schema exposed by Claw Router. */
export interface AppRoutingRequestTraceListResponse {
  /** Items field on app routing request trace list response. */
  items: AppRoutingRequestTrace[];
  /** Page info field on app routing request trace list response. */
  pageInfo: PageInfo;
}
