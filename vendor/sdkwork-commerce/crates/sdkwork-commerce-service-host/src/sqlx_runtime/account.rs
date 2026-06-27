use sdkwork_commerce_account_service::{
    BillingHistoryListQuery, WalletAccountListQuery, WalletTransactionListQuery,
};
use sdkwork_commerce_contract_service::{CommerceAccountAssetType, CommerceServiceError};
use sdkwork_commerce_storage_repository_sqlx::{
    PostgresCommerceAccountStore, PostgresCommerceBillingHistoryStore, SqliteCommerceAccountStore,
    SqliteCommerceBillingHistoryStore,
};

use crate::{CommerceAccountRuntimeStore, CommerceRuntimeServiceRequest};

use super::{
    block_on_commerce_async, json_string, parse_body_json, string_field, CommerceSqlxRuntimePool,
};

#[derive(Clone, Debug)]
pub struct SqlxCommerceAccountRuntimeStore {
    pool: CommerceSqlxRuntimePool,
}

impl SqlxCommerceAccountRuntimeStore {
    pub fn new(pool: CommerceSqlxRuntimePool) -> Self {
        Self { pool }
    }

    fn dispatch(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        match request.execution_plan.operation_id {
            "wallet.overview.retrieve" => self.wallet_overview(request),
            "wallet.accounts.list" => self.wallet_accounts(request),
            "wallet.ledgerEntries.list" => self.wallet_ledger_entries(request),
            "commerceReports.usageStatements.list" => self.usage_statements(request),
            other => Err(CommerceServiceError::unsupported_capability(format!(
                "account sqlx runtime store does not support operation: {other}"
            ))),
        }
    }

    fn wallet_overview(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        let query = wallet_list_query(request)?;
        let overview = match &self.pool {
            CommerceSqlxRuntimePool::Sqlite(pool) => block_on_commerce_async(async {
                SqliteCommerceAccountStore::new(pool.clone())
                    .retrieve_wallet_overview(query)
                    .await
            })?,
            CommerceSqlxRuntimePool::Postgres(pool) => block_on_commerce_async(async {
                PostgresCommerceAccountStore::new(pool.clone())
                    .retrieve_wallet_overview(query)
                    .await
            })?,
        };
        json_string(serde_json::json!({
            "accounts": overview.accounts.into_iter().map(map_wallet_account).collect::<Vec<_>>(),
        }))
    }

    fn wallet_accounts(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        let query = wallet_list_query(request)?;
        let accounts = match &self.pool {
            CommerceSqlxRuntimePool::Sqlite(pool) => block_on_commerce_async(async {
                SqliteCommerceAccountStore::new(pool.clone())
                    .list_wallet_accounts(query)
                    .await
            })?,
            CommerceSqlxRuntimePool::Postgres(pool) => block_on_commerce_async(async {
                PostgresCommerceAccountStore::new(pool.clone())
                    .list_wallet_accounts(query)
                    .await
            })?,
        };
        json_string(serde_json::json!({
            "accounts": accounts.into_iter().map(map_wallet_account).collect::<Vec<_>>(),
        }))
    }

    fn wallet_ledger_entries(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        let body = parse_body_json(&request.body_json)?;
        let context = request.context();
        let asset_type = parse_optional_asset_type(
            string_field(&body, &["assetType", "asset_type"]).as_deref(),
        )?;
        let query = WalletTransactionListQuery::new(
            &context.tenant_id,
            context.organization_id.as_deref(),
            &context.user_id,
            string_field(&body, &["accountId", "account_id"]).as_deref(),
            asset_type,
            super::i64_field(&body, &["page"]),
            super::i64_field(&body, &["pageSize", "page_size"]),
            string_field(&body, &["cursor"]).as_deref(),
        )?;
        let transactions = match &self.pool {
            CommerceSqlxRuntimePool::Sqlite(pool) => block_on_commerce_async(async {
                SqliteCommerceAccountStore::new(pool.clone())
                    .list_wallet_transactions(query)
                    .await
            })?,
            CommerceSqlxRuntimePool::Postgres(pool) => block_on_commerce_async(async {
                PostgresCommerceAccountStore::new(pool.clone())
                    .list_wallet_transactions(query)
                    .await
            })?,
        };
        json_string(serde_json::json!({
            "entries": transactions.into_iter().map(map_wallet_transaction).collect::<Vec<_>>(),
        }))
    }

    fn usage_statements(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        let body = parse_body_json(&request.body_json)?;
        let context = request.context();
        let query = BillingHistoryListQuery::new(
            &context.tenant_id,
            context.organization_id.as_deref(),
            &context.user_id,
            string_field(&body, &["historyType", "history_type"]).as_deref(),
            None,
            super::i64_field(&body, &["page"]),
            super::i64_field(&body, &["pageSize", "page_size"]),
            string_field(&body, &["cursor"]).as_deref(),
        )?;
        let items = match &self.pool {
            CommerceSqlxRuntimePool::Sqlite(pool) => block_on_commerce_async(async {
                SqliteCommerceBillingHistoryStore::new(pool.clone())
                    .list_billing_history(query)
                    .await
            })?,
            CommerceSqlxRuntimePool::Postgres(pool) => block_on_commerce_async(async {
                PostgresCommerceBillingHistoryStore::new(pool.clone())
                    .list_billing_history(query)
                    .await
            })?,
        };
        json_string(serde_json::json!({
            "statements": items.into_iter().map(map_usage_statement).collect::<Vec<_>>(),
        }))
    }
}

impl CommerceAccountRuntimeStore for SqlxCommerceAccountRuntimeStore {
    fn handle_account_operation(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        self.dispatch(request)
    }
}

fn wallet_list_query(
    request: &CommerceRuntimeServiceRequest,
) -> Result<WalletAccountListQuery, CommerceServiceError> {
    let body = parse_body_json(&request.body_json)?;
    let context = request.context();
    let asset_type =
        parse_optional_asset_type(string_field(&body, &["assetType", "asset_type"]).as_deref())?;
    WalletAccountListQuery::new(
        &context.tenant_id,
        context.organization_id.as_deref(),
        &context.user_id,
        asset_type,
    )
}

fn parse_optional_asset_type(
    value: Option<&str>,
) -> Result<Option<CommerceAccountAssetType>, CommerceServiceError> {
    match value.map(str::trim).filter(|value| !value.is_empty()) {
        Some(value) => match value.to_ascii_lowercase().as_str() {
            "cash" => Ok(Some(CommerceAccountAssetType::Cash)),
            "point" | "points" => Ok(Some(CommerceAccountAssetType::Points)),
            "token" | "tokens" => Ok(Some(CommerceAccountAssetType::Token)),
            _ => Err(CommerceServiceError::validation("asset_type is invalid")),
        },
        None => Ok(None),
    }
}

fn map_wallet_account(
    account: sdkwork_commerce_account_service::WalletAccountItem,
) -> serde_json::Value {
    serde_json::json!({
        "id": account.id,
        "assetType": account.asset_type.as_str(),
        "currencyCode": account.currency_code,
        "availableAmount": account.available_amount.as_str(),
        "frozenAmount": account.frozen_amount.as_str(),
        "status": account.status,
    })
}

fn map_wallet_transaction(
    transaction: sdkwork_commerce_account_service::WalletTransactionItem,
) -> serde_json::Value {
    serde_json::json!({
        "id": transaction.id,
        "accountId": transaction.account_id,
        "assetType": transaction.asset_type.as_str(),
        "direction": transaction.direction.as_str(),
        "amount": transaction.amount.as_str(),
        "balanceAfter": transaction.balance_after.as_str(),
        "businessType": transaction.business_type,
        "transactionNo": transaction.transaction_no,
        "createdAt": transaction.created_at,
    })
}

fn map_usage_statement(
    item: sdkwork_commerce_account_service::BillingHistoryItem,
) -> serde_json::Value {
    serde_json::json!({
        "statementId": item.id,
        "title": item.title,
        "amount": item.amount.as_str(),
        "currencyCode": item.currency_code,
        "occurredAt": item.occurred_at,
        "status": item.status,
    })
}
