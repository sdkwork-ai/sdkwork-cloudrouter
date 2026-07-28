use sdkwork_clawrouter_app_gateway_traces_repository_sqlx::{
    AppGatewayTracesReadStore as RepositoryAppGatewayTracesReadStore,
    PostgresAppGatewayTracesReadStore as RepositoryPostgresAppGatewayTracesReadStore,
};

use crate::domain::DomainError;
use crate::ports::{
    AppGatewayTracesListQuery, AppGatewayTracesReadFuture, AppGatewayTracesReadStore,
};

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
        query: AppGatewayTracesListQuery,
    ) -> AppGatewayTracesReadFuture<'a, crate::ports::AppGatewayTracesListPage> {
        Box::pin(async move {
            RepositoryAppGatewayTracesReadStore::load_gateway_traces(&self.0, subject, query)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }
}
