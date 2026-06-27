use serde::{Deserialize, Serialize};

use crate::models::{ChatTurnCreateResponse};

/// Turns create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct TurnsCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on turns create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<ChatTurnCreateResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
