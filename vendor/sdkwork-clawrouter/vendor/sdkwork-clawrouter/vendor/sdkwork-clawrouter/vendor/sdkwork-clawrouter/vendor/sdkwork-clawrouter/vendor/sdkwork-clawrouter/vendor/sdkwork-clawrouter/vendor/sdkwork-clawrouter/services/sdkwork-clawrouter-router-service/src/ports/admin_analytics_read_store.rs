use std::future::Future;
use std::pin::Pin;

pub use sdkwork_clawrouter_admin_analytics_repository_sqlx::{
    AdminAnalyticsInsight, AdminAnalyticsModelRankItem, AdminAnalyticsModelRankings,
    AdminAnalyticsPieItem, AdminAnalyticsQuery, AdminAnalyticsSnapshot, AdminAnalyticsSubject,
    AdminAnalyticsSummary, AdminAnalyticsTimeRange, AdminAnalyticsTrendPoint,
    AdminAnalyticsUserRankItem, AdminAnalyticsUserRankings,
};

use crate::domain::DomainResult;

pub type AdminAnalyticsReadFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<AdminAnalyticsSnapshot>> + Send + 'a>>;

pub trait AdminAnalyticsReadStore {
    fn load_admin_analytics<'a>(
        &'a self,
        query: AdminAnalyticsQuery,
    ) -> AdminAnalyticsReadFuture<'a>;
}
