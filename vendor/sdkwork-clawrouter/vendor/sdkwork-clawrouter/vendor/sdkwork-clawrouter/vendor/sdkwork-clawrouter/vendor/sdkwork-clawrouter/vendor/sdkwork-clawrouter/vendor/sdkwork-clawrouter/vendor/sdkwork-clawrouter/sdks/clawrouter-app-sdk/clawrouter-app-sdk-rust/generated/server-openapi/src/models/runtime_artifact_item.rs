use serde::{Deserialize, Serialize};

use crate::models::{MediaResource};

/// Runtime artifact item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RuntimeArtifactItem {
    /// Artifact type field on runtime artifact item.
    #[serde(rename = "artifactType")]
    pub artifact_type: String,

    /// Content text field on runtime artifact item.
    #[serde(rename = "contentText")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content_text: Option<String>,

    /// Created at field on runtime artifact item.
    #[serde(rename = "createdAt")]
    pub created_at: String,

    /// Id field on runtime artifact item.
    pub id: String,

    /// Invocation id field on runtime artifact item.
    #[serde(rename = "invocationId")]
    pub invocation_id: String,

    /// Mime type field on runtime artifact item.
    #[serde(rename = "mimeType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,

    /// Name field on runtime artifact item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Resource field on runtime artifact item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resource: Option<MediaResource>,

    /// Sha 256 field on runtime artifact item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sha256: Option<String>,

    /// Size bytes field on runtime artifact item.
    #[serde(rename = "sizeBytes")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<String>,

    /// Storage key field on runtime artifact item.
    #[serde(rename = "storageKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub storage_key: Option<String>,
}
