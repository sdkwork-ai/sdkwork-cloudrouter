use serde::{Deserialize, Serialize};

use crate::models::{AdminAiResourceItem};

/// Admin ai resources response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiResourcesResponse {
    /// Items field on admin ai resources response.
    pub items: Vec<AdminAiResourceItem>,
}
