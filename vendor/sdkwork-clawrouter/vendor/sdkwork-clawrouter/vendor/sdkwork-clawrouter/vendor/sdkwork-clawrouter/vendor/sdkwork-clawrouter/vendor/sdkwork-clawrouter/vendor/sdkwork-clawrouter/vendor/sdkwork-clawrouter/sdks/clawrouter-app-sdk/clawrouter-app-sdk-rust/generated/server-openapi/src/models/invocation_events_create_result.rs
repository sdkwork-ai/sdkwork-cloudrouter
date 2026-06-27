use serde::{Deserialize, Serialize};

use crate::models::{RuntimeEventResponse};

/// Invocation events create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct InvocationEventsCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on invocation events create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<RuntimeEventResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
