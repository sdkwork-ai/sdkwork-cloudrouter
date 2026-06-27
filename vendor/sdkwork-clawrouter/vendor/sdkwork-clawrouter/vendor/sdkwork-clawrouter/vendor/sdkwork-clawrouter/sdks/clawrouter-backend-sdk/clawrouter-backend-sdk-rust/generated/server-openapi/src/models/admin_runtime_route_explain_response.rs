use serde::{Deserialize, Serialize};

use crate::models::{AdminRuntimeRouteExplainCandidate, AdminRuntimeRouteExplainIssue};

/// Admin runtime route explain response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminRuntimeRouteExplainResponse {
    /// Api code field on admin runtime route explain response.
    #[serde(rename = "apiCode")]
    pub api_code: String,

    /// Api key id field on admin runtime route explain response.
    #[serde(rename = "apiKeyId")]
    pub api_key_id: String,

    /// Billing meter field on admin runtime route explain response.
    #[serde(rename = "billingMeter")]
    pub billing_meter: String,

    /// Blocked reasons field on admin runtime route explain response.
    #[serde(rename = "blockedReasons")]
    pub blocked_reasons: Vec<AdminRuntimeRouteExplainIssue>,

    /// Candidate count field on admin runtime route explain response.
    #[serde(rename = "candidateCount")]
    pub candidate_count: i64,

    /// Capability field on admin runtime route explain response.
    pub capability: String,

    /// Catalog key field on admin runtime route explain response.
    #[serde(rename = "catalogKey")]
    pub catalog_key: String,

    /// Channel group id field on admin runtime route explain response.
    #[serde(rename = "channelGroupId")]
    pub channel_group_id: String,

    /// Group code field on admin runtime route explain response.
    #[serde(rename = "groupCode")]
    pub group_code: String,

    /// Model field on admin runtime route explain response.
    pub model: String,

    /// Policy id field on admin runtime route explain response.
    #[serde(rename = "policyId")]
    pub policy_id: String,

    /// Policy snapshot version field on admin runtime route explain response.
    #[serde(rename = "policySnapshotVersion")]
    pub policy_snapshot_version: String,

    /// Pricing plan code field on admin runtime route explain response.
    #[serde(rename = "pricingPlanCode")]
    pub pricing_plan_code: String,

    /// Ready field on admin runtime route explain response.
    pub ready: bool,

    /// Resource code field on admin runtime route explain response.
    #[serde(rename = "resourceCode")]
    pub resource_code: String,

    /// Rule id field on admin runtime route explain response.
    #[serde(rename = "ruleId")]
    pub rule_id: String,

    /// Selected candidates field on admin runtime route explain response.
    #[serde(rename = "selectedCandidates")]
    pub selected_candidates: Vec<AdminRuntimeRouteExplainCandidate>,

    /// Explains the live runtime ProviderRouteSelector decision for one request shape.
    pub source: String,

    /// Warnings field on admin runtime route explain response.
    pub warnings: Vec<AdminRuntimeRouteExplainIssue>,
}
