use serde::{Deserialize, Serialize};

/// Admin firewall rule create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminFirewallRuleCreateRequest {
    /// Operator-provided reason for audit records.
    pub reason: String,

    /// Firewall rule category.
    pub r#type: String,

    /// IP address, CIDR block, domain, or request target expression.
    pub value: String,
}
