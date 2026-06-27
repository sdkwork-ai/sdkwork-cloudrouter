use serde::{Deserialize, Serialize};

/// Persisted firewall rule snapshot returned by the backend.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminFirewallItem {
    /// Id field on admin firewall item.
    pub id: String,

    /// Reason field on admin firewall item.
    pub reason: String,

    /// Time field on admin firewall item.
    pub time: String,

    /// Type field on admin firewall item.
    pub r#type: String,

    /// Value field on admin firewall item.
    pub value: String,
}
