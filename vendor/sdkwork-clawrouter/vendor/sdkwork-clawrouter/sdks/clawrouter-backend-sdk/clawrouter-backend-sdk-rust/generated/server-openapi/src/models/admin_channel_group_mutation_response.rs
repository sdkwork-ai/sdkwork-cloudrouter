use serde::{Deserialize, Serialize};

use crate::models::{AdminChannelGroupItem};

/// Admin channel group mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminChannelGroupMutationResponse {
    /// Item field on admin channel group mutation response.
    pub item: AdminChannelGroupItem,
}
