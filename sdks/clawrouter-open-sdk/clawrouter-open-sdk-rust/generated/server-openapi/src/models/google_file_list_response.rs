use serde::{Deserialize, Serialize};

use crate::models::GoogleFile;

/// Google Gemini google file list response schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleFileListResponse {
    /// Gemini files visible to the provider account.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub files: Option<Vec<GoogleFile>>,

    /// Pagination token for the next page.
    #[serde(rename = "nextPageToken")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_page_token: Option<String>,
}
