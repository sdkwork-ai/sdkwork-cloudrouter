use serde::{Deserialize, Serialize};

use crate::models::ArkVideoToolUsage;

/// Ark video generation token usage.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ArkVideoUsage {
    /// Output tokens billed for the generated video.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub completion_tokens: Option<i64>,

    /// Tool usage for the request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_usage: Option<ArkVideoToolUsage>,

    /// Total tokens; input tokens are not counted, so it equals `completion_tokens`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total_tokens: Option<i64>,
}
