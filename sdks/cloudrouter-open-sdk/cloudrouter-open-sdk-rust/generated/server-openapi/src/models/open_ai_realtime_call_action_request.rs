use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to accept an inbound realtime call (`POST /v1/realtime/calls/{call_id}/accept`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRealtimeCallActionRequest {
    /// Input and output audio configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio: Option<std::collections::HashMap<String, String>>,

    /// Additional event types to include.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub include: Option<Vec<String>>,

    /// Session instructions.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,

    /// Maximum output tokens.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_output_tokens: Option<i64>,

    /// Realtime model id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Output modalities; defaults to `["audio"]`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_modalities: Option<Vec<String>>,

    /// Whether the model may call tools in parallel.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parallel_tool_calls: Option<bool>,

    /// Prompt template configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<std::collections::HashMap<String, String>>,

    /// Reasoning configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reasoning: Option<std::collections::HashMap<String, String>>,

    /// Tool choice mode.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<String>,

    /// Tools available to the session.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<std::collections::HashMap<String, String>>>,

    /// Tracing configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tracing: Option<std::collections::HashMap<String, String>>,

    /// Conversation truncation policy.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub truncation: Option<std::collections::HashMap<String, String>>,

    /// Action type.
    pub r#type: String,
}
