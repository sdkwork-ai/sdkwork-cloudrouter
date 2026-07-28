use sdkwork_clawrouter_settlements_dashboard_repository_sqlx::{
    PostgresSettlementsDashboardReadStore as RepositoryPostgresSettlementsDashboardReadStore,
    SettlementsDashboardReadStore as RepositorySettlementsDashboardReadStore,
};

use crate::domain::DomainError;
use crate::ports::{
    SettlementsDashboardQuery, SettlementsDashboardReadFuture, SettlementsDashboardReadStore,
    SettlementsDashboardSubject,
};

#[derive(Debug, Clone)]
pub struct PostgresSettlementsDashboardReadStore(RepositoryPostgresSettlementsDashboardReadStore);

impl PostgresSettlementsDashboardReadStore {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self(RepositoryPostgresSettlementsDashboardReadStore::new(pool))
    }
}

impl SettlementsDashboardReadStore for PostgresSettlementsDashboardReadStore {
    fn load_settlements_dashboard<'a>(
        &'a self,
        query: SettlementsDashboardQuery,
        subject: Option<SettlementsDashboardSubject>,
    ) -> SettlementsDashboardReadFuture<'a> {
        Box::pin(async move {
            RepositorySettlementsDashboardReadStore::load_settlements_dashboard(
                &self.0, query, subject,
            )
            .await
            .map_err(|error| DomainError::new(error.to_string()))
        })
    }
}
