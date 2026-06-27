import type { AdminSiteDeleteResponse } from './admin-site-delete-response';

/** Site delete result schema exposed by Claw Router. */
export interface SiteDeleteResult {
  /** Business response code. */
  code: string;
  /** Data field on site delete result. */
  data?: AdminSiteDeleteResponse;
  /** Human-readable response message. */
  msg?: string;
}
