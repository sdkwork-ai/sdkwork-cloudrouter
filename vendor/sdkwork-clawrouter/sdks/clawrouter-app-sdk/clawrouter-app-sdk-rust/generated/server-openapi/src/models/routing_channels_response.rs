use serde::{Deserialize, Serialize};

use crate::models::{RoutingChannelItem};

/// Routing channels response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RoutingChannelsResponse {
    /// Items field on routing channels response.
    pub items: Vec<RoutingChannelItem>,
}
