use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::domain::DomainResult;

pub type AdminFinanceReadFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminFinanceSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminTransactionsQuery {
    pub subject: AdminFinanceSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub keyword: Option<String>,
    pub status: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminBillingRecordsQuery {
    pub subject: AdminFinanceSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub keyword: Option<String>,
    pub status: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminTransactionRecordItem {
    pub id: String,
    pub time: String,
    pub user_id: String,
    #[serde(rename = "type")]
    pub transaction_type: String,
    pub amount: String,
    pub balance: String,
    pub description: String,
    pub status: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminBillingRecordItem {
    pub id: String,
    pub user_id: String,
    pub period: String,
    pub total_tokens: i64,
    pub total_cost: String,
    pub status: String,
    pub due_date: String,
}

pub trait AdminFinanceStore {
    fn list_transactions<'a>(
        &'a self,
        query: ListAdminTransactionsQuery,
    ) -> AdminFinanceReadFuture<'a, Vec<AdminTransactionRecordItem>>;

    fn list_billing_records<'a>(
        &'a self,
        query: ListAdminBillingRecordsQuery,
    ) -> AdminFinanceReadFuture<'a, Vec<AdminBillingRecordItem>>;
}
