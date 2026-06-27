use serde::{Deserialize, Serialize};

use crate::models::{AdminSiteChannelItem};

/// Admin site channels response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminSiteChannelsResponse {
    /// Items field on admin site channels response.
    pub items: Vec<AdminSiteChannelItem>,
}
