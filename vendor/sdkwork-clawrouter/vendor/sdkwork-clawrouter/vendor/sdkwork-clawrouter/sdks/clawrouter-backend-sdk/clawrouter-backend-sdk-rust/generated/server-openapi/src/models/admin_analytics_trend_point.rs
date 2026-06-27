use serde::{Deserialize, Serialize};

/// Admin analytics trend point schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAnalyticsTrendPoint {
    /// Points field on admin analytics trend point.
    pub points: f64,

    /// Requests field on admin analytics trend point.
    pub requests: f64,

    /// Time field on admin analytics trend point.
    pub time: String,

    /// Tokens field on admin analytics trend point.
    pub tokens: f64,

    /// Users field on admin analytics trend point.
    pub users: String,
}
