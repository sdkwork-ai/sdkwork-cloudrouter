use serde::{Deserialize, Serialize};

use crate::models::{AdminFirewallItem};

/// Admin firewall mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminFirewallMutationResponse {
    /// Item field on admin firewall mutation response.
    pub item: AdminFirewallItem,
}
