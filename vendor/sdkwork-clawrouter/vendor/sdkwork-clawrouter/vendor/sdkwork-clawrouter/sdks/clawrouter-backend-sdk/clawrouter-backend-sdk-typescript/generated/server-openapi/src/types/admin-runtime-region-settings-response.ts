/** Admin runtime region settings response schema exposed by Claw Router. */
export interface AdminRuntimeRegionSettingsResponse {
  /** Lowercase runtime region code. The default value is cn. */
  currentRegionCode: string;
  /** Human-readable runtime region name displayed in admin operations. */
  currentRegionName: string;
  /** Operator-facing explanation for how this runtime region is used. */
  remark: string;
}
