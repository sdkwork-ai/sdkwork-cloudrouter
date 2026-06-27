use serde::{Deserialize, Serialize};

use crate::models::{AdminPromptItem};

/// Admin prompt mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminPromptMutationResponse {
    /// Item field on admin prompt mutation response.
    pub item: AdminPromptItem,
}
