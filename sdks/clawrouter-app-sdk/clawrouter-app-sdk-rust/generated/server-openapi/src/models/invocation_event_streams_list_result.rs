use serde::{Deserialize, Serialize};

use crate::models::{RuntimeEventListResponse};

/// Invocation event streams list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct InvocationEventStreamsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on invocation event streams list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<RuntimeEventListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
