use serde::{Deserialize, Serialize};

use crate::models::{OpenAiRealtimeClientSecretValue};

/// OpenAI-compatible realtime client secret bootstrap response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRealtimeClientSecret {
    /// Client secret field on the open ai realtime client secret, using the open ai realtime client secret value module.
    pub client_secret: OpenAiRealtimeClientSecretValue,

    /// Realtime session object returned by the upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub session: Option<String>,
}
