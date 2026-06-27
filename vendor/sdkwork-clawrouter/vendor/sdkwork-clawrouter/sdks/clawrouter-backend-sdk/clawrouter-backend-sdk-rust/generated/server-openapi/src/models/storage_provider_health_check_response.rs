use serde::{Deserialize, Serialize};

/// Storage provider health check response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageProviderHealthCheckResponse {
    /// Checked at field on storage provider health check response.
    #[serde(rename = "checkedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub checked_at: Option<String>,

    /// Healthy field on storage provider health check response.
    pub healthy: bool,

    /// Provider id field on storage provider health check response.
    #[serde(rename = "providerId")]
    pub provider_id: String,

    /// Request id field on storage provider health check response.
    #[serde(rename = "requestId")]
    pub request_id: String,

    /// Status field on storage provider health check response.
    pub status: String,
}
