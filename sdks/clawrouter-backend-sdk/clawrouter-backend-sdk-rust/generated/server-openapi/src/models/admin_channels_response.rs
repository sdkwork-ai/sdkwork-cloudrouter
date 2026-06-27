use serde::{Deserialize, Serialize};

use crate::models::{AdminChannelItem};

/// Admin channels response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminChannelsResponse {
    /// Items field on admin channels response.
    pub items: Vec<AdminChannelItem>,
}
