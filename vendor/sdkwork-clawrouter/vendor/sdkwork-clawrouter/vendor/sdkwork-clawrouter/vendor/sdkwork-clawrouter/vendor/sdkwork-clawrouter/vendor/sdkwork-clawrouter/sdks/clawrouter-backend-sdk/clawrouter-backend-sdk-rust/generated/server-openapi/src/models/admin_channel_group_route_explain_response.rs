use serde::{Deserialize, Serialize};

use crate::models::{AdminChannelGroupRouteExplainIssue};

/// Admin channel group route explain response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminChannelGroupRouteExplainResponse {
    /// Active healthy binding count field on admin channel group route explain response.
    #[serde(rename = "activeHealthyBindingCount")]
    pub active_healthy_binding_count: i64,

    /// Api scope field on admin channel group route explain response.
    #[serde(rename = "apiScope")]
    pub api_scope: Vec<String>,

    /// Capabilities field on admin channel group route explain response.
    pub capabilities: Vec<String>,

    /// Configured resource access count field on admin channel group route explain response.
    #[serde(rename = "configuredResourceAccessCount")]
    pub configured_resource_access_count: i64,

    /// Configured resource group access count field on admin channel group route explain response.
    #[serde(rename = "configuredResourceGroupAccessCount")]
    pub configured_resource_group_access_count: i64,

    /// Effective resource codes field on admin channel group route explain response.
    #[serde(rename = "effectiveResourceCodes")]
    pub effective_resource_codes: Vec<String>,

    /// Issue codes field on admin channel group route explain response.
    #[serde(rename = "issueCodes")]
    pub issue_codes: Vec<String>,

    /// Issues field on admin channel group route explain response.
    pub issues: Vec<AdminChannelGroupRouteExplainIssue>,

    /// Ready field on admin channel group route explain response.
    pub ready: bool,

    /// Resource codes field on admin channel group route explain response.
    #[serde(rename = "resourceCodes")]
    pub resource_codes: Vec<String>,

    /// Resource group codes field on admin channel group route explain response.
    #[serde(rename = "resourceGroupCodes")]
    pub resource_group_codes: Vec<String>,

    /// Routable binding count field on admin channel group route explain response.
    #[serde(rename = "routableBindingCount")]
    pub routable_binding_count: i64,

    /// Explains persisted backend routing configuration, not the full runtime selector.
    pub source: String,
}
