use serde::{Deserialize, Serialize};

use crate::models::{RuntimeInvocationResponse};

/// Invocations submit result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct InvocationsSubmitResult {
    /// Business response code.
    pub code: String,

    /// Data field on invocations submit result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<RuntimeInvocationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
