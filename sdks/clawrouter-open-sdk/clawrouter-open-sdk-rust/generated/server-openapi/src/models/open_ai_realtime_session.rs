use serde::{Deserialize, Serialize};

use crate::models::OpenAiRealtimeClientSecretValue;

/// OpenAI-compatible realtime session object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRealtimeSession {
    /// Client secret field on the open ai realtime session, using the open ai realtime client secret value module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_secret: Option<OpenAiRealtimeClientSecretValue>,

    /// Realtime session identifier.
    pub id: String,

    /// Realtime session instructions.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,

    /// Realtime modalities enabled for the session.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub modalities: Option<Vec<String>>,

    /// Realtime model id used by the session.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Object type, normally realtime.session.
    pub object: String,

    /// Voice identifier for realtime audio output.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub voice: Option<String>,
}
