use serde::{Deserialize, Serialize};

use crate::models::{GoogleCachedContent};

/// Google Gemini google cached content list response schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleCachedContentListResponse {
    /// Cached content resources.
    #[serde(rename = "cachedContents")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cached_contents: Option<Vec<GoogleCachedContent>>,

    /// Pagination token for the next page.
    #[serde(rename = "nextPageToken")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_page_token: Option<String>,
}
