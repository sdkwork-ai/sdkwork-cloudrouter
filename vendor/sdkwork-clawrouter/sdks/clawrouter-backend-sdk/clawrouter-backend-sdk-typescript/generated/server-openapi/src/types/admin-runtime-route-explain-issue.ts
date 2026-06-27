/** Admin runtime route explain issue schema exposed by Claw Router. */
export interface AdminRuntimeRouteExplainIssue {
  /** Code field on admin runtime route explain issue. */
  code: 'route.unavailable' | 'pricing.unavailable';
  /** Message field on admin runtime route explain issue. */
  message: string;
  /** Severity field on admin runtime route explain issue. */
  severity: 'blocking' | 'warning' | 'info';
}
