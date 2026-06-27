use serde::{Deserialize, Serialize};

use crate::models::{AdminPromptBindingItem};

/// Admin prompt binding mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminPromptBindingMutationResponse {
    /// Item field on admin prompt binding mutation response.
    pub item: AdminPromptBindingItem,
}
