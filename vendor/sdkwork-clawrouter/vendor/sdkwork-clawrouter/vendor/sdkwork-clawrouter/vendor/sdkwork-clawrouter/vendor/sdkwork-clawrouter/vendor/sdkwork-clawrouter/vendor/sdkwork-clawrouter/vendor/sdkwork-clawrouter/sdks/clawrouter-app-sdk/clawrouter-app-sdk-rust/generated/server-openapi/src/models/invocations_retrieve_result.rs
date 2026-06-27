use serde::{Deserialize, Serialize};

use crate::models::{RuntimeInvocationItem};

/// Invocations retrieve result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct InvocationsRetrieveResult {
    /// Business response code.
    pub code: String,

    /// Data field on invocations retrieve result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<RuntimeInvocationItem>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
