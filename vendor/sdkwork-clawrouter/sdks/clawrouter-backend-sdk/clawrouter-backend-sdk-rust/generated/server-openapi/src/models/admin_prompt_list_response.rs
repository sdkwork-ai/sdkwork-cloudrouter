use serde::{Deserialize, Serialize};

use crate::models::{AdminPromptItem};

/// Admin prompt list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminPromptListResponse {
    /// Items field on admin prompt list response.
    pub items: Vec<AdminPromptItem>,
}
