use serde::{Deserialize, Serialize};

use crate::models::{ModelRankingsSnapshot};

/// Model rankings list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelRankingsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on model rankings list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<ModelRankingsSnapshot>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
