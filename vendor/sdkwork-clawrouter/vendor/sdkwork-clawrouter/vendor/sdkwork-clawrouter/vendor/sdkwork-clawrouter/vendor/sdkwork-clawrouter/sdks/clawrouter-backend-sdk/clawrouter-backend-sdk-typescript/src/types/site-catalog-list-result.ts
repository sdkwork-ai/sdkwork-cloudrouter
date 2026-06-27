import type { AdminSitesResponse } from './admin-sites-response';

/** Site catalog list result schema exposed by Claw Router. */
export interface SiteCatalogListResult {
  /** Business response code. */
  code: string;
  /** Data field on site catalog list result. */
  data?: AdminSitesResponse;
  /** Human-readable response message. */
  msg?: string;
}
