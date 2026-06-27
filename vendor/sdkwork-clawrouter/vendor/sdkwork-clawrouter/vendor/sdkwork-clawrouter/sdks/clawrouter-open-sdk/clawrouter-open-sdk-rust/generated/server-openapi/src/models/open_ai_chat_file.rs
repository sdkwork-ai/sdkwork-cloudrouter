use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai chat file schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiChatFile {
    /// Inline file data accepted by compatible upstreams.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_data: Option<String>,

    /// Uploaded file identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_id: Option<String>,

    /// Input filename when sending inline file data.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub filename: Option<String>,
}
