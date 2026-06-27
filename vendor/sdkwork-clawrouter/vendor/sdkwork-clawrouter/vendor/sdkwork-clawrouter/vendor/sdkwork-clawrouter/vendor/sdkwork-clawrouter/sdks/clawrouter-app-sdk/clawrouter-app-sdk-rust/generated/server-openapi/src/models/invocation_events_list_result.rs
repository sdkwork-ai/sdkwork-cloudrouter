use serde::{Deserialize, Serialize};

use crate::models::{RuntimeEventListResponse};

/// Invocation events list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct InvocationEventsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on invocation events list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<RuntimeEventListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
