/** Shops readiness retrieve result schema exposed by Claw Router. */
export interface ShopsReadinessRetrieveResult {
  /** Business response code. */
  code: string;
  /** No business data returned by this operation. */
  data?: never;
  /** Human-readable response message. */
  msg?: string;
}
