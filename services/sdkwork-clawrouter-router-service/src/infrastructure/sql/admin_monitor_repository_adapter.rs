use sdkwork_clawrouter_admin_monitor_repository_sqlx::{
    AdminMonitorReadStore as RepositoryAdminMonitorReadStore,
    PostgresAdminMonitorReadStore as RepositoryPostgresAdminMonitorReadStore,
};

use crate::domain::DomainError;
use crate::ports::{
    AdminMonitorAlert, AdminMonitorCollection, AdminMonitorNode, AdminMonitorPerformanceDatum,
    AdminMonitorQuery, AdminMonitorReadFuture, AdminMonitorReadStore,
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
    ) -> AdminMonitorReadFuture<'a, AdminMonitorCollection<AdminMonitorNode>> {
        Box::pin(async move {
            RepositoryAdminMonitorReadStore::list_monitor_nodes(&self.0, query)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }

    fn list_monitor_alerts<'a>(
        &'a self,
        query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, AdminMonitorCollection<AdminMonitorAlert>> {
        Box::pin(async move {
            RepositoryAdminMonitorReadStore::list_monitor_alerts(&self.0, query)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }

    fn list_monitor_performance<'a>(
        &'a self,
        query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, AdminMonitorCollection<AdminMonitorPerformanceDatum>> {
        Box::pin(async move {
            RepositoryAdminMonitorReadStore::list_monitor_performance(&self.0, query)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }
}
