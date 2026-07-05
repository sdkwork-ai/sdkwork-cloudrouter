use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::error::RepositoryResult;

pub type AppProvidersReadFuture<'a, T> =
    Pin<Box<dyn Future<Output = RepositoryResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AppProvidersSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppProvidersListQuery {
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub q: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AppProvidersListPage {
    pub items: Vec<AppProviderItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppProvidersItems<T> {
    pub items: Vec<T>,
}

impl<T> AppProvidersItems<T> {
    pub fn new(items: Vec<T>) -> Self {
        Self { items }
    }
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppProviderItem {
    pub id: String,
    pub provider_family: String,
    pub integration_type: String,
    pub name: String,
    pub description: String,
    pub url: String,
    pub status: String,
}

pub trait AppProvidersReadStore {
    fn load_providers<'a>(
        &'a self,
        subject: Option<AppProvidersSubject>,
        query: AppProvidersListQuery,
    ) -> AppProvidersReadFuture<'a, AppProvidersListPage>;
}
