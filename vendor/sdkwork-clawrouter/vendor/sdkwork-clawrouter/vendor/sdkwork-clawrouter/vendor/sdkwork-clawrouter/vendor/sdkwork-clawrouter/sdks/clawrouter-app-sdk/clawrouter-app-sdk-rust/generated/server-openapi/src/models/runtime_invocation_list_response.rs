use serde::{Deserialize, Serialize};

use crate::models::{RuntimeInvocationItem};

/// Runtime invocation list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RuntimeInvocationListResponse {
    /// Items field on runtime invocation list response.
    pub items: Vec<RuntimeInvocationItem>,
}
