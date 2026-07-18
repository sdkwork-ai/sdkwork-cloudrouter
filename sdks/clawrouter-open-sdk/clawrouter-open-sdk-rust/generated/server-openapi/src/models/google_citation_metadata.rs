use serde::{Deserialize, Serialize};

use crate::models::{GoogleCitationSource};

/// Citation metadata returned by Gemini.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleCitationMetadata {
    /// Citation sources used by the candidate.
    #[serde(rename = "citationSources")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub citation_sources: Option<Vec<GoogleCitationSource>>,
}
