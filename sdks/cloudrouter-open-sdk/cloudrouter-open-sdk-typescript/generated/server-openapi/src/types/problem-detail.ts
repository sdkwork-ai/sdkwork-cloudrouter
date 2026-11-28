/** Problem detail schema exposed by Cloud Router. */
export interface ProblemDetail {
  /** Numeric SDKWork platform error code. */
  code: number;
  /** Human-readable problem detail. */
  detail: string;
  /** Optional localization key for the problem. */
  i18nKey?: string | null;
  /** HTTP status code. */
  status: number;
  /** Short human-readable problem title. */
  title: string;
  /** Server trace identifier for support and logs. */
  traceId: string;
}
