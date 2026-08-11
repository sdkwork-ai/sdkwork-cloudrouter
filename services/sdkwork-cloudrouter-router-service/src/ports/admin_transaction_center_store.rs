use std::future::Future;
use std::pin::Pin;

use serde_json::{Map, Value};

use crate::domain::DomainResult;

pub type AdminTransactionCenterFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

pub type AdminTransactionJsonRecord = Map<String, Value>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminTransactionCenterSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminTransactionRecordsQuery {
    pub subject: AdminTransactionCenterSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub status: Option<String>,
    pub supplier_code: Option<String>,
    pub provider_account_id: Option<String>,
    pub method_code: Option<String>,
    pub country_code: Option<String>,
    pub currency_code: Option<String>,
    pub order_id: Option<String>,
    pub intent_id: Option<String>,
    pub business_date: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LoadAdminTransactionRecordQuery {
    pub subject: AdminTransactionCenterSubject,
    pub record_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminTransactionChildRecordsQuery {
    pub subject: AdminTransactionCenterSubject,
    pub parent_id: String,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub status: Option<String>,
}

/// Operator edit of a payment provider (display name, localized names, sort
/// order, status). `reason` is mandatory so every mutation keeps an audit
/// trail; mutable fields are optional but at least one must be present.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdatePaymentProviderCommand {
    pub subject: AdminTransactionCenterSubject,
    pub provider_id: String,
    pub display_name: Option<String>,
    pub display_name_i18n: Option<serde_json::Value>,
    pub sort_order: Option<i32>,
    pub status: Option<String>,
    pub reason: String,
    pub request_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminTransactionCollection {
    pub items: Vec<AdminTransactionJsonRecord>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

pub trait AdminTransactionCenterStore {
    fn list_payment_providers<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection>;

    fn list_payment_provider_accounts<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection>;

    fn update_payment_provider<'a>(
        &'a self,
        command: UpdatePaymentProviderCommand,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionJsonRecord>;
}
