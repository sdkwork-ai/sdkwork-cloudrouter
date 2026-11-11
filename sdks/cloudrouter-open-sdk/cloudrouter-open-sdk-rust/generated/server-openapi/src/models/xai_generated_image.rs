use serde::{Deserialize, Serialize};

/// One generated image, as a URL, a base64 payload, or a Files API output reference.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct XaiGeneratedImage {
    /// Base64-encoded image bytes (without the data-URI prefix) when response_format is b64_json.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub b64_json: Option<String>,

    /// Files API reference returned when storage_options was set.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_output: Option<std::collections::HashMap<String, String>>,

    /// MIME type of the generated image, for example image/png.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,

    /// Human-readable error when storage_options was set but the upload failed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub storage_error: Option<String>,

    /// URL of the generated image when response_format is url or omitted.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}
