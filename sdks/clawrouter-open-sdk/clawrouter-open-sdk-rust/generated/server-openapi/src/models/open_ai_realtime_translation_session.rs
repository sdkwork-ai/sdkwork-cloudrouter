use serde::{Deserialize, Serialize};

use crate::models::OpenAiRealtimeClientSecretValue;

/// OpenAI-compatible realtime translation session object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRealtimeTranslationSession {
    /// Client secret field on the open ai realtime translation session, using the open ai realtime client secret value module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_secret: Option<OpenAiRealtimeClientSecretValue>,

    /// Realtime translation session identifier.
    pub id: String,

    /// Object type, normally realtime.translation_session.
    pub object: String,

    /// Source language for realtime translation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_language: Option<String>,

    /// Target language for realtime translation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_language: Option<String>,
}
