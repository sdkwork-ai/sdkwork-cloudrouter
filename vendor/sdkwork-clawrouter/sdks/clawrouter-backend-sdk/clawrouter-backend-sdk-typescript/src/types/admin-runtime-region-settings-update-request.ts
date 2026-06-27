/** Admin runtime region settings update request schema exposed by Claw Router. */
export interface AdminRuntimeRegionSettingsUpdateRequest {
  /** Lowercase runtime region code, for example cn, us, eu, or global. */
  currentRegionCode?: string;
  /** Human-readable runtime region name displayed in admin operations. */
  currentRegionName?: string;
  /** Operator-facing explanation for how this runtime region is used. */
  remark?: string;
}
