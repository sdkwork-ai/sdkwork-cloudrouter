/** Upstream route explain candidate schema exposed by Claw Router. */
export interface UpstreamRouteExplainCandidate {
  /** Account group code field on upstream route explain candidate. */
  accountGroupCode: string;
  /** Account group id field on upstream route explain candidate. */
  accountGroupId: string;
  /** Account id field on upstream route explain candidate. */
  accountId: string;
  /** Api code field on upstream route explain candidate. */
  apiCode: string;
  /** Catalog key field on upstream route explain candidate. */
  catalogKey: string | null;
  /** Kind field on upstream route explain candidate. */
  kind: string;
  /** Policy id field on upstream route explain candidate. */
  policyId: string | null;
  /** Pricing plan code field on upstream route explain candidate. */
  pricingPlanCode: string;
  /** Provider model field on upstream route explain candidate. */
  providerModel: string | null;
  /** Region code field on upstream route explain candidate. */
  regionCode: string;
  /** Requested model field on upstream route explain candidate. */
  requestedModel: string | null;
  /** Rule id field on upstream route explain candidate. */
  ruleId: string | null;
  /** Supplier code field on upstream route explain candidate. */
  supplierCode: string;
  /** Timeout ms field on upstream route explain candidate. */
  timeoutMs: string | null;
}
