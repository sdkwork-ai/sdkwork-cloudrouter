use serde::{Deserialize, Serialize};

/// An xAI image input: a public URL, a base64 data URL, or an xAI Files API id.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct XaiImageUrl {
    /// File ID from the xAI Files API; mutually exclusive with url.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_id: Option<String>,

    /// Public URL or base64 data URL of the image (JPEG, PNG, or WebP). The vendor also accepts image_url for compatibility.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}
