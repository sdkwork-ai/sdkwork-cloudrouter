use serde::{Deserialize, Serialize};

use crate::models::{ProviderTaskError};

/// Google Gemini google file schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleFile {
    /// Creation timestamp.
    #[serde(rename = "createTime")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub create_time: Option<String>,

    /// Human-readable file display name.
    #[serde(rename = "displayName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,

    /// Error field on the google file, using the provider task error module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<ProviderTaskError>,

    /// Expiration timestamp.
    #[serde(rename = "expirationTime")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expiration_time: Option<String>,

    /// File MIME type.
    #[serde(rename = "mimeType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,

    /// Gemini file resource name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// SHA-256 hash for the file.
    #[serde(rename = "sha256Hash")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sha256_hash: Option<String>,

    /// File size in bytes, encoded as a string by the Google API.
    #[serde(rename = "sizeBytes")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<String>,

    /// Processing state of the file.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,

    /// Update timestamp.
    #[serde(rename = "updateTime")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub update_time: Option<String>,

    /// Gemini file URI.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub uri: Option<String>,
}
