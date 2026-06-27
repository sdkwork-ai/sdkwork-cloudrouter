use serde::{Deserialize, Serialize};

use crate::models::{AdminFirewallItem};

/// Admin firewall rules response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminFirewallRulesResponse {
    /// Items field on admin firewall rules response.
    pub items: Vec<AdminFirewallItem>,
}
