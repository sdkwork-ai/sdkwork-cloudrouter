use serde::{Deserialize, Serialize};

/// Admin channel group channel binding item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminChannelGroupChannelBindingItem {
    /// Api scope field on admin channel group channel binding item.
    #[serde(rename = "apiScope")]
    pub api_scope: Vec<String>,

    /// Capabilities field on admin channel group channel binding item.
    pub capabilities: Vec<String>,

    /// Channel code field on admin channel group channel binding item.
    #[serde(rename = "channelCode")]
    pub channel_code: String,

    /// Channel group id field on admin channel group channel binding item.
    #[serde(rename = "channelGroupId")]
    pub channel_group_id: String,

    /// Channel id field on admin channel group channel binding item.
    #[serde(rename = "channelId")]
    pub channel_id: String,

    /// Channel name field on admin channel group channel binding item.
    #[serde(rename = "channelName")]
    pub channel_name: String,

    /// Health status field on admin channel group channel binding item.
    #[serde(rename = "healthStatus")]
    pub health_status: String,

    /// Id field on admin channel group channel binding item.
    pub id: String,

    /// Priority field on admin channel group channel binding item.
    pub priority: i64,

    /// Provider code field on admin channel group channel binding item.
    #[serde(rename = "providerCode")]
    pub provider_code: String,

    /// Provider name field on admin channel group channel binding item.
    #[serde(rename = "providerName")]
    pub provider_name: String,

    /// Resource codes field on admin channel group channel binding item.
    #[serde(rename = "resourceCodes")]
    pub resource_codes: Vec<String>,

    /// Status field on admin channel group channel binding item.
    pub status: String,

    /// Weight field on admin channel group channel binding item.
    pub weight: i64,
}
