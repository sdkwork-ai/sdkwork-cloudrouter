/** Wallet accounts cash retrieve result schema exposed by Claw Router. */
export interface WalletAccountsCashRetrieveResult {
  /** Business response code. */
  code: string;
  /** No business data returned by this operation. */
  data?: never;
  /** Human-readable response message. */
  msg?: string;
}
