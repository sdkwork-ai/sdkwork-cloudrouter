use serde::{Deserialize, Serialize};

/// Admin analytics insight schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAnalyticsInsight {
    /// Detail field on admin analytics insight.
    pub detail: String,

    /// Key field on admin analytics insight.
    pub key: String,

    /// Severity field on admin analytics insight.
    pub severity: String,

    /// Title field on admin analytics insight.
    pub title: String,

    /// Value field on admin analytics insight.
    pub value: String,
}
