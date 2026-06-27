use serde::{Deserialize, Serialize};

/// OpenAI-compatible organization audit log event.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiOrganizationAuditLog {
    /// Actor that performed the audited action.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub actor: Option<String>,

    /// API key identifier associated with the event when available.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub api_key_id: Option<String>,

    /// Unix timestamp in seconds when the event took effect.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub effective_at: Option<i64>,

    /// Audit log event identifier.
    pub id: String,

    /// Provider-specific audit metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Object type, normally organization.audit_log.
    pub object: String,

    /// Project associated with the event when available.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub project: Option<String>,

    /// Request details captured for the audit event.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request: Option<String>,

    /// Audit event type.
    pub r#type: String,
}
