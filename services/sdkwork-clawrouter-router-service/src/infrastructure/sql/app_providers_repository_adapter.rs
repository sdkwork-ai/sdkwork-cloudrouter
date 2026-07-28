use sdkwork_clawrouter_app_providers_repository_sqlx::{
    AppProvidersReadStore as RepositoryAppProvidersReadStore,
    PostgresAppProvidersReadStore as RepositoryPostgresAppProvidersReadStore,
};

use crate::domain::DomainError;
use crate::ports::{
    AppProvidersListPage, AppProvidersListQuery, AppProvidersReadFuture, AppProvidersReadStore,
    AppProvidersSubject,
};

#[derive(Debug, Clone)]
pub struct PostgresAppProvidersReadStore(RepositoryPostgresAppProvidersReadStore);

impl PostgresAppProvidersReadStore {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self(RepositoryPostgresAppProvidersReadStore::new(pool))
    }
}

impl AppProvidersReadStore for PostgresAppProvidersReadStore {
    fn load_providers<'a>(
        &'a self,
        subject: Option<AppProvidersSubject>,
        query: AppProvidersListQuery,
    ) -> AppProvidersReadFuture<'a, AppProvidersListPage> {
        Box::pin(async move {
            RepositoryAppProvidersReadStore::load_providers(&self.0, subject, query)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }
}
