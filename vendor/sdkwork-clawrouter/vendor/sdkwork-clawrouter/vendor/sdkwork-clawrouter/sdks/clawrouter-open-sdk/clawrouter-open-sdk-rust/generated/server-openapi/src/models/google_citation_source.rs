use serde::{Deserialize, Serialize};

/// Single citation source returned by Gemini.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleCitationSource {
    /// End index of the cited span.
    #[serde(rename = "endIndex")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub end_index: Option<i64>,

    /// Citation license text when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,

    /// Start index of the cited span.
    #[serde(rename = "startIndex")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub start_index: Option<i64>,

    /// Citation URI.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub uri: Option<String>,
}
