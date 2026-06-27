use serde::{Deserialize, Serialize};

use crate::models::{AdminPromptBindingItem};

/// Admin prompt binding list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminPromptBindingListResponse {
    /// Items field on admin prompt binding list response.
    pub items: Vec<AdminPromptBindingItem>,
}
