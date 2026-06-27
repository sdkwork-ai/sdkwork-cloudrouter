use serde::{Deserialize, Serialize};

/// Chat turn response request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ChatTurnResponseRequest {
    /// Message field on chat turn response request.
    pub message: String,

    /// Metadata field on chat turn response request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Model field on chat turn response request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Provider field on chat turn response request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,

    /// Runtime adapter such as claude_code, gemini, codex, openai_compatible, or custom.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub runtime: Option<String>,

    /// Runtime invocation id field on chat turn response request.
    #[serde(rename = "runtimeInvocationId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub runtime_invocation_id: Option<String>,

    /// Status field on chat turn response request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Usage field on chat turn response request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage: Option<serde_json::Value>,

    /// Usage fact id field on chat turn response request.
    #[serde(rename = "usageFactId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage_fact_id: Option<String>,
}
