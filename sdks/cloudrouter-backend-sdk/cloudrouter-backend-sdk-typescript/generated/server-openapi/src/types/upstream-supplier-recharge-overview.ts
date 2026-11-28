import type { UpstreamRechargeBalance } from './upstream-recharge-balance';
import type { UpstreamRechargeOption } from './upstream-recharge-option';

/** Upstream supplier recharge overview schema exposed by Cloud Router. */
export interface UpstreamSupplierRechargeOverview {
  /** Account code field on upstream supplier recharge overview. */
  accountCode: string | null;
  /** Account id field on upstream supplier recharge overview. */
  accountId: string | null;
  /** Agreement copy the operator must accept before paying. */
  agreement: string;
  /** Balance field on upstream supplier recharge overview. */
  balance: UpstreamRechargeBalance;
  /** Currency code field on upstream supplier recharge overview. */
  currencyCode: string;
  /** Custom amount supported field on upstream supplier recharge overview. */
  customAmountSupported: boolean;
  /** Id field on upstream supplier recharge overview. */
  id: string;
  /** Max amount field on upstream supplier recharge overview. */
  maxAmount: string | null;
  /** Min amount field on upstream supplier recharge overview. */
  minAmount: string | null;
  /** Options field on upstream supplier recharge overview. */
  options: UpstreamRechargeOption[];
  /** Points unit field on upstream supplier recharge overview. */
  pointsUnit: string;
  /** Refreshed at field on upstream supplier recharge overview. */
  refreshedAt: string;
  /** Supplier id field on upstream supplier recharge overview. */
  supplierId: string;
  /** Supplier name field on upstream supplier recharge overview. */
  supplierName: string;
  /** Supplier type field on upstream supplier recharge overview. */
  supplierType: 'official' | 'relay';
}
