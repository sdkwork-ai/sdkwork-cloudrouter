use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

pub type StickyRouteStoreFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

pub trait StickyRouteStore: Send + Sync {
    fn find_binding<'a>(
        &'a self,
        query: StickyObjectRouteLookup,
    ) -> StickyRouteStoreFuture<'a, Option<StickyObjectRouteBinding>>;

    fn upsert_binding<'a>(
        &'a self,
        command: StickyObjectRouteUpsert,
    ) -> StickyRouteStoreFuture<'a, ()>;
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StickyObjectRouteLookup {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub object_type: String,
    pub object_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StickyObjectRouteBinding {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub object_type: String,
    pub object_id: String,
    pub parent_object_type: Option<String>,
    pub parent_object_id: Option<String>,
    pub provider_code: String,
    pub channel_id: i64,
    pub channel_group_id: Option<i64>,
    pub vendor_code: Option<String>,
    pub api_code: Option<String>,
    pub catalog_key: Option<String>,
    pub provider_model: Option<String>,
    pub region_code: Option<String>,
    pub sticky_scope: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StickyObjectRouteUpsert {
    pub request_id: String,
    pub trace_id: Option<String>,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub api_key_id: Option<i64>,
    pub channel_group_id: Option<i64>,
    pub object_type: String,
    pub object_id: String,
    pub parent_object_type: Option<String>,
    pub parent_object_id: Option<String>,
    pub provider_code: String,
    pub channel_id: i64,
    pub vendor_code: Option<String>,
    pub api_code: String,
    pub catalog_key: Option<String>,
    pub provider_model: Option<String>,
    pub region_code: Option<String>,
    pub sticky_scope: String,
    pub meter_code: Option<String>,
}
