use serde::{Deserialize, Serialize};

/// Admin runtime route explain candidate schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminRuntimeRouteExplainCandidate {
    /// Api code field on admin runtime route explain candidate.
    #[serde(rename = "apiCode")]
    pub api_code: String,

    /// Catalog key field on admin runtime route explain candidate.
    #[serde(rename = "catalogKey")]
    pub catalog_key: String,

    /// Channel group code field on admin runtime route explain candidate.
    #[serde(rename = "channelGroupCode")]
    pub channel_group_code: String,

    /// Channel group id field on admin runtime route explain candidate.
    #[serde(rename = "channelGroupId")]
    pub channel_group_id: String,

    /// Channel id field on admin runtime route explain candidate.
    #[serde(rename = "channelId")]
    pub channel_id: String,

    /// Credential id field on admin runtime route explain candidate.
    #[serde(rename = "credentialId")]
    pub credential_id: String,

    /// Credential rotation field on admin runtime route explain candidate.
    #[serde(rename = "credentialRotation")]
    pub credential_rotation: String,

    /// Kind field on admin runtime route explain candidate.
    pub kind: String,

    /// Policy id field on admin runtime route explain candidate.
    #[serde(rename = "policyId")]
    pub policy_id: String,

    /// Pricing plan code field on admin runtime route explain candidate.
    #[serde(rename = "pricingPlanCode")]
    pub pricing_plan_code: String,

    /// Provider code field on admin runtime route explain candidate.
    #[serde(rename = "providerCode")]
    pub provider_code: String,

    /// Provider model field on admin runtime route explain candidate.
    #[serde(rename = "providerModel")]
    pub provider_model: String,

    /// Region code field on admin runtime route explain candidate.
    #[serde(rename = "regionCode")]
    pub region_code: String,

    /// Requested model field on admin runtime route explain candidate.
    #[serde(rename = "requestedModel")]
    pub requested_model: String,

    /// Rule id field on admin runtime route explain candidate.
    #[serde(rename = "ruleId")]
    pub rule_id: String,

    /// Timeout ms field on admin runtime route explain candidate.
    #[serde(rename = "timeoutMs")]
    pub timeout_ms: i64,
}
