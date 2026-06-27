use serde::{Deserialize, Serialize};

/// Item module returned inside the listBatches list response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ListBatchesItem {
    /// Unix timestamp in seconds when the object was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created: Option<i64>,

    /// Unix timestamp in seconds when the object was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Endpoint processed by the batch.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub endpoint: Option<String>,

    /// Error file identifier produced by the batch.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error_file_id: Option<String>,

    /// Resource identifier returned by the selected upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Input file identifier processed by the batch.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_file_id: Option<String>,

    /// Developer-defined or provider-returned metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// OpenAI-compatible object type.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object: Option<String>,

    /// Output file identifier produced by the batch.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_file_id: Option<String>,

    /// Current resource status when returned by the selected upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}
