import type { AdminRuntimeRegionSettingsResponse } from './admin-runtime-region-settings-response';

/** Runtime region settings update result schema exposed by Claw Router. */
export interface RuntimeRegionSettingsUpdateResult {
  /** Business response code. */
  code: string;
  /** Data field on runtime region settings update result. */
  data?: AdminRuntimeRegionSettingsResponse;
  /** Human-readable response message. */
  msg?: string;
}
