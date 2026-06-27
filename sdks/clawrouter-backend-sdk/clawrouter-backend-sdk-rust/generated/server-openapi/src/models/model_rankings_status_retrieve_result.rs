use serde::{Deserialize, Serialize};

use crate::models::{ModelRankingRefreshStatus};

/// Model rankings status retrieve result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelRankingsStatusRetrieveResult {
    /// Business response code.
    pub code: String,

    /// Data field on model rankings status retrieve result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<ModelRankingRefreshStatus>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
