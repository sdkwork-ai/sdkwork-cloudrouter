use serde::{Deserialize, Serialize};

/// Admin dashboard traffic item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminDashboardTrafficItem {
    /// Cost field on admin dashboard traffic item.
    pub cost: f64,

    /// Requests field on admin dashboard traffic item.
    pub requests: f64,

    /// Time field on admin dashboard traffic item.
    pub time: String,

    /// Tokens field on admin dashboard traffic item.
    pub tokens: f64,
}
