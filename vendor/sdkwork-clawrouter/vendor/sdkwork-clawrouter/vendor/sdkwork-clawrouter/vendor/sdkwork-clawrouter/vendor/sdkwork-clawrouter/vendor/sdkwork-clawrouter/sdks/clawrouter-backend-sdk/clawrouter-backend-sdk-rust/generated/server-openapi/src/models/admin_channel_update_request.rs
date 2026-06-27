use serde::{Deserialize, Serialize};

use crate::models::{AdminChannelCredentialInput, ProviderCircuitBreakerPolicy, ProviderRetryPolicy};

/// Admin channel update request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminChannelUpdateRequest {
    /// Access type field on admin channel update request.
    #[serde(rename = "accessType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub access_type: Option<String>,

    /// Capabilities field on admin channel update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub capabilities: Option<Vec<String>>,

    /// Channel type field on admin channel update request.
    #[serde(rename = "channelType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub channel_type: Option<String>,

    /// Circuit breaker policy field on admin channel update request.
    #[serde(rename = "circuitBreakerPolicy")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub circuit_breaker_policy: Option<ProviderCircuitBreakerPolicy>,

    /// Credential rotation field on admin channel update request.
    #[serde(rename = "credentialRotation")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub credential_rotation: Option<String>,

    /// Replaces the complete upstream credential list when provided.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub credentials: Option<Vec<AdminChannelCredentialInput>>,

    /// Expires at field on admin channel update request.
    #[serde(rename = "expiresAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<String>,

    /// Id field on admin channel update request.
    pub id: String,

    /// Name field on admin channel update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Protocol field on admin channel update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub protocol: Option<String>,

    /// Resource codes field on admin channel update request.
    #[serde(rename = "resourceCodes")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resource_codes: Option<Vec<String>>,

    /// Retry policy field on admin channel update request.
    #[serde(rename = "retryPolicy")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub retry_policy: Option<ProviderRetryPolicy>,

    /// Status field on admin channel update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Timeout ms field on admin channel update request.
    #[serde(rename = "timeoutMs")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timeout_ms: Option<String>,

    /// Vendor field on admin channel update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vendor: Option<String>,

    /// Weight field on admin channel update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub weight: Option<String>,
}
