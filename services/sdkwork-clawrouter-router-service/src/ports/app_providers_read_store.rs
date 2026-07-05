use std::future::Future;
use std::pin::Pin;

pub use sdkwork_clawrouter_app_providers_repository_sqlx::{
    AppProviderItem, AppProvidersItems, AppProvidersListPage, AppProvidersListQuery,
    AppProvidersSubject,
};

use crate::domain::DomainResult;

pub type AppProvidersReadFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

pub trait AppProvidersReadStore {
    fn load_providers<'a>(
        &'a self,
        subject: Option<AppProvidersSubject>,
        query: AppProvidersListQuery,
    ) -> AppProvidersReadFuture<'a, AppProvidersListPage>;
}
