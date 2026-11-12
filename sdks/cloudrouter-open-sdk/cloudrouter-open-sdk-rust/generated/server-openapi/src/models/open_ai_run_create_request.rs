use serde::{Deserialize, Serialize};

use crate::models::OpenAiThreadMessageCreateRequest;

/// OpenAI-compatible request to create a thread run.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRunCreateRequest {
    /// Additional instructions appended for this run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub additional_instructions: Option<String>,

    /// Messages appended to the thread before the run starts.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub additional_messages: Option<Vec<OpenAiThreadMessageCreateRequest>>,

    /// Assistant identifier used by the run.
    pub assistant_id: String,

    /// Instructions applied to the run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,

    /// Maximum completion tokens.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_completion_tokens: Option<i64>,

    /// Maximum prompt tokens before truncation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_prompt_tokens: Option<i64>,

    /// Developer-defined run metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Model override used by the run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Whether the model may call tools in parallel.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parallel_tool_calls: Option<bool>,

    /// Reasoning effort for reasoning models.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reasoning_effort: Option<String>,

    /// Run response format configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_format: Option<String>,

    /// Whether to stream run events.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,

    /// Sampling temperature.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,

    /// Tool choice configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<String>,

    /// Tool definitions available to the run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<String>>,

    /// Nucleus sampling probability mass.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f64>,

    /// Context truncation strategy.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub truncation_strategy: Option<String>,
}
