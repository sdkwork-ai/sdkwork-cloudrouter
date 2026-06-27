use serde::{Deserialize, Serialize};

/// Reusable provider provider generated media schema shared by Claw Router vendor modules.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ProviderGeneratedMedia {
    /// Asset duration in seconds for audio or video.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<f64>,

    /// Asset height in pixels.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub height: Option<i64>,

    /// Generated asset identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Metadata field on the provider generated media, using the provider generated media metadata module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Asset MIME type.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,

    /// Provider asset URI.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub uri: Option<String>,

    /// Generated asset URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,

    /// Asset width in pixels.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub width: Option<i64>,
}
