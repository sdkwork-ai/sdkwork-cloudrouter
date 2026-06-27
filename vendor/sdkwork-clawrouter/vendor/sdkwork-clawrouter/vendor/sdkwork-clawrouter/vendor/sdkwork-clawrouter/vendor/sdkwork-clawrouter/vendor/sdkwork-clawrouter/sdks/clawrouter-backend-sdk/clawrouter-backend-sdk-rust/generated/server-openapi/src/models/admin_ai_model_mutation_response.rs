use serde::{Deserialize, Serialize};

use crate::models::{AdminAiModelItem};

/// Admin ai model mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiModelMutationResponse {
    /// Item field on admin ai model mutation response.
    pub item: AdminAiModelItem,
}
