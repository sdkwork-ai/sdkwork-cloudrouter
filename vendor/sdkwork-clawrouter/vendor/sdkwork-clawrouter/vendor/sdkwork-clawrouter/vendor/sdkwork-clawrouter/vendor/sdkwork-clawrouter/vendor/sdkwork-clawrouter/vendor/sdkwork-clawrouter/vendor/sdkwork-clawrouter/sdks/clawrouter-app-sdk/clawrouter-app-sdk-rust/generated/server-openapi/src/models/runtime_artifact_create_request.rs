use serde::{Deserialize, Serialize};

use crate::models::{MediaResource};

/// Runtime artifact create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RuntimeArtifactCreateRequest {
    /// Artifact type field on runtime artifact create request.
    #[serde(rename = "artifactType")]
    pub artifact_type: String,

    /// Content json field on runtime artifact create request.
    #[serde(rename = "contentJson")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content_json: Option<std::collections::HashMap<String, String>>,

    /// Content text field on runtime artifact create request.
    #[serde(rename = "contentText")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content_text: Option<String>,

    /// Metadata field on runtime artifact create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Mime type field on runtime artifact create request.
    #[serde(rename = "mimeType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,

    /// Name field on runtime artifact create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Resource field on runtime artifact create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resource: Option<MediaResource>,

    /// Sha 256 field on runtime artifact create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sha256: Option<String>,

    /// Size bytes field on runtime artifact create request.
    #[serde(rename = "sizeBytes")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<String>,

    /// Storage key field on runtime artifact create request.
    #[serde(rename = "storageKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub storage_key: Option<String>,
}
