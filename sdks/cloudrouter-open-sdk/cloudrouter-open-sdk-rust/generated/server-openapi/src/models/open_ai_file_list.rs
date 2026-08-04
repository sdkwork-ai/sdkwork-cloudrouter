use serde::{Deserialize, Serialize};

use crate::models::OpenAiFile;

/// OpenAI-compatible paginated list of files.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiFileList {
    /// Files in the returned page.
    pub data: Vec<OpenAiFile>,

    /// Identifier of the first object in this page when provided.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub first_id: Option<String>,

    /// Whether additional pages are available.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub has_more: Option<bool>,

    /// Identifier of the last object in this page when provided.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_id: Option<String>,

    /// Object type, normally list.
    pub object: String,
}
