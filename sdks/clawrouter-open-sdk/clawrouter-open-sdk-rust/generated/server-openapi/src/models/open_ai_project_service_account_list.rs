use serde::{Deserialize, Serialize};

use crate::models::OpenAiProjectServiceAccount;

/// OpenAI-compatible paginated list of project service accounts.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiProjectServiceAccountList {
    /// Project service accounts in the returned page.
    pub data: Vec<OpenAiProjectServiceAccount>,

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
