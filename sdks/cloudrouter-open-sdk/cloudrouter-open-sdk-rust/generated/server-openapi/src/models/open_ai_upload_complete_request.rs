use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to complete an upload.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiUploadCompleteRequest {
    /// Optional MD5 checksum for completed upload bytes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub md5: Option<String>,

    /// Ordered upload part identifiers used to complete the upload.
    pub part_ids: Vec<String>,
}
