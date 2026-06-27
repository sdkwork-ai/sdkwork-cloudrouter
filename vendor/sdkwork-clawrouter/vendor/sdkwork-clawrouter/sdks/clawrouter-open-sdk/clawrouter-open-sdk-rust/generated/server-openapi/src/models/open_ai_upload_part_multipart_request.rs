use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai upload part multipart request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiUploadPartMultipartRequest {
    /// Binary upload part data.
    pub data: String,
}
