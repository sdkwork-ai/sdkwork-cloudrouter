use serde::{Deserialize, Serialize};

/// Routing api key item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RoutingApiKeyItem {
    /// Copyable key field on routing api key item.
    #[serde(rename = "copyableKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub copyable_key: Option<String>,

    /// Created at field on routing api key item.
    #[serde(rename = "createdAt")]
    pub created_at: String,

    /// Display key field on routing api key item.
    #[serde(rename = "displayKey")]
    pub display_key: String,

    /// Id field on routing api key item.
    pub id: String,

    /// Name field on routing api key item.
    pub name: String,

    /// Status field on routing api key item.
    pub status: String,

    /// Total usage field on routing api key item.
    #[serde(rename = "totalUsage")]
    pub total_usage: String,
}
