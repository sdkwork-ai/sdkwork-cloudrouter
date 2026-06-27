use sdkwork_clawrouter_app_providers_repository_sqlx::{
    AppProvidersReadStore as RepositoryAppProvidersReadStore,
    PostgresAppProvidersReadStore as RepositoryPostgresAppProvidersReadStore,
    SqliteAppProvidersReadStore as RepositorySqliteAppProvidersReadStore,
};

use crate::domain::DomainError;
use crate::ports::{
    AppProviderItem, AppProvidersReadFuture, AppProvidersReadStore, AppProvidersSubject,
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
    ) -> AppProvidersReadFuture<'a, Vec<AppProviderItem>> {
        Box::pin(async move {
            RepositoryAppProvidersReadStore::load_providers(&self.0, subject)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }
}

#[derive(Debug, Clone)]
pub struct SqliteAppProvidersReadStore(RepositorySqliteAppProvidersReadStore);

impl SqliteAppProvidersReadStore {
    pub fn new(pool: sqlx::SqlitePool) -> Self {
        Self(RepositorySqliteAppProvidersReadStore::new(pool))
    }
}

impl AppProvidersReadStore for SqliteAppProvidersReadStore {
    fn load_providers<'a>(
        &'a self,
        subject: Option<AppProvidersSubject>,
    ) -> AppProvidersReadFuture<'a, Vec<AppProviderItem>> {
        Box::pin(async move {
            RepositoryAppProvidersReadStore::load_providers(&self.0, subject)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }
}
