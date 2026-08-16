import type { LlmProtocolConfig } from './llm-protocol-config';

/** Upstream account schema exposed by Cloud Router. */
export interface UpstreamAccount {
  /** Account code field on upstream account. */
  accountCode: string;
  /** Account name field on upstream account. */
  accountName: string;
  /** Account type field on upstream account. */
  accountType: string;
  /** Auth method code field on upstream account. */
  authMethodCode: string;
  /** Contract cost multiplier field on upstream account. */
  contractCostMultiplier: string;
  /** Default base url field on upstream account. */
  defaultBaseUrl: string | null;
  /** Environment field on upstream account. */
  environment: number | null;
  /** External account id field on upstream account. */
  externalAccountId: string | null;
  /** Health status field on upstream account. */
  healthStatus: number;
  /** Id field on upstream account. */
  id: string;
  /** Preferred endpoint id field on upstream account. */
  preferredEndpointId: string | null;
  /** Protocols field on upstream account. */
  protocols: LlmProtocolConfig[];
  /** Quota limit field on upstream account. */
  quotaLimit: string | null;
  /** Quota used field on upstream account. */
  quotaUsed: string | null;
  /** Region code field on upstream account. */
  regionCode: string | null;
  /** Rpm limit field on upstream account. */
  rpmLimit: string | null;
  /** Status field on upstream account. */
  status: number;
  /** Supplier code field on upstream account. */
  supplierCode: string;
  /** Supplier id field on upstream account. */
  supplierId: string;
  /** Timeout ms field on upstream account. */
  timeoutMs: number | null;
  /** Updated at field on upstream account. */
  updatedAt: string;
  /** Upstream balance amount field on upstream account. */
  upstreamBalanceAmount: string | null;
  /** Upstream balance currency field on upstream account. */
  upstreamBalanceCurrency: string | null;
  /** Uuid field on upstream account. */
  uuid: string;
  /** Version field on upstream account. */
  version: string;
}
