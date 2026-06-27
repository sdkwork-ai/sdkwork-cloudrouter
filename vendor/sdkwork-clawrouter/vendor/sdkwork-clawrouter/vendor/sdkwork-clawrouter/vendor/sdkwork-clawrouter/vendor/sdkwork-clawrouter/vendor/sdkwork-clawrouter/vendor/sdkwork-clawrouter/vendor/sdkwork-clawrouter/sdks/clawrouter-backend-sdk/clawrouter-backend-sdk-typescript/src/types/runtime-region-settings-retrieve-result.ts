import type { AdminRuntimeRegionSettingsResponse } from './admin-runtime-region-settings-response';

/** Runtime region settings retrieve result schema exposed by Claw Router. */
export interface RuntimeRegionSettingsRetrieveResult {
  /** Business response code. */
  code: string;
  /** Data field on runtime region settings retrieve result. */
  data?: AdminRuntimeRegionSettingsResponse;
  /** Human-readable response message. */
  msg?: string;
}
