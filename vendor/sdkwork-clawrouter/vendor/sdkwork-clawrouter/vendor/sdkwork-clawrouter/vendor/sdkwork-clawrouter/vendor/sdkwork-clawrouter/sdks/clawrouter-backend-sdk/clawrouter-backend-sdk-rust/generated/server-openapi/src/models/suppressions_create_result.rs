use serde::{Deserialize, Serialize};

use crate::models::{MessagingMutationResponse};

/// Suppressions create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct SuppressionsCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on suppressions create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<MessagingMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
