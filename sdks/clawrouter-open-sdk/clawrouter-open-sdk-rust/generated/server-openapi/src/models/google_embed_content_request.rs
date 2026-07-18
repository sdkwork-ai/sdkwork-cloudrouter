use serde::{Deserialize, Serialize};

use crate::models::{GoogleContent};

/// Google Gemini google embed content request schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleEmbedContentRequest {
    /// Content field on the google embed content request, using the google content module.
    pub content: GoogleContent,

    /// Requested embedding dimensionality.
    #[serde(rename = "outputDimensionality")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_dimensionality: Option<i64>,

    /// Embedding task type.
    #[serde(rename = "taskType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task_type: Option<String>,

    /// Optional document title for retrieval embeddings.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}
