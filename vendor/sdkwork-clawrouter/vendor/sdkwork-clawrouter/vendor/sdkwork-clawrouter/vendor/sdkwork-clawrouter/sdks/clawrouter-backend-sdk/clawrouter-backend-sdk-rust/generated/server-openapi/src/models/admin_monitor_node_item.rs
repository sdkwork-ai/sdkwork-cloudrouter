use serde::{Deserialize, Serialize};

/// Admin monitor node item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMonitorNodeItem {
    /// Cpu field on admin monitor node item.
    pub cpu: f64,

    /// Id field on admin monitor node item.
    pub id: String,

    /// Ip field on admin monitor node item.
    pub ip: String,

    /// Memory field on admin monitor node item.
    pub memory: f64,

    /// Name field on admin monitor node item.
    pub name: String,

    /// Region field on admin monitor node item.
    pub region: String,

    /// Status field on admin monitor node item.
    pub status: String,

    /// Uptime field on admin monitor node item.
    pub uptime: String,
}
