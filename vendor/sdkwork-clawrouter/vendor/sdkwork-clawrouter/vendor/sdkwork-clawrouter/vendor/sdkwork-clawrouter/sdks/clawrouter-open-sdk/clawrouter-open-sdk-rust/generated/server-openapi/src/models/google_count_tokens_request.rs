use serde::{Deserialize, Serialize};

use crate::models::{GoogleContent, GoogleGenerateContentRequest};

/// Google Gemini google count tokens request schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleCountTokensRequest {
    /// Contents to count.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub contents: Option<Vec<GoogleContent>>,

    /// Generate content request field on the google count tokens request, using the google generate content request module.
    #[serde(rename = "generateContentRequest")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub generate_content_request: Option<GoogleGenerateContentRequest>,
}
