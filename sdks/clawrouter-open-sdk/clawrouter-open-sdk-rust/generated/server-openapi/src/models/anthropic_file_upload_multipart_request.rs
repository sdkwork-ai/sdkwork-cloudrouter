use serde::{Deserialize, Serialize};

/// Anthropic Claude anthropic file upload multipart request schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicFileUploadMultipartRequest {
    /// File bytes uploaded to Anthropic.
    pub file: String,
}
