use serde::{Deserialize, Serialize};

use crate::models::{RuntimeArtifactListResponse};

/// Artifacts list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ArtifactsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on artifacts list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<RuntimeArtifactListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
