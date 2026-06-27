use serde::{Deserialize, Serialize};

use crate::models::{RuntimeInvocationListResponse};

/// Invocations list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct InvocationsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on invocations list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<RuntimeInvocationListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
