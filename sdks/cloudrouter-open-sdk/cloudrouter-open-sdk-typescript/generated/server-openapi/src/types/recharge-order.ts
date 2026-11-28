/** Recharge order schema exposed by Cloud Router. */
export interface RechargeOrder {
  /** Payable amount in major units as a decimal string. */
  amount: string;
  /** Cashier deep link when the relay produced one. */
  cashierUrl: string;
  /** Order creation time (RFC 3339). */
  createdAt: string;
  /** ISO-4217 currency code of `amount`. */
  currencyCode: string;
  /** Payment expiry (RFC 3339). */
  expiresAt: string;
  /** Next action to render (`scan_qr`, `redirect`, `none`). */
  nextAction: string;
  /** Relay order identifier. */
  orderId: string;
  /** Relay order number. */
  orderNo: string;
  /** Out-trade number used for payment reconciliation. */
  outTradeNo: string;
  /** Payment time (RFC 3339); null while unpaid. */
  paidAt: string | null;
  /** Points granted once paid. */
  points: number;
  /** QR payload when the relay produced one. */
  qrCodePayload: string;
  /** Order status (`pending`, `paid`, `failed`, `cancelled`). */
  status: string;
}
