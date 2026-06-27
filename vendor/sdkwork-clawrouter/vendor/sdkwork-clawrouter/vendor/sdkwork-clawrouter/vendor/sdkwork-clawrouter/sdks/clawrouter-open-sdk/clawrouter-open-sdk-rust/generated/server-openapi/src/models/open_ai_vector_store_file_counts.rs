use serde::{Deserialize, Serialize};

/// Counts of files in each vector store processing state.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVectorStoreFileCounts {
    /// Number of cancelled files.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cancelled: Option<i64>,

    /// Number of processed files.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub completed: Option<i64>,

    /// Number of failed files.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub failed: Option<i64>,

    /// Number of files currently being processed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub in_progress: Option<i64>,

    /// Total number of files.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total: Option<i64>,
}
