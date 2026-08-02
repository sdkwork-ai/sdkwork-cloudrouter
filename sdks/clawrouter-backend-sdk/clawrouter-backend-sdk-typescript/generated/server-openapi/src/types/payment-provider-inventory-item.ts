/** Payment provider inventory item schema exposed by Claw Router. */
export interface PaymentProviderInventoryItem {
  /** Capabilities field on payment provider inventory item. */
  capabilities: ('payment_intent' | 'payment_query' | 'payment_close' | 'refund' | 'webhook' | 'reconciliation')[];
  /** Created at field on payment provider inventory item. */
  createdAt?: string | null;
  /** Display name field on payment provider inventory item. */
  displayName: string;
  /** Id field on payment provider inventory item. */
  id: string;
  /** Provider code field on payment provider inventory item. */
  providerCode: 'wechat_pay' | 'alipay' | 'stripe' | 'paypal' | 'apple_pay' | 'google_pay';
  /** Provider type field on payment provider inventory item. */
  providerType: string;
  /** Sort order field on payment provider inventory item. */
  sortOrder: number;
  /** Status field on payment provider inventory item. */
  status: 'active' | 'inactive' | 'disabled';
  /** Supported countries field on payment provider inventory item. */
  supportedCountries: string[];
  /** Supported currencies field on payment provider inventory item. */
  supportedCurrencies: string[];
  /** Updated at field on payment provider inventory item. */
  updatedAt?: string | null;
}
