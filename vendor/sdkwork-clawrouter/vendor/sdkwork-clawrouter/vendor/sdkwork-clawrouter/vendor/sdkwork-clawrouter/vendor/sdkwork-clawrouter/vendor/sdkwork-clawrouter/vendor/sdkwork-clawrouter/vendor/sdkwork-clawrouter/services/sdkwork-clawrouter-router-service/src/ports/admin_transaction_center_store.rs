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
    pub provider_code: Option<String>,
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

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminTransactionCollection {
    pub items: Vec<AdminTransactionJsonRecord>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminPaymentProviderAccountCommand {
    pub subject: AdminTransactionCenterSubject,
    pub account_no: String,
    pub provider_code: String,
    pub account_role: Option<String>,
    pub merchant_id: String,
    pub environment: String,
    pub country_code: String,
    pub settlement_currency: String,
    pub secret_ref: String,
    pub webhook_secret_ref: Option<String>,
    pub certificate_ref: Option<String>,
    pub rotated_at: Option<String>,
    pub client_request_no: Option<String>,
    pub note: Option<String>,
    pub status: String,
    pub idempotency_key: String,
    pub request_id: Option<String>,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminPaymentProviderAccountCommand {
    pub subject: AdminTransactionCenterSubject,
    pub provider_account_id: String,
    pub provider_code: String,
    pub account_role: Option<String>,
    pub merchant_id: String,
    pub environment: String,
    pub country_code: String,
    pub settlement_currency: String,
    pub secret_ref: String,
    pub webhook_secret_ref: Option<String>,
    pub certificate_ref: Option<String>,
    pub rotated_at: Option<String>,
    pub client_request_no: Option<String>,
    pub note: Option<String>,
    pub status: String,
    pub idempotency_key: String,
    pub request_id: Option<String>,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminPaymentProviderAccountStatusCommand {
    pub subject: AdminTransactionCenterSubject,
    pub provider_account_id: String,
    pub status: String,
    pub client_request_no: Option<String>,
    pub note: Option<String>,
    pub idempotency_key: String,
    pub request_id: Option<String>,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminPaymentProviderAccountCommand {
    pub subject: AdminTransactionCenterSubject,
    pub provider_account_id: String,
    pub request_id: Option<String>,
    pub requested_at: String,
}

pub trait AdminTransactionCenterStore {
    fn list_orders<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection>;

    fn load_order<'a>(
        &'a self,
        query: LoadAdminTransactionRecordQuery,
    ) -> AdminTransactionCenterFuture<'a, Option<AdminTransactionJsonRecord>>;

    fn list_order_events<'a>(
        &'a self,
        query: ListAdminTransactionChildRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection>;

    fn list_refunds<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection>;

    fn load_refund<'a>(
        &'a self,
        query: LoadAdminTransactionRecordQuery,
    ) -> AdminTransactionCenterFuture<'a, Option<AdminTransactionJsonRecord>>;

    fn list_fulfillments<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection>;

    fn list_shipments<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection>;

    fn list_shipment_tracking_events<'a>(
        &'a self,
        query: ListAdminTransactionChildRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection>;

    fn list_payment_providers<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection>;

    fn list_payment_provider_accounts<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection>;

    fn create_payment_provider_account<'a>(
        &'a self,
        command: CreateAdminPaymentProviderAccountCommand,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionJsonRecord>;

    fn update_payment_provider_account<'a>(
        &'a self,
        command: UpdateAdminPaymentProviderAccountCommand,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionJsonRecord>;

    fn update_payment_provider_account_status<'a>(
        &'a self,
        command: UpdateAdminPaymentProviderAccountStatusCommand,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionJsonRecord>;

    fn delete_payment_provider_account<'a>(
        &'a self,
        command: DeleteAdminPaymentProviderAccountCommand,
    ) -> AdminTransactionCenterFuture<'a, bool>;

    fn list_payment_methods<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection>;

    fn list_payment_channels<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection>;

    fn list_payment_route_rules<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection>;

    fn list_payment_intents<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection>;

    fn list_payment_attempts<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection>;

    fn list_payment_webhook_events<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection>;

    fn list_payment_reconciliation_runs<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection>;
}
