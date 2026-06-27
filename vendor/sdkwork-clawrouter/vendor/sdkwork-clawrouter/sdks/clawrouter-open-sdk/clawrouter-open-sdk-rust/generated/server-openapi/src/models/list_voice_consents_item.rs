use serde::{Deserialize, Serialize};

/// Item module returned inside the listVoiceConsents list response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ListVoiceConsentsItem {
    /// Unix timestamp in seconds when the object was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created: Option<i64>,

    /// Unix timestamp in seconds when the object was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Resource identifier returned by the selected upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Developer-defined or provider-returned metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// OpenAI-compatible object type.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object: Option<String>,

    /// Current resource status when returned by the selected upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Transcript or translated text when returned by the upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,

    /// Audio URL when returned by the upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,

    /// Voice identifier used by the upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub voice: Option<String>,
}
