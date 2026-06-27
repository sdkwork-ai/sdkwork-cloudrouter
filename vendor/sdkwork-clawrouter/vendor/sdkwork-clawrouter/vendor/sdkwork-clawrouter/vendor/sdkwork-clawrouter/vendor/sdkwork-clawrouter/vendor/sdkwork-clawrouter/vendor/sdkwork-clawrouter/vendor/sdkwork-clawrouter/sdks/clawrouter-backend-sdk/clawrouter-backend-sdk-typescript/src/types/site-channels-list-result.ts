import type { AdminSiteChannelsResponse } from './admin-site-channels-response';

/** Site channels list result schema exposed by Claw Router. */
export interface SiteChannelsListResult {
  /** Business response code. */
  code: string;
  /** Data field on site channels list result. */
  data?: AdminSiteChannelsResponse;
  /** Human-readable response message. */
  msg?: string;
}
