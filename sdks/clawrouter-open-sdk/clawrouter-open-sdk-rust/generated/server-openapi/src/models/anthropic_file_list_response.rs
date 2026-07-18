use serde::{Deserialize, Serialize};

use crate::models::{AnthropicFile};

/// Anthropic Claude anthropic file list response schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicFileListResponse {
    /// Anthropic file objects.
    pub data: Vec<AnthropicFile>,

    /// First object identifier in the page.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub first_id: Option<String>,

    /// Whether more results are available.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub has_more: Option<bool>,

    /// Last object identifier in the page.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_id: Option<String>,
}
