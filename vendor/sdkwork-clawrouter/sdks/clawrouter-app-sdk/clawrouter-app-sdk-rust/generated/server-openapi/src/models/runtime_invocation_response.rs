use serde::{Deserialize, Serialize};

use crate::models::{RuntimeInvocationItem};

/// Runtime invocation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RuntimeInvocationResponse {
    /// Item field on runtime invocation response.
    pub item: RuntimeInvocationItem,
}
