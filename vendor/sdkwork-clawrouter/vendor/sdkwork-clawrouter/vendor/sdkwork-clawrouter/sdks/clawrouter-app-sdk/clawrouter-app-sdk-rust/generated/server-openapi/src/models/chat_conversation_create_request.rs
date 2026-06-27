use serde::{Deserialize, Serialize};

/// Chat conversation create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ChatConversationCreateRequest {
    /// Agent id field on chat conversation create request.
    #[serde(rename = "agentId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub agent_id: Option<String>,

    /// Agent session id field on chat conversation create request.
    #[serde(rename = "agentSessionId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub agent_session_id: Option<String>,

    /// Default model field on chat conversation create request.
    #[serde(rename = "defaultModel")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_model: Option<String>,

    /// Default provider field on chat conversation create request.
    #[serde(rename = "defaultProvider")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_provider: Option<String>,

    /// Memory space id field on chat conversation create request.
    #[serde(rename = "memorySpaceId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub memory_space_id: Option<String>,

    /// Metadata field on chat conversation create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Source surface field on chat conversation create request.
    #[serde(rename = "sourceSurface")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_surface: Option<String>,

    /// Title field on chat conversation create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}
