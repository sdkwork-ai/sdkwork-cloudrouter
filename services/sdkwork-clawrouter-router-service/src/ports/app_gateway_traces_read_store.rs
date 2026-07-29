use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::domain::DomainResult;

pub type AppGatewayTracesReadFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<AppGatewayTracesPage>> + Send + 'a>>;

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct AppGatewayTracesQuery {
    pub cursor: Option<AppGatewayTracesCursor>,
    pub page_size: i64,
    pub keyword: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppGatewayTracesCursor {
    pub started_at_micros: i64,
    pub id: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AppGatewayTracesSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct AppGatewayTracesPage {
    pub items: Vec<AppGatewayTraceItem>,
    pub next_cursor: Option<AppGatewayTracesCursor>,
    pub has_more: bool,
    pub page_size: i64,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppGatewayTraceItem {
    pub id: String,
    pub time: String,
    pub ip: String,
    pub endpoint: String,
    pub method: String,
    pub status: i64,
    pub duration: String,
    pub upstream_account: String,
}

pub trait AppGatewayTracesReadStore {
    fn load_gateway_traces<'a>(
        &'a self,
        query: AppGatewayTracesQuery,
        subject: Option<AppGatewayTracesSubject>,
    ) -> AppGatewayTracesReadFuture<'a>;
}
