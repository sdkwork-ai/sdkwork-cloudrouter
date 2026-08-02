import type { PageInfo } from './page-info';
import type { PaymentProviderInventoryItem } from './payment-provider-inventory-item';

/** Payment provider inventory list response schema exposed by Claw Router. */
export interface PaymentProviderInventoryListResponse {
  /** Items field on payment provider inventory list response. */
  items: PaymentProviderInventoryItem[];
  /** Page info field on payment provider inventory list response. */
  pageInfo: PageInfo;
}
