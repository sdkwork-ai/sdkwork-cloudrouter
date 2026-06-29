/** Shops current business hours update result schema exposed by Claw Router. */
export interface ShopsCurrentBusinessHoursUpdateResult {
  /** Business response code. */
  code: string;
  /** No business data returned by this operation. */
  data?: never;
  /** Human-readable response message. */
  msg?: string;
}
