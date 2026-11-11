use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to compact response or conversation state (`POST /v1/responses/compact`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiResponseCompactRequest {
    /// Image context compression options, for example `{context_compression: auto}`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image: Option<std::collections::HashMap<String, String>>,

    /// Responses API input, response state, or conversation state to compact.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input: Option<String>,

    /// System or developer instructions applied before compaction.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,

    /// Model id or Cloud Router catalog key used for compaction.
    pub model: String,

    /// Previous response identifier to compact from.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub previous_response_id: Option<String>,

    /// Prompt cache key.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_cache_key: Option<String>,

    /// Prompt cache options.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_cache_options: Option<std::collections::HashMap<String, String>>,

    /// How long to retain the prompt cache entry.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_cache_retention: Option<String>,

    /// Processing service tier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub service_tier: Option<String>,
}
