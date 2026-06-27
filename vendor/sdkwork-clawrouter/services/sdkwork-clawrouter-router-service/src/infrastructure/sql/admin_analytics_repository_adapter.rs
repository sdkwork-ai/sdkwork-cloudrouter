use sdkwork_clawrouter_admin_analytics_repository_sqlx::{
    AdminAnalyticsReadStore as RepositoryAdminAnalyticsReadStore,
    PostgresAdminAnalyticsReadStore as RepositoryPostgresAdminAnalyticsReadStore,
    SqliteAdminAnalyticsReadStore as RepositorySqliteAdminAnalyticsReadStore,
};

use crate::domain::DomainError;
use crate::ports::{AdminAnalyticsQuery, AdminAnalyticsReadFuture, AdminAnalyticsReadStore};

#[derive(Debug, Clone)]
pub struct PostgresAdminAnalyticsReadStore(RepositoryPostgresAdminAnalyticsReadStore);

impl PostgresAdminAnalyticsReadStore {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self(RepositoryPostgresAdminAnalyticsReadStore::new(pool))
    }
}

impl AdminAnalyticsReadStore for PostgresAdminAnalyticsReadStore {
    fn load_admin_analytics<'a>(
        &'a self,
        query: AdminAnalyticsQuery,
    ) -> AdminAnalyticsReadFuture<'a> {
        Box::pin(async move {
            RepositoryAdminAnalyticsReadStore::load_admin_analytics(&self.0, query)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }
}

#[derive(Debug, Clone)]
pub struct SqliteAdminAnalyticsReadStore(RepositorySqliteAdminAnalyticsReadStore);

impl SqliteAdminAnalyticsReadStore {
    pub fn new(pool: sqlx::SqlitePool) -> Self {
        Self(RepositorySqliteAdminAnalyticsReadStore::new(pool))
    }
}

impl AdminAnalyticsReadStore for SqliteAdminAnalyticsReadStore {
    fn load_admin_analytics<'a>(
        &'a self,
        query: AdminAnalyticsQuery,
    ) -> AdminAnalyticsReadFuture<'a> {
        Box::pin(async move {
            RepositoryAdminAnalyticsReadStore::load_admin_analytics(&self.0, query)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }
}
