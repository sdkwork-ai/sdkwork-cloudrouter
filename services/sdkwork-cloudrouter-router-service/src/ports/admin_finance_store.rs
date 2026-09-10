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

/// Opaque keyset position for admin finance lists (`PAGINATION_SPEC.md` §6:
/// fast-growing tables seek on the stable `(sort_time, id)` tuple).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminFinanceCursor {
    pub occurred_at_micros: i64,
    pub id: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminTransactionsQuery {
    pub subject: AdminFinanceSubject,
    pub cursor: Option<AdminFinanceCursor>,
    pub page_size: i64,
    pub keyword: Option<String>,
    pub status: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminBillingRecordsQuery {
    pub subject: AdminFinanceSubject,
    pub cursor: Option<AdminFinanceCursor>,
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

/// Bounded cursor page. `items` never exceeds `page_size`; `next_cursor` is
/// `Some` only when `has_more` is true so clients can continue the seek.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminFinanceCollection<T> {
    pub items: Vec<T>,
    pub next_cursor: Option<AdminFinanceCursor>,
    pub has_more: bool,
    pub page_size: i64,
}

pub trait AdminFinanceStore {
    fn list_transactions<'a>(
        &'a self,
        query: ListAdminTransactionsQuery,
    ) -> AdminFinanceReadFuture<'a, AdminFinanceCollection<AdminTransactionRecordItem>>;

    fn list_billing_records<'a>(
        &'a self,
        query: ListAdminBillingRecordsQuery,
    ) -> AdminFinanceReadFuture<'a, AdminFinanceCollection<AdminBillingRecordItem>>;
}
