import type { AdminSiteSettingsResponse } from './admin-site-settings-response';

/** Site settings retrieve result schema exposed by Claw Router. */
export interface SiteSettingsRetrieveResult {
  /** Business response code. */
  code: string;
  /** Data field on site settings retrieve result. */
  data?: AdminSiteSettingsResponse;
  /** Human-readable response message. */
  msg?: string;
}
