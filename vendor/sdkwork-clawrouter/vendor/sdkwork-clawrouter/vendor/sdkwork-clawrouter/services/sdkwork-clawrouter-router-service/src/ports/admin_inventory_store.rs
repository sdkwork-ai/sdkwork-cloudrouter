use std::future::Future;
use std::pin::Pin;

use serde_json::{Map, Value};

use crate::domain::DomainResult;

pub type AdminInventoryFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

pub type AdminInventoryJsonRecord = Map<String, Value>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminInventorySubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminInventoryRecordsQuery {
    pub subject: AdminInventorySubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub status: Option<String>,
    pub sku_id: Option<String>,
    pub warehouse_id: Option<String>,
    pub order_id: Option<String>,
    pub checkout_session_id: Option<String>,
    pub source_type: Option<String>,
    pub source_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminInventoryCollection {
    pub items: Vec<AdminInventoryJsonRecord>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminInventoryStockCommand {
    pub subject: AdminInventorySubject,
    pub stock_id: String,
    pub available_quantity: Option<i64>,
    pub reserved_quantity: Option<i64>,
    pub status: Option<String>,
    pub version: i64,
    pub reason_code: Option<String>,
    pub idempotency_key: String,
    pub request_id: String,
    pub requested_at: String,
}

pub trait AdminInventoryStore {
    fn list_stocks<'a>(
        &'a self,
        query: ListAdminInventoryRecordsQuery,
    ) -> AdminInventoryFuture<'a, AdminInventoryCollection>;

    fn update_stock<'a>(
        &'a self,
        command: UpdateAdminInventoryStockCommand,
    ) -> AdminInventoryFuture<'a, AdminInventoryJsonRecord>;

    fn list_reservations<'a>(
        &'a self,
        query: ListAdminInventoryRecordsQuery,
    ) -> AdminInventoryFuture<'a, AdminInventoryCollection>;

    fn list_ledger_entries<'a>(
        &'a self,
        query: ListAdminInventoryRecordsQuery,
    ) -> AdminInventoryFuture<'a, AdminInventoryCollection>;
}
