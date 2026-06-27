use serde::{Deserialize, Serialize};

use crate::models::{AdminAiModelRegionPrice};

/// Persisted ai model snapshot returned by the backend.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiModelItem {
    /// Api format field on admin ai model item.
    #[serde(rename = "apiFormat")]
    pub api_format: String,

    /// Calls field on admin ai model item.
    pub calls: String,

    /// Capability intro field on admin ai model item.
    #[serde(rename = "capabilityIntro")]
    pub capability_intro: String,

    /// Context tokens field on admin ai model item.
    #[serde(rename = "contextTokens")]
    pub context_tokens: String,

    /// Description field on admin ai model item.
    pub description: String,

    /// Product display name. Falls back to model when no display name is configured.
    #[serde(rename = "displayName")]
    pub display_name: String,

    /// Id field on admin ai model item.
    pub id: String,

    /// Input modalities field on admin ai model item.
    #[serde(rename = "inputModalities")]
    pub input_modalities: Vec<String>,

    /// Limitations field on admin ai model item.
    pub limitations: Vec<String>,

    /// Max output tokens field on admin ai model item.
    #[serde(rename = "maxOutputTokens")]
    pub max_output_tokens: String,

    /// Modalities field on admin ai model item.
    pub modalities: Vec<String>,

    /// Runtime model identifier used for provider calls, routing, and pricing keys.
    pub model: String,

    /// Compatibility display alias. Equal to displayName.
    pub name: String,

    /// Output modalities field on admin ai model item.
    #[serde(rename = "outputModalities")]
    pub output_modalities: Vec<String>,

    /// Region prices field on admin ai model item.
    #[serde(rename = "regionPrices")]
    pub region_prices: Vec<AdminAiModelRegionPrice>,

    /// Release stage field on admin ai model item.
    #[serde(rename = "releaseStage")]
    pub release_stage: String,

    /// Replacement model field on admin ai model item.
    #[serde(rename = "replacementModel")]
    pub replacement_model: String,

    /// Routing state field on admin ai model item.
    #[serde(rename = "routingState")]
    pub routing_state: String,

    /// Shelf state field on admin ai model item.
    #[serde(rename = "shelfState")]
    pub shelf_state: String,

    /// Status field on admin ai model item.
    pub status: String,

    /// Supported languages field on admin ai model item.
    #[serde(rename = "supportedLanguages")]
    pub supported_languages: Vec<String>,

    /// Supports json schema field on admin ai model item.
    #[serde(rename = "supportsJsonSchema")]
    pub supports_json_schema: bool,

    /// Supports streaming field on admin ai model item.
    #[serde(rename = "supportsStreaming")]
    pub supports_streaming: bool,

    /// Supports tools field on admin ai model item.
    #[serde(rename = "supportsTools")]
    pub supports_tools: bool,

    /// Training data cutoff field on admin ai model item.
    #[serde(rename = "trainingDataCutoff")]
    pub training_data_cutoff: String,

    /// Type field on admin ai model item.
    pub r#type: String,

    /// Use cases field on admin ai model item.
    #[serde(rename = "useCases")]
    pub use_cases: Vec<String>,

    /// Vendor code field on admin ai model item.
    #[serde(rename = "vendorCode")]
    pub vendor_code: String,

    /// Vendor id field on admin ai model item.
    #[serde(rename = "vendorId")]
    pub vendor_id: String,
}
