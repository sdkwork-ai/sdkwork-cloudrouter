/** Recharges orders retrieve result schema exposed by Claw Router. */
export interface RechargesOrdersRetrieveResult {
  /** Business response code. */
  code: string;
  /** No business data returned by this operation. */
  data?: never;
  /** Human-readable response message. */
  msg?: string;
}
