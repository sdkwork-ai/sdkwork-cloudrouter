use serde::{Deserialize, Serialize};

use crate::models::{GoogleSchema, GoogleThinkingConfig};

/// Google Gemini google generation config schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleGenerationConfig {
    /// Number of response candidates to generate.
    #[serde(rename = "candidateCount")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub candidate_count: Option<i64>,

    /// Maximum output token count.
    #[serde(rename = "maxOutputTokens")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_output_tokens: Option<i64>,

    /// Requested response MIME type.
    #[serde(rename = "responseMimeType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_mime_type: Option<String>,

    /// Response schema field on the google generation config, using the google schema module.
    #[serde(rename = "responseSchema")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_schema: Option<GoogleSchema>,

    /// Stop sequences for generation.
    #[serde(rename = "stopSequences")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stop_sequences: Option<Vec<String>>,

    /// Sampling temperature.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,

    /// Thinking config field on the google generation config, using the google thinking config module.
    #[serde(rename = "thinkingConfig")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thinking_config: Option<GoogleThinkingConfig>,

    /// Top-k sampling value.
    #[serde(rename = "topK")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_k: Option<i64>,

    /// Nucleus sampling probability mass.
    #[serde(rename = "topP")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f64>,
}
