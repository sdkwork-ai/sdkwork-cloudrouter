use serde::{Deserialize, Serialize};

use crate::models::{AdminChannelGroupItem};

/// Admin channel groups response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminChannelGroupsResponse {
    /// Items field on admin channel groups response.
    pub items: Vec<AdminChannelGroupItem>,
}
