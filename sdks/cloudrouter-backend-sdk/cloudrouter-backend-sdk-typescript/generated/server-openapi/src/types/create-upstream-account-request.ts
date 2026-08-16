import type { LlmProtocolConfig } from './llm-protocol-config';

/** Create upstream account request schema exposed by Cloud Router. */
export interface CreateUpstreamAccountRequest {
  /** Account code field on create upstream account request. */
  accountCode?: string | null;
  /** Account name field on create upstream account request. */
  accountName: string;
  /** Account type field on create upstream account request. */
  accountType?: string | null;
  /** Api key field on create upstream account request. */
  apiKey?: string | null;
  /** Auth method code field on create upstream account request. */
  authMethodCode: string;
  /** Contract cost multiplier field on create upstream account request. */
  contractCostMultiplier?: string | null;
  /** Default base url field on create upstream account request. */
  defaultBaseUrl?: string | null;
  /** Environment field on create upstream account request. */
  environment?: number | null;
  /** External account id field on create upstream account request. */
  externalAccountId?: string | null;
  /** Preferred endpoint id field on create upstream account request. */
  preferredEndpointId?: string | null;
  /** Protocols field on create upstream account request. */
  protocols?: LlmProtocolConfig[] | null;
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
