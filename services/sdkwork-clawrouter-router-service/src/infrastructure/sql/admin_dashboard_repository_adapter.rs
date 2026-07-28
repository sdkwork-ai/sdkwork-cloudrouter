use sdkwork_clawrouter_admin_dashboard_repository_sqlx::{
    AdminDashboardReadStore as RepositoryAdminDashboardReadStore,
    PostgresAdminDashboardReadStore as RepositoryPostgresAdminDashboardReadStore,
};

use crate::domain::DomainError;
use crate::ports::{AdminDashboardQuery, AdminDashboardReadFuture, AdminDashboardReadStore};

#[derive(Debug, Clone)]
pub struct PostgresAdminDashboardReadStore(RepositoryPostgresAdminDashboardReadStore);

impl PostgresAdminDashboardReadStore {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self(RepositoryPostgresAdminDashboardReadStore::new(pool))
    }
}

impl AdminDashboardReadStore for PostgresAdminDashboardReadStore {
    fn load_dashboard<'a>(&'a self, query: AdminDashboardQuery) -> AdminDashboardReadFuture<'a> {
        Box::pin(async move {
            RepositoryAdminDashboardReadStore::load_dashboard(&self.0, query)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }
}
