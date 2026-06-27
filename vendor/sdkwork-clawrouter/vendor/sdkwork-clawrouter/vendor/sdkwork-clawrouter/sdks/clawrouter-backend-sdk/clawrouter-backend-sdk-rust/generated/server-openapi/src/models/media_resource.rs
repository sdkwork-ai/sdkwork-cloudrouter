use serde::{Deserialize, Serialize};

use crate::models::{MediaAccess, MediaAiProvenance, MediaChecksum};

/// Media resource schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MediaResource {
    /// Access field on media resource.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub access: Option<MediaAccess>,

    /// Ai field on media resource.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ai: Option<MediaAiProvenance>,

    /// Alt text field on media resource.
    #[serde(rename = "altText")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub alt_text: Option<String>,

    /// Bucket id field on media resource.
    #[serde(rename = "bucketId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bucket_id: Option<String>,

    /// Checksum field on media resource.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub checksum: Option<MediaChecksum>,

    /// Duration seconds field on media resource.
    #[serde(rename = "durationSeconds")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration_seconds: Option<f64>,

    /// File name field on media resource.
    #[serde(rename = "fileName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_name: Option<String>,

    /// Height field on media resource.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub height: Option<i64>,

    /// Id field on media resource.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Kind field on media resource.
    pub kind: String,

    /// Metadata field on media resource.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Mime type field on media resource.
    #[serde(rename = "mimeType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,

    /// Object blob id field on media resource.
    #[serde(rename = "objectBlobId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object_blob_id: Option<String>,

    /// Object key field on media resource.
    #[serde(rename = "objectKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object_key: Option<String>,

    /// Object version field on media resource.
    #[serde(rename = "objectVersion")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object_version: Option<String>,

    /// Poster field on media resource.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub poster: Option<Box<MediaResource>>,

    /// Public url field on media resource.
    #[serde(rename = "publicUrl")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub public_url: Option<String>,

    /// Size bytes field on media resource.
    #[serde(rename = "sizeBytes")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<String>,

    /// Source field on media resource.
    pub source: String,

    /// Thumbnails field on media resource.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thumbnails: Option<Vec<MediaResource>>,

    /// Title field on media resource.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,

    /// Uri field on media resource.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub uri: Option<String>,

    /// Url field on media resource.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,

    /// Variants field on media resource.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variants: Option<Vec<MediaResource>>,

    /// Width field on media resource.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub width: Option<i64>,
}
