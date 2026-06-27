use serde::{Deserialize, Serialize};

/// OpenAI-compatible voice consent object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVoiceConsent {
    /// Consent document or provider-specific consent payload.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub consent_document: Option<String>,

    /// Unix timestamp in seconds when the consent was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Voice consent identifier.
    pub id: String,

    /// Developer-defined consent metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable consent name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Object type, normally voice.consent.
    pub object: String,

    /// Consent lifecycle status.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}
