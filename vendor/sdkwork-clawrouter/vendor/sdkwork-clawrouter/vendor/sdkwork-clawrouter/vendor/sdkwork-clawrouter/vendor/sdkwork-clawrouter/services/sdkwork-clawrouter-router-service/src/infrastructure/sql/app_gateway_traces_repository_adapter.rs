use sdkwork_clawrouter_app_gateway_traces_repository_sqlx::{
    AppGatewayTracesReadStore as RepositoryAppGatewayTracesReadStore,
    PostgresAppGatewayTracesReadStore as RepositoryPostgresAppGatewayTracesReadStore,
    SqliteAppGatewayTracesReadStore as RepositorySqliteAppGatewayTracesReadStore,
};

use crate::domain::DomainError;
use crate::ports::{AppGatewayTracesReadFuture, AppGatewayTracesReadStore};

#[derive(Debug, Clone)]
pub struct PostgresAppGatewayTracesReadStore(RepositoryPostgresAppGatewayTracesReadStore);

impl PostgresAppGatewayTracesReadStore {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self(RepositoryPostgresAppGatewayTracesReadStore::new(pool))
    }
}

impl AppGatewayTracesReadStore for PostgresAppGatewayTracesReadStore {
    fn load_gateway_traces<'a>(
        &'a self,
        subject: Option<crate::ports::AppGatewayTracesSubject>,
    ) -> AppGatewayTracesReadFuture<'a, Vec<crate::ports::AppGatewayTraceItem>> {
        Box::pin(async move {
            RepositoryAppGatewayTracesReadStore::load_gateway_traces(&self.0, subject)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }
}

#[derive(Debug, Clone)]
pub struct SqliteAppGatewayTracesReadStore(RepositorySqliteAppGatewayTracesReadStore);

impl SqliteAppGatewayTracesReadStore {
    pub fn new(pool: sqlx::SqlitePool) -> Self {
        Self(RepositorySqliteAppGatewayTracesReadStore::new(pool))
    }
}

impl AppGatewayTracesReadStore for SqliteAppGatewayTracesReadStore {
    fn load_gateway_traces<'a>(
        &'a self,
        subject: Option<crate::ports::AppGatewayTracesSubject>,
    ) -> AppGatewayTracesReadFuture<'a, Vec<crate::ports::AppGatewayTraceItem>> {
        Box::pin(async move {
            RepositoryAppGatewayTracesReadStore::load_gateway_traces(&self.0, subject)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }
}
