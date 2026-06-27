use serde::{Deserialize, Serialize};

use crate::models::{AdminPromptVersionItem};

/// Admin prompt version list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminPromptVersionListResponse {
    /// Items field on admin prompt version list response.
    pub items: Vec<AdminPromptVersionItem>,
}
