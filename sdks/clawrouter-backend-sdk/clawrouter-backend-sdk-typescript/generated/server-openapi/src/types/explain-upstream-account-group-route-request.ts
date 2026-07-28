/** Explain upstream account group route request schema exposed by Claw Router. */
export interface ExplainUpstreamAccountGroupRouteRequest {
  /** Api code field on explain upstream account group route request. */
  apiCode?: string | null;
  /** Api key id field on explain upstream account group route request. */
  apiKeyId: string;
  /** Billing meter field on explain upstream account group route request. */
  billingMeter?: string | null;
  /** Capability field on explain upstream account group route request. */
  capability?: string | null;
  /** Catalog key field on explain upstream account group route request. */
  catalogKey?: string | null;
  /** Model field on explain upstream account group route request. */
  model?: string | null;
  /** Resource code field on explain upstream account group route request. */
  resourceCode: string;
  /** Route key field on explain upstream account group route request. */
  routeKey?: string | null;
}
