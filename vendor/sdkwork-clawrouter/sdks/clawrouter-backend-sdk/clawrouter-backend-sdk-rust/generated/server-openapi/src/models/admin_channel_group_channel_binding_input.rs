use serde::{Deserialize, Serialize};

/// Admin channel group channel binding input schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminChannelGroupChannelBindingInput {
    /// Api scope field on admin channel group channel binding input.
    #[serde(rename = "apiScope")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub api_scope: Option<Vec<String>>,

    /// Capabilities field on admin channel group channel binding input.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub capabilities: Option<Vec<String>>,

    /// Channel id field on admin channel group channel binding input.
    #[serde(rename = "channelId")]
    pub channel_id: String,

    /// Priority field on admin channel group channel binding input.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub priority: Option<i64>,

    /// Resource codes field on admin channel group channel binding input.
    #[serde(rename = "resourceCodes")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resource_codes: Option<Vec<String>>,

    /// Status field on admin channel group channel binding input.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Weight field on admin channel group channel binding input.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub weight: Option<i64>,
}
