use serde::{Deserialize, Serialize};

use crate::models::{AdminAiModelRegionPrice};

/// Admin ai model update request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiModelUpdateRequest {
    /// Api format field on admin ai model update request.
    #[serde(rename = "apiFormat")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub api_format: Option<String>,

    /// Capability intro field on admin ai model update request.
    #[serde(rename = "capabilityIntro")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub capability_intro: Option<String>,

    /// Optional positive token window, accepting plain integers or K/M suffixes.
    #[serde(rename = "contextTokens")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub context_tokens: Option<String>,

    /// Description field on admin ai model update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Display name field on admin ai model update request.
    #[serde(rename = "displayName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,

    /// Input modalities field on admin ai model update request.
    #[serde(rename = "inputModalities")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_modalities: Option<Vec<String>>,

    /// Limitations field on admin ai model update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub limitations: Option<Vec<String>>,

    /// Max output tokens field on admin ai model update request.
    #[serde(rename = "maxOutputTokens")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_output_tokens: Option<String>,

    /// Modalities field on admin ai model update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub modalities: Option<Vec<String>>,

    /// Optional runtime model identifier update.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Output modalities field on admin ai model update request.
    #[serde(rename = "outputModalities")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_modalities: Option<Vec<String>>,

    /// Optional official reference prices by region.
    #[serde(rename = "regionPrices")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub region_prices: Option<Vec<AdminAiModelRegionPrice>>,

    /// Release stage field on admin ai model update request.
    #[serde(rename = "releaseStage")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub release_stage: Option<String>,

    /// Replacement model field on admin ai model update request.
    #[serde(rename = "replacementModel")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub replacement_model: Option<String>,

    /// Routing state field on admin ai model update request.
    #[serde(rename = "routingState")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub routing_state: Option<String>,

    /// Shelf state field on admin ai model update request.
    #[serde(rename = "shelfState")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub shelf_state: Option<String>,

    /// Optional model catalog status.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Supported languages field on admin ai model update request.
    #[serde(rename = "supportedLanguages")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub supported_languages: Option<Vec<String>>,

    /// Supports json schema field on admin ai model update request.
    #[serde(rename = "supportsJsonSchema")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub supports_json_schema: Option<bool>,

    /// Supports streaming field on admin ai model update request.
    #[serde(rename = "supportsStreaming")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub supports_streaming: Option<bool>,

    /// Supports tools field on admin ai model update request.
    #[serde(rename = "supportsTools")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub supports_tools: Option<bool>,

    /// Training data cutoff field on admin ai model update request.
    #[serde(rename = "trainingDataCutoff")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub training_data_cutoff: Option<String>,

    /// Optional primary model modality update.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,

    /// Use cases field on admin ai model update request.
    #[serde(rename = "useCases")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub use_cases: Option<Vec<String>>,

    /// Optional vendor row id or vendor code selected in the admin console.
    #[serde(rename = "vendorId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vendor_id: Option<String>,
}
