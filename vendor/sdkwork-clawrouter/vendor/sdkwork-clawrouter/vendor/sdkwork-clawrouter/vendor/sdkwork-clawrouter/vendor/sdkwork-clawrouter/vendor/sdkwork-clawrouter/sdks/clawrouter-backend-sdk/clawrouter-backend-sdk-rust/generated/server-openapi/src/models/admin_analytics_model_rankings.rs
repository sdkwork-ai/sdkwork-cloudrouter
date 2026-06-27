use serde::{Deserialize, Serialize};

use crate::models::{AdminAnalyticsModelRankItem};

/// Admin analytics model rankings schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAnalyticsModelRankings {
    /// Points field on admin analytics model rankings.
    pub points: Vec<AdminAnalyticsModelRankItem>,

    /// Requests field on admin analytics model rankings.
    pub requests: Vec<AdminAnalyticsModelRankItem>,

    /// Tokens field on admin analytics model rankings.
    pub tokens: Vec<AdminAnalyticsModelRankItem>,
}
