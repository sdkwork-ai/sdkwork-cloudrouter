use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a legacy text completion.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiCompletionCreateRequest {
    /// Number of server-side completions to generate before selecting the best result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub best_of: Option<i64>,

    /// Whether to echo the prompt in the response.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub echo: Option<bool>,

    /// Penalty applied to repeated tokens.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub frequency_penalty: Option<f64>,

    /// Token bias map keyed by token id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub logit_bias: Option<std::collections::HashMap<String, f64>>,

    /// Number of token log probabilities to return.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub logprobs: Option<i64>,

    /// Maximum number of tokens to generate.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<i64>,

    /// Model id or Claw Router catalog key routed to a provider account.
    pub model: String,

    /// Number of completion choices to generate.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub n: Option<i64>,

    /// Penalty applied to tokens based on whether they appear in the prompt.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub presence_penalty: Option<f64>,

    /// Prompt text, prompt array, token array, or token-array batch to complete.
    pub prompt: String,

    /// Best-effort deterministic sampling seed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Stop sequence or list of stop sequences.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stop: Option<String>,

    /// Whether to stream completion chunks.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,

    /// Suffix inserted after the generated completion when supported.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub suffix: Option<String>,

    /// Sampling temperature between 0 and 2.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,

    /// Nucleus sampling probability mass.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f64>,

    /// End-user identifier forwarded to compatible upstreams.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,
}
