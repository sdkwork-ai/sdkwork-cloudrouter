use serde::{Deserialize, Serialize};

/// Admin monitor alert item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMonitorAlertItem {
    /// Id field on admin monitor alert item.
    pub id: String,

    /// Message field on admin monitor alert item.
    pub message: String,

    /// Severity field on admin monitor alert item.
    pub severity: String,

    /// Source field on admin monitor alert item.
    pub source: String,

    /// Status field on admin monitor alert item.
    pub status: String,

    /// Time field on admin monitor alert item.
    pub time: String,

    /// Title field on admin monitor alert item.
    pub title: String,
}
