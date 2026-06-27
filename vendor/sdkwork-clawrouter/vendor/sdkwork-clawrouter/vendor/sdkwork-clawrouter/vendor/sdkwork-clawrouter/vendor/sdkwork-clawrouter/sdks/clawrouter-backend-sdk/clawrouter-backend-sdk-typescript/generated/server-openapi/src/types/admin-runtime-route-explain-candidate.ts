/** Admin runtime route explain candidate schema exposed by Claw Router. */
export interface AdminRuntimeRouteExplainCandidate {
  /** Api code field on admin runtime route explain candidate. */
  apiCode: string;
  /** Catalog key field on admin runtime route explain candidate. */
  catalogKey: string | null;
  /** Channel group code field on admin runtime route explain candidate. */
  channelGroupCode: string;
  /** Channel group id field on admin runtime route explain candidate. */
  channelGroupId: string;
  /** Channel id field on admin runtime route explain candidate. */
  channelId: string;
  /** Credential id field on admin runtime route explain candidate. */
  credentialId: string | null;
  /** Credential rotation field on admin runtime route explain candidate. */
  credentialRotation: string | null;
  /** Kind field on admin runtime route explain candidate. */
  kind: 'model' | 'channel';
  /** Policy id field on admin runtime route explain candidate. */
  policyId: string | null;
  /** Pricing plan code field on admin runtime route explain candidate. */
  pricingPlanCode: string;
  /** Provider code field on admin runtime route explain candidate. */
  providerCode: string;
  /** Provider model field on admin runtime route explain candidate. */
  providerModel: string | null;
  /** Region code field on admin runtime route explain candidate. */
  regionCode: string;
  /** Requested model field on admin runtime route explain candidate. */
  requestedModel: string | null;
  /** Rule id field on admin runtime route explain candidate. */
  ruleId: string | null;
  /** Timeout ms field on admin runtime route explain candidate. */
  timeoutMs: number | null;
}
