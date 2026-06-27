use serde::{Deserialize, Serialize};

/// Storage provider config schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageProviderConfig {
    /// Created at field on storage provider config.
    #[serde(rename = "createdAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,

    /// Credential ref field on storage provider config.
    #[serde(rename = "credentialRef")]
    pub credential_ref: String,

    /// Endpoint field on storage provider config.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub endpoint: Option<String>,

    /// Endpoint url field on storage provider config.
    #[serde(rename = "endpointUrl")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub endpoint_url: Option<String>,

    /// Health field on storage provider config.
    pub health: String,

    /// Health status field on storage provider config.
    #[serde(rename = "healthStatus")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub health_status: Option<String>,

    /// Id field on storage provider config.
    pub id: String,

    /// Last health check at field on storage provider config.
    #[serde(rename = "lastHealthCheckAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_health_check_at: Option<String>,

    /// Lifecycle field on storage provider config.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lifecycle: Option<bool>,

    /// Multipart field on storage provider config.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub multipart: Option<bool>,

    /// Object lock field on storage provider config.
    #[serde(rename = "objectLock")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object_lock: Option<bool>,

    /// Path style enabled field on storage provider config.
    #[serde(rename = "pathStyleEnabled")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub path_style_enabled: Option<bool>,

    /// Provider code field on storage provider config.
    #[serde(rename = "providerCode")]
    pub provider_code: String,

    /// Provider type field on storage provider config.
    #[serde(rename = "providerType")]
    pub provider_type: String,

    /// Region field on storage provider config.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub region: Option<String>,

    /// Status field on storage provider config.
    pub status: String,

    /// Supports lifecycle field on storage provider config.
    #[serde(rename = "supportsLifecycle")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub supports_lifecycle: Option<bool>,

    /// Supports multipart field on storage provider config.
    #[serde(rename = "supportsMultipart")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub supports_multipart: Option<bool>,

    /// Supports object lock field on storage provider config.
    #[serde(rename = "supportsObjectLock")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub supports_object_lock: Option<bool>,

    /// Updated at field on storage provider config.
    #[serde(rename = "updatedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}
