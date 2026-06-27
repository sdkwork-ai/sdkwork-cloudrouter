use serde::{Deserialize, Serialize};

/// Create storage provider request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CreateStorageProviderRequest {
    /// Credential ref field on create storage provider request.
    #[serde(rename = "credentialRef")]
    pub credential_ref: String,

    /// Endpoint field on create storage provider request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub endpoint: Option<String>,

    /// Endpoint url field on create storage provider request.
    #[serde(rename = "endpointUrl")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub endpoint_url: Option<String>,

    /// Lifecycle field on create storage provider request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lifecycle: Option<bool>,

    /// Multipart field on create storage provider request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub multipart: Option<bool>,

    /// Object lock field on create storage provider request.
    #[serde(rename = "objectLock")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object_lock: Option<bool>,

    /// Path style enabled field on create storage provider request.
    #[serde(rename = "pathStyleEnabled")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub path_style_enabled: Option<bool>,

    /// Provider code field on create storage provider request.
    #[serde(rename = "providerCode")]
    pub provider_code: String,

    /// Provider type field on create storage provider request.
    #[serde(rename = "providerType")]
    pub provider_type: String,

    /// Region field on create storage provider request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub region: Option<String>,

    /// Supports lifecycle field on create storage provider request.
    #[serde(rename = "supportsLifecycle")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub supports_lifecycle: Option<bool>,

    /// Supports multipart field on create storage provider request.
    #[serde(rename = "supportsMultipart")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub supports_multipart: Option<bool>,

    /// Supports object lock field on create storage provider request.
    #[serde(rename = "supportsObjectLock")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub supports_object_lock: Option<bool>,
}
