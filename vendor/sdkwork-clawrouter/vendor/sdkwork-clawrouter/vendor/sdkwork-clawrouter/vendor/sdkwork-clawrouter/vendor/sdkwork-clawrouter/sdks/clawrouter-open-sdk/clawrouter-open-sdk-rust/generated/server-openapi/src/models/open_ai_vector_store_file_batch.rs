use serde::{Deserialize, Serialize};

use crate::models::OpenAiVectorStoreFileCounts;

/// OpenAI-compatible vector store file batch object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVectorStoreFileBatch {
    /// Unix timestamp in seconds when the batch was created.
    pub created_at: i64,

    /// File counts field on the open ai vector store file batch, using the open ai vector store file counts module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_counts: Option<OpenAiVectorStoreFileCounts>,

    /// Vector store file batch identifier.
    pub id: String,

    /// Object type, normally vector_store.file_batch.
    pub object: String,

    /// Vector store file batch processing status.
    pub status: String,

    /// Vector store identifier that owns this batch.
    pub vector_store_id: String,
}
