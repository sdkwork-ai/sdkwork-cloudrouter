use serde::{Deserialize, Serialize};

use crate::models::{AdminChannelCredentialInput, ProviderCircuitBreakerPolicy, ProviderRetryPolicy};

/// Admin channel create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminChannelCreateRequest {
    /// Access type field on admin channel create request.
    #[serde(rename = "accessType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub access_type: Option<String>,

    /// Capabilities field on admin channel create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub capabilities: Option<Vec<String>>,

    /// Channel type. official means a direct vendor account; relay means an upstream aggregator account that can expose multiple vendors.
    #[serde(rename = "channelType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub channel_type: Option<String>,

    /// Circuit breaker policy field on admin channel create request.
    #[serde(rename = "circuitBreakerPolicy")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub circuit_breaker_policy: Option<ProviderCircuitBreakerPolicy>,

    /// Credential selection strategy for the upstream credential list.
    #[serde(rename = "credentialRotation")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub credential_rotation: Option<String>,

    /// Credentials field on admin channel create request.
    pub credentials: Vec<AdminChannelCredentialInput>,

    /// Expires at field on admin channel create request.
    #[serde(rename = "expiresAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<String>,

    /// Name field on admin channel create request.
    pub name: String,

    /// Protocol field on admin channel create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub protocol: Option<String>,

    /// Resource bindings selected from ai_resource or ai_resource_group, such as vendor.openai, api.openai.chat_completions, model.openai.gpt-4o-mini.chat, or bundle.openrouter.openai.standard.
    #[serde(rename = "resourceCodes")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resource_codes: Option<Vec<String>>,

    /// Retry policy field on admin channel create request.
    #[serde(rename = "retryPolicy")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub retry_policy: Option<ProviderRetryPolicy>,

    /// Status field on admin channel create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Per-channel upstream response timeout in milliseconds.
    #[serde(rename = "timeoutMs")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timeout_ms: Option<String>,

    /// Vendor field on admin channel create request.
    pub vendor: String,

    /// Weight field on admin channel create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub weight: Option<String>,
}
