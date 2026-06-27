use serde::{Deserialize, Serialize};

use crate::models::{AdminChannelItem};

/// Admin channel mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminChannelMutationResponse {
    /// Item field on admin channel mutation response.
    pub item: AdminChannelItem,
}
