use serde::{Deserialize, Serialize};

use crate::models::{AdminChannelCredentialItem, ProviderCircuitBreakerPolicy, ProviderRetryPolicy};

/// Persisted channel snapshot returned after the provider health probe. Admin management responses may return the stored plaintext provider API key for channel credential relay operations.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminChannelItem {
    /// Access type field on admin channel item.
    #[serde(rename = "accessType")]
    pub access_type: String,

    /// Balance field on admin channel item.
    pub balance: String,

    /// Capabilities field on admin channel item.
    pub capabilities: Vec<String>,

    /// Scoped ai_channel id used by account route and credential configuration.
    #[serde(rename = "channelId")]
    pub channel_id: String,

    /// Channel type field on admin channel item.
    #[serde(rename = "channelType")]
    pub channel_type: String,

    /// Circuit breaker policy field on admin channel item.
    #[serde(rename = "circuitBreakerPolicy")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub circuit_breaker_policy: Option<ProviderCircuitBreakerPolicy>,

    /// Created at field on admin channel item.
    #[serde(rename = "createdAt")]
    pub created_at: String,

    /// Credential rotation field on admin channel item.
    #[serde(rename = "credentialRotation")]
    pub credential_rotation: String,

    /// Credentials field on admin channel item.
    pub credentials: Vec<AdminChannelCredentialItem>,

    /// Errors field on admin channel item.
    pub errors: String,

    /// Expires at field on admin channel item.
    #[serde(rename = "expiresAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<String>,

    /// Id field on admin channel item.
    pub id: String,

    /// Is multimodal field on admin channel item.
    #[serde(rename = "isMultimodal")]
    pub is_multimodal: bool,

    /// Name field on admin channel item.
    pub name: String,

    /// Protocol field on admin channel item.
    pub protocol: String,

    /// Resource codes field on admin channel item.
    #[serde(rename = "resourceCodes")]
    pub resource_codes: Vec<String>,

    /// Retry policy field on admin channel item.
    #[serde(rename = "retryPolicy")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub retry_policy: Option<ProviderRetryPolicy>,

    /// Status field on admin channel item.
    pub status: String,

    /// Timeout ms field on admin channel item.
    #[serde(rename = "timeoutMs")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timeout_ms: Option<String>,

    /// Vendor field on admin channel item.
    pub vendor: String,

    /// Weight field on admin channel item.
    pub weight: String,
}
