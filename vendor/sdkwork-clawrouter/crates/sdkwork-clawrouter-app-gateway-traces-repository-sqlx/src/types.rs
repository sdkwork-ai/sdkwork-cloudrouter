use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::error::RepositoryResult;

pub type AppGatewayTracesReadFuture<'a, T> =
    Pin<Box<dyn Future<Output = RepositoryResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AppGatewayTracesSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppGatewayTraceItems<T> {
    pub items: Vec<T>,
}

impl<T> AppGatewayTraceItems<T> {
    pub fn new(items: Vec<T>) -> Self {
        Self { items }
    }
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppGatewayTraceItem {
    pub id: String,
    pub time: String,
    pub ip: String,
    pub endpoint: String,
    pub method: String,
    pub status: i64,
    pub duration: String,
    pub channel: String,
}

pub trait AppGatewayTracesReadStore {
    fn load_gateway_traces<'a>(
        &'a self,
        subject: Option<AppGatewayTracesSubject>,
    ) -> AppGatewayTracesReadFuture<'a, Vec<AppGatewayTraceItem>>;
}
