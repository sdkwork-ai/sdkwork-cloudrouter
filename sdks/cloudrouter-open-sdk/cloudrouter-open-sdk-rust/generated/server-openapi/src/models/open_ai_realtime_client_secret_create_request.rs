use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create an ephemeral realtime client secret (`POST /v1/realtime/client_secrets`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRealtimeClientSecretCreateRequest {
    /// Secret expiration policy.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_after: Option<std::collections::HashMap<String, String>>,

    /// Realtime session configuration accepted by the official client-secrets endpoint.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub session: Option<std::collections::HashMap<String, String>>,
}
