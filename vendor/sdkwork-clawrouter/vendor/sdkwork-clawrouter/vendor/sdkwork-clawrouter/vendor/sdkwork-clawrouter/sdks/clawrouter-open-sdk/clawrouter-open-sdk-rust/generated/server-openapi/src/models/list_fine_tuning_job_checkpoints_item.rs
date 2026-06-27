use serde::{Deserialize, Serialize};

/// Item module returned inside the listFineTuningJobCheckpoints list response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ListFineTuningJobCheckpointsItem {
    /// Unix timestamp in seconds when the object was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created: Option<i64>,

    /// Unix timestamp in seconds when the object was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Fine-tuned model id when available.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fine_tuned_model: Option<String>,

    /// Resource identifier returned by the selected upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Developer-defined or provider-returned metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Base or fine-tuned model id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// OpenAI-compatible object type.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object: Option<String>,

    /// Result file identifiers returned by the fine-tuning job.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub result_files: Option<Vec<String>>,

    /// Current resource status when returned by the selected upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Training file identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub training_file: Option<String>,
}
