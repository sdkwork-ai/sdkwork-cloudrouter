use serde::{Deserialize, Serialize};

/// OpenAI-compatible upload part object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiUploadPart {
    /// Unix timestamp in seconds when the part was uploaded.
    pub created_at: i64,

    /// Upload part identifier.
    pub id: String,

    /// Object type, normally upload.part.
    pub object: String,

    /// Upload identifier associated with the part.
    pub upload_id: String,
}
