export interface AdminBillingDecision {
  invocationId: string;
  /** Frozen points, exact integer text. */
  holdAmount?: string | null;
  /** Points captured from the hold. */
  holdSettledAmount?: string | null;
  /** 1 held, 2 settled, 3 released, 4 expired. */
  holdStatus?: number | null;
  holdExpiresAt?: string | null;
  /** int64 rendered as a string. */
  chargeLineCount?: string;
  chargeAmount?: string;
  /** int64 rendered as a string. */
  debitPoints?: string;
  measuredQuantity?: string;
  verdict: 'not_billed' | 'held' | 'overdue' | 'settled' | 'released' | 'expired';
}
