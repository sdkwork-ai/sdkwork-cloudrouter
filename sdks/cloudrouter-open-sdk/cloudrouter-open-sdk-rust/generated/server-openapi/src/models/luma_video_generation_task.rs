use serde::{Deserialize, Serialize};

use crate::models::{LumaGenerationAssets};

/// Luma Dream Machine generation record and its assets.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct LumaVideoGenerationTask {
    /// Generated assets.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub assets: Option<LumaGenerationAssets>,

    /// Generation creation timestamp.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,

    /// Failure reason when the generation did not complete.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub failure_reason: Option<String>,

    /// Generation type.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub generation_type: Option<String>,

    /// Luma generation identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Model used for the generation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Request parameters echoed back by Luma.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request: Option<std::collections::HashMap<String, String>>,

    /// Generation state.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,
}
