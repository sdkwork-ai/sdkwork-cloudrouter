/** Recharge order create request schema exposed by Cloud Router. */
export interface RechargeOrderCreateRequest {
  /** Custom amount in major units; mutually exclusive with `packageId`. */
  amount?: string | null;
  /** Caller-side idempotency key scoped to the API key owner. */
  idempotencyKey?: string | null;
  /** Fixed package id; mutually exclusive with `amount`. */
  packageId?: string | null;
  /** Relay payment method key; omit to let the relay choose its default. */
  paymentMethod?: string | null;
}
