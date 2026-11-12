use serde::{Deserialize, Serialize};

use crate::models::GoogleContent;

/// Google Gemini google embed content request schema exposed by Cloud Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleEmbedContentRequest {
    /// Content field on the google embed content request, using the google content module.
    pub content: GoogleContent,

    /// Configurations for the embed request.
    #[serde(rename = "embedContentConfig")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub embed_content_config: Option<std::collections::HashMap<String, String>>,

    /// Model resource name, `models/{model}`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Deprecated: use `embedContentConfig.outputDimensionality` instead.
    #[serde(rename = "outputDimensionality")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_dimensionality: Option<i64>,

    /// Embedding task type (deprecated in favor of `embedContentConfig.taskType`).
    #[serde(rename = "taskType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task_type: Option<String>,

    /// Deprecated: use `embedContentConfig.title` instead.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}
