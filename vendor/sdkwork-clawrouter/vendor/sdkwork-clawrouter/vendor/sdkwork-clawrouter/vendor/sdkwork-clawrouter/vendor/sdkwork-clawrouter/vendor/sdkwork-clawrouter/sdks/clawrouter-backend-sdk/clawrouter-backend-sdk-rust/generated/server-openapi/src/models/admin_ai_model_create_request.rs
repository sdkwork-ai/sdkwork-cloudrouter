use serde::{Deserialize, Serialize};

use crate::models::{AdminAiModelRegionPrice};

/// Admin ai model create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiModelCreateRequest {
    /// Api format field on admin ai model create request.
    #[serde(rename = "apiFormat")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub api_format: Option<String>,

    /// Capability intro field on admin ai model create request.
    #[serde(rename = "capabilityIntro")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub capability_intro: Option<String>,

    /// Positive token window, accepting plain integers or K/M suffixes.
    #[serde(rename = "contextTokens")]
    pub context_tokens: String,

    /// Description field on admin ai model create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Display name field on admin ai model create request.
    #[serde(rename = "displayName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,

    /// Input modalities field on admin ai model create request.
    #[serde(rename = "inputModalities")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_modalities: Option<Vec<String>>,

    /// Limitations field on admin ai model create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub limitations: Option<Vec<String>>,

    /// Max output tokens field on admin ai model create request.
    #[serde(rename = "maxOutputTokens")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_output_tokens: Option<String>,

    /// Modalities field on admin ai model create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub modalities: Option<Vec<String>>,

    /// Runtime model identifier used for provider calls, routing, and pricing keys.
    pub model: String,

    /// Output modalities field on admin ai model create request.
    #[serde(rename = "outputModalities")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_modalities: Option<Vec<String>>,

    /// Official reference prices by region.
    #[serde(rename = "regionPrices")]
    pub region_prices: Vec<AdminAiModelRegionPrice>,

    /// Release stage field on admin ai model create request.
    #[serde(rename = "releaseStage")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub release_stage: Option<String>,

    /// Replacement model field on admin ai model create request.
    #[serde(rename = "replacementModel")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub replacement_model: Option<String>,

    /// Routing state field on admin ai model create request.
    #[serde(rename = "routingState")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub routing_state: Option<String>,

    /// Shelf state field on admin ai model create request.
    #[serde(rename = "shelfState")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub shelf_state: Option<String>,

    /// Supported languages field on admin ai model create request.
    #[serde(rename = "supportedLanguages")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub supported_languages: Option<Vec<String>>,

    /// Supports json schema field on admin ai model create request.
    #[serde(rename = "supportsJsonSchema")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub supports_json_schema: Option<bool>,

    /// Supports streaming field on admin ai model create request.
    #[serde(rename = "supportsStreaming")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub supports_streaming: Option<bool>,

    /// Supports tools field on admin ai model create request.
    #[serde(rename = "supportsTools")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub supports_tools: Option<bool>,

    /// Training data cutoff field on admin ai model create request.
    #[serde(rename = "trainingDataCutoff")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub training_data_cutoff: Option<String>,

    /// Primary model modality shown in the admin console.
    pub r#type: String,

    /// Use cases field on admin ai model create request.
    #[serde(rename = "useCases")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub use_cases: Option<Vec<String>>,

    /// Vendor row id or vendor code selected in the admin console.
    #[serde(rename = "vendorId")]
    pub vendor_id: String,
}
