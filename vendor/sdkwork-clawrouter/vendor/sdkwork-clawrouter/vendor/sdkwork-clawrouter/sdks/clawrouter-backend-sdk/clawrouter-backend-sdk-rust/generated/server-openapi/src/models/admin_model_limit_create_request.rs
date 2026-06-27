use serde::{Deserialize, Serialize};

/// Admin model limit create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelLimitCreateRequest {
    /// AI channel group code or identifier.
    #[serde(rename = "channelGroup")]
    pub channel_group: String,

    /// AI model identifier.
    pub model: String,

    /// Maximum requests per minute for the model and group.
    pub rpm: i64,

    /// Status field on admin model limit create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Maximum tokens per minute for the model and group.
    pub tpm: i64,
}
