use serde::{Deserialize, Serialize};

use crate::models::{AdminAnalyticsUserRankItem};

/// Admin analytics user rankings schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAnalyticsUserRankings {
    /// Points field on admin analytics user rankings.
    pub points: Vec<AdminAnalyticsUserRankItem>,

    /// Requests field on admin analytics user rankings.
    pub requests: Vec<AdminAnalyticsUserRankItem>,

    /// Tokens field on admin analytics user rankings.
    pub tokens: Vec<AdminAnalyticsUserRankItem>,
}
