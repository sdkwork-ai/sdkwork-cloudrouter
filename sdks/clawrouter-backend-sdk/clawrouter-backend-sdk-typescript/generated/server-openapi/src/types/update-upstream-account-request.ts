/** Update upstream account request schema exposed by Claw Router. */
export interface UpdateUpstreamAccountRequest {
  /** Account name field on update upstream account request. */
  accountName?: string;
  /** Account type field on update upstream account request. */
  accountType?: string | null;
  /** Auth method code field on update upstream account request. */
  authMethodCode?: string;
  /** Contract cost multiplier field on update upstream account request. */
  contractCostMultiplier?: string | null;
  /** Environment field on update upstream account request. */
  environment?: number | null;
  /** External account id field on update upstream account request. */
  externalAccountId?: string | null;
  /** Preferred endpoint id field on update upstream account request. */
  preferredEndpointId?: string | null;
  /** Quota limit field on update upstream account request. */
  quotaLimit?: string | null;
  /** Region code field on update upstream account request. */
  regionCode?: string | null;
  /** Rpm limit field on update upstream account request. */
  rpmLimit?: string | null;
  /** Status field on update upstream account request. */
  status?: number | null;
  /** Supplier id field on update upstream account request. */
  supplierId?: string;
  /** Timeout ms field on update upstream account request. */
  timeoutMs?: number | null;
  /** Upstream balance currency field on update upstream account request. */
  upstreamBalanceCurrency?: string | null;
}
