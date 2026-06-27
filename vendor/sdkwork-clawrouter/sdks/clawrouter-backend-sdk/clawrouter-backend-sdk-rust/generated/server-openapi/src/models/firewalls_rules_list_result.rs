use serde::{Deserialize, Serialize};

use crate::models::{AdminFirewallRulesResponse};

/// Firewalls rules list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct FirewallsRulesListResult {
    /// Business response code.
    pub code: String,

    /// Data field on firewalls rules list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminFirewallRulesResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
