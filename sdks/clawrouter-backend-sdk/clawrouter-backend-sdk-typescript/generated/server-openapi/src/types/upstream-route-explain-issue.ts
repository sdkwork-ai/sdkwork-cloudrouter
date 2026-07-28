/** Upstream route explain issue schema exposed by Claw Router. */
export interface UpstreamRouteExplainIssue {
  /** Code field on upstream route explain issue. */
  code: string;
  /** Message field on upstream route explain issue. */
  message: string;
  /** Severity field on upstream route explain issue. */
  severity: 'blocking' | 'warning';
}
