use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a batch.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiBatchCreateRequest {
    /// Time window in which the batch should be processed.
    pub completion_window: String,

    /// OpenAI-compatible endpoint to process.
    pub endpoint: String,

    /// Uploaded file identifier containing batch requests.
    pub input_file_id: String,

    /// Developer-defined batch metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,
}
