use serde::{Deserialize, Serialize};

use crate::models::{GoogleSchema, GoogleThinkingConfig};

/// Google Gemini google generation config schema exposed by Cloud Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleGenerationConfig {
    /// Audio transcription configuration.
    #[serde(rename = "audioTranscriptionConfig")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_transcription_config: Option<std::collections::HashMap<String, String>>,

    /// Number of response candidates to generate.
    #[serde(rename = "candidateCount")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub candidate_count: Option<i64>,

    /// Detect emotions and adapt responses accordingly.
    #[serde(rename = "enableAffectiveDialog")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub enable_affective_dialog: Option<bool>,

    /// Enable enhanced civic answers when the model supports it.
    #[serde(rename = "enableEnhancedCivicAnswers")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub enable_enhanced_civic_answers: Option<bool>,

    /// Frequency penalty applied to the next token's logprobs.
    #[serde(rename = "frequencyPenalty")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub frequency_penalty: Option<f64>,

    /// Configuration for image generation.
    #[serde(rename = "imageConfig")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_config: Option<std::collections::HashMap<String, String>>,

    /// Number of top logprobs to return; only valid when `responseLogprobs` is true.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub logprobs: Option<i64>,

    /// Maximum output token count.
    #[serde(rename = "maxOutputTokens")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_output_tokens: Option<i64>,

    /// Media resolution for the request.
    #[serde(rename = "mediaResolution")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub media_resolution: Option<String>,

    /// Presence penalty applied to the next token's logprobs.
    #[serde(rename = "presencePenalty")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub presence_penalty: Option<f64>,

    /// Configuration for the response output format.
    #[serde(rename = "responseFormat")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_format: Option<std::collections::HashMap<String, String>>,

    /// Response json schema field on the google generation config, using the provider json value module.
    #[serde(rename = "responseJsonSchema")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_json_schema: Option<String>,

    /// Export logprobs results in the response.
    #[serde(rename = "responseLogprobs")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_logprobs: Option<bool>,

    /// Requested response MIME type.
    #[serde(rename = "responseMimeType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_mime_type: Option<String>,

    /// Requested response modalities, for example TEXT and IMAGE.
    #[serde(rename = "responseModalities")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_modalities: Option<Vec<String>>,

    /// Response schema field on the google generation config, using the google schema module.
    #[serde(rename = "responseSchema")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_schema: Option<GoogleSchema>,

    /// Seed used in decoding.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Speech generation configuration.
    #[serde(rename = "speechConfig")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub speech_config: Option<std::collections::HashMap<String, String>>,

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

    /// Translation configuration.
    #[serde(rename = "translationConfig")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub translation_config: Option<std::collections::HashMap<String, String>>,
}
