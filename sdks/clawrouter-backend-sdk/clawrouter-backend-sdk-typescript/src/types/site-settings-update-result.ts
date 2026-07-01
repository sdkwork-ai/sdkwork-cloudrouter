import type { AdminSiteSettingsResponse } from './admin-site-settings-response';

/** Site settings update result schema exposed by Claw Router. */
export interface SiteSettingsUpdateResult {
  /** Business response code. */
  code: string;
  /** Data field on site settings update result. */
  data?: AdminSiteSettingsResponse;
  /** Human-readable response message. */
  msg?: string;
}
