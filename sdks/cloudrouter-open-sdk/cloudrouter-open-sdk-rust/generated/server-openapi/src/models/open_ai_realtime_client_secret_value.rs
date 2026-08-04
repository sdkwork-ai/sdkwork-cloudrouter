use serde::{Deserialize, Serialize};

/// Ephemeral realtime client secret value.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRealtimeClientSecretValue {
    /// Unix timestamp in seconds when the secret expires.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<i64>,

    /// Ephemeral secret value.
    pub value: String,
}
