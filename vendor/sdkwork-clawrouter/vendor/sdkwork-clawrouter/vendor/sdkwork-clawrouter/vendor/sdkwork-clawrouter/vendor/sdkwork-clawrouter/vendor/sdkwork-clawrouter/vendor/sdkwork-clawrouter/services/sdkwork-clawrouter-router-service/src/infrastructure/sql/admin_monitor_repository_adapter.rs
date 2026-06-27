use sdkwork_clawrouter_admin_monitor_repository_sqlx::{
    AdminMonitorReadStore as RepositoryAdminMonitorReadStore,
    PostgresAdminMonitorReadStore as RepositoryPostgresAdminMonitorReadStore,
    SqliteAdminMonitorReadStore as RepositorySqliteAdminMonitorReadStore,
};

use crate::domain::DomainError;
use crate::ports::{
    AdminMonitorAlert, AdminMonitorNode, AdminMonitorPerformanceDatum, AdminMonitorQuery,
    AdminMonitorReadFuture, AdminMonitorReadStore,
};

#[derive(Debug, Clone)]
pub struct PostgresAdminMonitorReadStore(RepositoryPostgresAdminMonitorReadStore);

impl PostgresAdminMonitorReadStore {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self(RepositoryPostgresAdminMonitorReadStore::new(pool))
    }
}

impl AdminMonitorReadStore for PostgresAdminMonitorReadStore {
    fn list_monitor_nodes<'a>(
        &'a self,
        query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, Vec<AdminMonitorNode>> {
        Box::pin(async move {
            RepositoryAdminMonitorReadStore::list_monitor_nodes(&self.0, query)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }

    fn list_monitor_alerts<'a>(
        &'a self,
        query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, Vec<AdminMonitorAlert>> {
        Box::pin(async move {
            RepositoryAdminMonitorReadStore::list_monitor_alerts(&self.0, query)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }

    fn list_monitor_performance<'a>(
        &'a self,
        query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, Vec<AdminMonitorPerformanceDatum>> {
        Box::pin(async move {
            RepositoryAdminMonitorReadStore::list_monitor_performance(&self.0, query)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }
}

#[derive(Debug, Clone)]
pub struct SqliteAdminMonitorReadStore(RepositorySqliteAdminMonitorReadStore);

impl SqliteAdminMonitorReadStore {
    pub fn new(pool: sqlx::SqlitePool) -> Self {
        Self(RepositorySqliteAdminMonitorReadStore::new(pool))
    }
}

impl AdminMonitorReadStore for SqliteAdminMonitorReadStore {
    fn list_monitor_nodes<'a>(
        &'a self,
        query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, Vec<AdminMonitorNode>> {
        Box::pin(async move {
            RepositoryAdminMonitorReadStore::list_monitor_nodes(&self.0, query)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }

    fn list_monitor_alerts<'a>(
        &'a self,
        query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, Vec<AdminMonitorAlert>> {
        Box::pin(async move {
            RepositoryAdminMonitorReadStore::list_monitor_alerts(&self.0, query)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }

    fn list_monitor_performance<'a>(
        &'a self,
        query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, Vec<AdminMonitorPerformanceDatum>> {
        Box::pin(async move {
            RepositoryAdminMonitorReadStore::list_monitor_performance(&self.0, query)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }
}
