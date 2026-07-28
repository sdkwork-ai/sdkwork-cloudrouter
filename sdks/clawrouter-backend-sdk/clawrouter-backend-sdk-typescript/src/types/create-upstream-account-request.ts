/** Create upstream account request schema exposed by Claw Router. */
export interface CreateUpstreamAccountRequest {
  /** Account code field on create upstream account request. */
  accountCode: string;
  /** Account name field on create upstream account request. */
  accountName: string;
  /** Account type field on create upstream account request. */
  accountType?: string | null;
  /** Auth method code field on create upstream account request. */
  authMethodCode: string;
  /** Contract cost multiplier field on create upstream account request. */
  contractCostMultiplier?: string | null;
  /** Environment field on create upstream account request. */
  environment?: number | null;
  /** External account id field on create upstream account request. */
  externalAccountId?: string | null;
  /** Preferred endpoint id field on create upstream account request. */
  preferredEndpointId?: string | null;
  /** Quota limit field on create upstream account request. */
  quotaLimit?: string | null;
  /** Region code field on create upstream account request. */
  regionCode?: string | null;
  /** Rpm limit field on create upstream account request. */
  rpmLimit?: string | null;
  /** Status field on create upstream account request. */
  status?: number | null;
  /** Supplier id field on create upstream account request. */
  supplierId: string;
  /** Timeout ms field on create upstream account request. */
  timeoutMs?: number | null;
  /** Upstream balance currency field on create upstream account request. */
  upstreamBalanceCurrency?: string | null;
}
