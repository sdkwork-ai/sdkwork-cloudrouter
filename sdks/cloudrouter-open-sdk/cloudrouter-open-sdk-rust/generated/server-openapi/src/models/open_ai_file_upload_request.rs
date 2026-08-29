use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai file upload request schema exposed by Cloud Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiFileUploadRequest {
    /// File bytes to upload.
    pub file: Vec<u8>,

    /// OpenAI-compatible file purpose, such as assistants, batch, fine-tune, vision, or provider-specific values.
    pub purpose: String,
}
