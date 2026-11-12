use serde::{Deserialize, Serialize};

use crate::models::{
    GoogleContent, GoogleGenerationConfig, GoogleSafetySetting, GoogleTool, GoogleToolConfig,
};

/// Google Gemini google generate content request schema exposed by Cloud Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleGenerateContentRequest {
    /// Cached content resource name to reuse for the request.
    #[serde(rename = "cachedContent")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cached_content: Option<String>,

    /// Conversation contents sent to the Gemini model.
    pub contents: Vec<GoogleContent>,

    /// Opaque continuation token used to resume generation from a previous request.
    #[serde(rename = "continuationToken")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub continuation_token: Option<String>,

    /// Generation config field on the google generate content request, using the google generation config module.
    #[serde(rename = "generationConfig")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub generation_config: Option<GoogleGenerationConfig>,

    /// User-defined labels attached to the request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub labels: Option<std::collections::HashMap<String, String>>,

    /// Model resource name, `models/{model}`; the path parameter is authoritative when both are present.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Safety settings overriding model defaults.
    #[serde(rename = "safetySettings")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub safety_settings: Option<Vec<GoogleSafetySetting>>,

    /// Service tier of the request.
    #[serde(rename = "serviceTier")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub service_tier: Option<String>,

    /// Logging behavior for this request; takes precedence over the project default.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub store: Option<bool>,

    /// System instruction field on the google generate content request, using the google content module.
    #[serde(rename = "systemInstruction")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub system_instruction: Option<GoogleContent>,

    /// Tool config field on the google generate content request, using the google tool config module.
    #[serde(rename = "toolConfig")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_config: Option<GoogleToolConfig>,

    /// Tool definitions available to the Gemini model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<GoogleTool>>,
}
