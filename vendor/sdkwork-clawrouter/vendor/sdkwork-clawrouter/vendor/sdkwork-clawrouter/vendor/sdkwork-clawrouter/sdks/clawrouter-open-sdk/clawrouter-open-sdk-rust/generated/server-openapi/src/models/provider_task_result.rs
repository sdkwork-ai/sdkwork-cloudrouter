use serde::{Deserialize, Serialize};

use crate::models::{ProviderGeneratedMedia, VolcengineContentPart};

/// Provider task result payload with common media result fields and typed extension values.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ProviderTaskResult {
    /// Generated audio assets.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audios: Option<Vec<ProviderGeneratedMedia>>,

    /// Generated or transformed content parts.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<Vec<VolcengineContentPart>>,

    /// Provider result identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Generated image assets.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<ProviderGeneratedMedia>>,

    /// Metadata field on the provider task result, using the provider metadata module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Provider result status.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Generated text output when returned by the provider.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,

    /// Generated video assets.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub videos: Option<Vec<ProviderGeneratedMedia>>,
}
