use serde::{Deserialize, Serialize};

use crate::models::{AdminFirewallMutationResponse};

/// Firewalls rules create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct FirewallsRulesCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on firewalls rules create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminFirewallMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
