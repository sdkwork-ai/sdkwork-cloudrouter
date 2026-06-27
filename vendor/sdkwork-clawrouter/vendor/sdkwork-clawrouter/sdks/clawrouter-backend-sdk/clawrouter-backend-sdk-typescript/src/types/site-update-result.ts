import type { AdminSiteMutationResponse } from './admin-site-mutation-response';

/** Site update result schema exposed by Claw Router. */
export interface SiteUpdateResult {
  /** Business response code. */
  code: string;
  /** Data field on site update result. */
  data?: AdminSiteMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
