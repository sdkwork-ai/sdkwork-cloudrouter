import type { AdminSiteMutationResponse } from './admin-site-mutation-response';

/** Site create result schema exposed by Claw Router. */
export interface SiteCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on site create result. */
  data?: AdminSiteMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
