import type { SiteRuntimeSettingsResponse } from './site-runtime-settings-response';

/** Site runtime retrieve result schema exposed by Claw Router. */
export interface SiteRuntimeRetrieveResult {
  /** Business response code. */
  code: string;
  /** Data field on site runtime retrieve result. */
  data?: SiteRuntimeSettingsResponse;
  /** Human-readable response message. */
  msg?: string;
}
