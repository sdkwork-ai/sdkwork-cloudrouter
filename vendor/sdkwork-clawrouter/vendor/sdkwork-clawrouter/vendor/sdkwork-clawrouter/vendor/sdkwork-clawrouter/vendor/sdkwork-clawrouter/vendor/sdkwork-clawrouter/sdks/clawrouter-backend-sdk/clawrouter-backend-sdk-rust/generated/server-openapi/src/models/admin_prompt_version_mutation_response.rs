use serde::{Deserialize, Serialize};

use crate::models::{AdminPromptVersionItem};

/// Admin prompt version mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminPromptVersionMutationResponse {
    /// Item field on admin prompt version mutation response.
    pub item: AdminPromptVersionItem,
}
