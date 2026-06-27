use serde::{Deserialize, Serialize};

use crate::models::{GoogleContent, GoogleTool, GoogleToolConfig};

/// Google Gemini google cached content create request schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleCachedContentCreateRequest {
    /// Content to cache.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub contents: Option<Vec<GoogleContent>>,

    /// Human-readable cached content display name.
    #[serde(rename = "displayName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,

    /// Absolute expiration time for the cache.
    #[serde(rename = "expireTime")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expire_time: Option<String>,

    /// Model resource name for the cache.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// System instruction field on the google cached content create request, using the google content module.
    #[serde(rename = "systemInstruction")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub system_instruction: Option<GoogleContent>,

    /// Tool config field on the google cached content create request, using the google tool config module.
    #[serde(rename = "toolConfig")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_config: Option<GoogleToolConfig>,

    /// Tools associated with cached content.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<GoogleTool>>,

    /// Time-to-live duration for the cache.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ttl: Option<String>,
}
