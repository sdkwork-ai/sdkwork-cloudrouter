/** Upstream recharge order schema exposed by Cloud Router. */
export interface UpstreamRechargeOrder {
  /** Amount field on upstream recharge order. */
  amount: string;
  /** Cashier url field on upstream recharge order. */
  cashierUrl: string;
  /** Created at field on upstream recharge order. */
  createdAt: string;
  /** Currency code field on upstream recharge order. */
  currencyCode: string;
  /** Expires at field on upstream recharge order. */
  expiresAt: string;
  /** Id field on upstream recharge order. */
  id: string;
  /** Next action field on upstream recharge order. */
  nextAction: 'scan_qr' | 'redirect' | 'none';
  /** Order id field on upstream recharge order. */
  orderId: string;
  /** Order no field on upstream recharge order. */
  orderNo: string;
  /** Out trade no field on upstream recharge order. */
  outTradeNo: string;
  /** Paid at field on upstream recharge order. */
  paidAt: string | null;
  /** Points field on upstream recharge order. */
  points: number;
  /** Qr code payload field on upstream recharge order. */
  qrCodePayload: string;
  /** Status field on upstream recharge order. */
  status: string;
}
