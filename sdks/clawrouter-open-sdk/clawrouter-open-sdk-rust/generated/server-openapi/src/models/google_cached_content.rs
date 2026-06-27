use serde::{Deserialize, Serialize};

use crate::models::{
    GoogleCachedContentUsageMetadata, GoogleContent, GoogleTool, GoogleToolConfig,
};

/// Google Gemini google cached content schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleCachedContent {
    /// Cached contents.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub contents: Option<Vec<GoogleContent>>,

    /// Creation timestamp.
    #[serde(rename = "createTime")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub create_time: Option<String>,

    /// Human-readable cached content display name.
    #[serde(rename = "displayName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,

    /// Expiration timestamp.
    #[serde(rename = "expireTime")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expire_time: Option<String>,

    /// Model resource name associated with the cache.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Cached content resource name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// System instruction field on the google cached content, using the google content module.
    #[serde(rename = "systemInstruction")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub system_instruction: Option<GoogleContent>,

    /// Tool config field on the google cached content, using the google tool config module.
    #[serde(rename = "toolConfig")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_config: Option<GoogleToolConfig>,

    /// Cached tool definitions.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<GoogleTool>>,

    /// Update timestamp.
    #[serde(rename = "updateTime")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub update_time: Option<String>,

    /// Usage metadata field on the google cached content, using the google cached content usage metadata module.
    #[serde(rename = "usageMetadata")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage_metadata: Option<GoogleCachedContentUsageMetadata>,
}
