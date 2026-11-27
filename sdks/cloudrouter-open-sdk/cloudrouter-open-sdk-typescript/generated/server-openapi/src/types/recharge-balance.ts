/** Recharge balance schema exposed by Cloud Router. */
export interface RechargeBalance {
  /** Available balance as a decimal string in `unit`. */
  amount: string;
  /** Time the snapshot was produced (RFC 3339). */
  checkedAt: string;
  /** ISO-4217 presentation currency when known. */
  currencyCode: string | null;
  /** Frozen (held) balance as a decimal string in `unit`. */
  frozen: string;
  /** Balance asset unit label, for example TOKEN_BANK. */
  unit: string;
}
