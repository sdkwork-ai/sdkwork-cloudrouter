use serde::{Deserialize, Serialize};

use crate::models::{AdminAiResourceItem};

/// Admin ai resource mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiResourceMutationResponse {
    /// Item field on admin ai resource mutation response.
    pub item: AdminAiResourceItem,
}
