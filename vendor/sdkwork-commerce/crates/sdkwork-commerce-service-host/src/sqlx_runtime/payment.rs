use sdkwork_commerce_contract_service::CommerceServiceError;
use sqlx::{PgPool, Row, SqlitePool};

use crate::{CommercePaymentRuntimeStore, CommerceRuntimeServiceRequest};

use super::{
    block_on_commerce_async, current_timestamp_string, json_string, parse_body_json,
    stable_storage_id, string_field, CommerceSqlxRuntimePool,
};

#[derive(Clone, Debug)]
pub struct SqlxCommercePaymentRuntimeStore {
    pool: CommerceSqlxRuntimePool,
}

impl SqlxCommercePaymentRuntimeStore {
    pub fn new(pool: CommerceSqlxRuntimePool) -> Self {
        Self { pool }
    }

    fn dispatch(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        match request.execution_plan.operation_id {
            "payments.providerAccounts.list" => self.list_provider_accounts(),
            "payments.providerAccounts.create" => self.create_provider_account(request),
            "payments.methods.management.list" => self.list_payment_methods(),
            "payments.channels.list" => self.list_payment_channels(),
            "payments.intents.list" => self.list_payment_intents(),
            "payments.attempts.list" => self.list_payment_attempts(),
            "payments.reconciliationRuns.list" => self.list_reconciliation_runs(),
            "commerceReports.paymentReconciliation.retrieve" => {
                self.retrieve_payment_reconciliation(request)
            }
            "commerceReports.refunds.list" => json_string(serde_json::json!({ "reports": [] })),
            other => Err(CommerceServiceError::unsupported_capability(format!(
                "payment sqlx runtime store does not support operation: {other}"
            ))),
        }
    }

    fn list_provider_accounts(&self) -> Result<String, CommerceServiceError> {
        let accounts = match &self.pool {
            CommerceSqlxRuntimePool::Sqlite(pool) => {
                block_on_commerce_async(async { list_provider_accounts_sqlite(pool).await })?
            }
            CommerceSqlxRuntimePool::Postgres(pool) => {
                block_on_commerce_async(async { list_provider_accounts_postgres(pool).await })?
            }
        };
        json_string(serde_json::json!({ "providerAccounts": accounts }))
    }

    fn create_provider_account(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        let body = parse_body_json(&request.body_json)?;
        let context = request.context();
        let provider_code = string_field(&body, &["providerCode", "provider_code"])
            .unwrap_or_else(|| "wechat_pay".to_owned());
        let display_name = string_field(&body, &["displayName", "display_name"])
            .unwrap_or_else(|| provider_code.clone());
        let account = match &self.pool {
            CommerceSqlxRuntimePool::Sqlite(pool) => block_on_commerce_async(async {
                upsert_provider_account_sqlite(
                    pool,
                    &context.tenant_id,
                    context.organization_id.as_deref(),
                    &provider_code,
                    &display_name,
                )
                .await
            })?,
            CommerceSqlxRuntimePool::Postgres(pool) => block_on_commerce_async(async {
                upsert_provider_account_postgres(
                    pool,
                    &context.tenant_id,
                    context.organization_id.as_deref(),
                    &provider_code,
                    &display_name,
                )
                .await
            })?,
        };
        json_string(account)
    }

    fn list_payment_methods(&self) -> Result<String, CommerceServiceError> {
        let methods = match &self.pool {
            CommerceSqlxRuntimePool::Sqlite(pool) => {
                block_on_commerce_async(async { list_payment_methods_sqlite(pool).await })?
            }
            CommerceSqlxRuntimePool::Postgres(pool) => {
                block_on_commerce_async(async { list_payment_methods_postgres(pool).await })?
            }
        };
        json_string(serde_json::json!({ "methods": methods }))
    }

    fn list_payment_channels(&self) -> Result<String, CommerceServiceError> {
        let channels = match &self.pool {
            CommerceSqlxRuntimePool::Sqlite(pool) => {
                block_on_commerce_async(async { list_payment_channels_sqlite(pool).await })?
            }
            CommerceSqlxRuntimePool::Postgres(pool) => {
                block_on_commerce_async(async { list_payment_channels_postgres(pool).await })?
            }
        };
        json_string(serde_json::json!({ "channels": channels }))
    }

    fn list_payment_intents(&self) -> Result<String, CommerceServiceError> {
        let intents = match &self.pool {
            CommerceSqlxRuntimePool::Sqlite(pool) => {
                block_on_commerce_async(async { list_payment_intents_sqlite(pool).await })?
            }
            CommerceSqlxRuntimePool::Postgres(pool) => {
                block_on_commerce_async(async { list_payment_intents_postgres(pool).await })?
            }
        };
        json_string(serde_json::json!({ "intents": intents }))
    }

    fn list_payment_attempts(&self) -> Result<String, CommerceServiceError> {
        let attempts = match &self.pool {
            CommerceSqlxRuntimePool::Sqlite(pool) => {
                block_on_commerce_async(async { list_payment_attempts_sqlite(pool).await })?
            }
            CommerceSqlxRuntimePool::Postgres(pool) => {
                block_on_commerce_async(async { list_payment_attempts_postgres(pool).await })?
            }
        };
        json_string(serde_json::json!({ "attempts": attempts }))
    }

    fn list_reconciliation_runs(&self) -> Result<String, CommerceServiceError> {
        let runs = match &self.pool {
            CommerceSqlxRuntimePool::Sqlite(pool) => {
                block_on_commerce_async(async { list_reconciliation_runs_sqlite(pool).await })?
            }
            CommerceSqlxRuntimePool::Postgres(pool) => {
                block_on_commerce_async(async { list_reconciliation_runs_postgres(pool).await })?
            }
        };
        json_string(serde_json::json!({ "reconciliationRuns": runs }))
    }

    fn retrieve_payment_reconciliation(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        let body = parse_body_json(&request.body_json)?;
        let report_id = string_field(&body, &["reportId", "report_id"]).unwrap_or_default();
        json_string(serde_json::json!({
            "reportId": report_id,
            "reconciledAmount": null,
        }))
    }
}

impl CommercePaymentRuntimeStore for SqlxCommercePaymentRuntimeStore {
    fn handle_payment_operation(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        self.dispatch(request)
    }
}

async fn list_provider_accounts_sqlite(
    pool: &SqlitePool,
) -> Result<Vec<serde_json::Value>, CommerceServiceError> {
    let rows = sqlx::query(
        "SELECT id, account_no, provider_code, merchant_id, environment, country_code, settlement_currency, status FROM commerce_payment_provider_account ORDER BY created_at DESC, id DESC",
    )
    .fetch_all(pool)
    .await
    .map_err(storage_error("failed to list provider accounts"))?;
    Ok(rows
        .iter()
        .map(|row| {
            serde_json::json!({
                "id": sqlite_string(row, "id"),
                "providerCode": sqlite_string(row, "provider_code"),
                "status": sqlite_string(row, "status"),
            })
        })
        .collect())
}

async fn list_provider_accounts_postgres(
    pool: &PgPool,
) -> Result<Vec<serde_json::Value>, CommerceServiceError> {
    let rows = sqlx::query(
        "SELECT id, account_no, provider_code, merchant_id, environment, country_code, settlement_currency, status FROM commerce_payment_provider_account ORDER BY created_at DESC, id DESC",
    )
    .fetch_all(pool)
    .await
    .map_err(storage_error("failed to list provider accounts"))?;
    Ok(rows
        .iter()
        .map(|row| {
            serde_json::json!({
                "id": pg_string(row, "id"),
                "providerCode": pg_string(row, "provider_code"),
                "status": pg_string(row, "status"),
            })
        })
        .collect())
}

async fn upsert_provider_account_sqlite(
    pool: &SqlitePool,
    tenant_id: &str,
    organization_id: Option<&str>,
    provider_code: &str,
    display_name: &str,
) -> Result<serde_json::Value, CommerceServiceError> {
    let id = stable_storage_id(&["provider-account", tenant_id, provider_code, display_name]);
    let now = current_timestamp_string();
    let row = sqlx::query(
        r#"
        INSERT INTO commerce_payment_provider_account
            (id, tenant_id, organization_id, account_no, provider_code, merchant_id, environment, country_code,
             settlement_currency, secret_ref, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (tenant_id, account_no) DO UPDATE SET
            provider_code = EXCLUDED.provider_code,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        RETURNING id, account_no, provider_code, status
        "#,
    )
    .bind(&id)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(display_name)
    .bind(provider_code)
    .bind("merchant")
    .bind("production")
    .bind("CN")
    .bind("CNY")
    .bind("vault://secret")
    .bind("active")
    .bind(&now)
    .bind(&now)
    .fetch_one(pool)
    .await
    .map_err(storage_error("failed to upsert provider account"))?;
    Ok(serde_json::json!({
        "id": sqlite_string(&row, "id"),
        "providerCode": sqlite_string(&row, "provider_code"),
        "status": sqlite_string(&row, "status"),
    }))
}

async fn upsert_provider_account_postgres(
    pool: &PgPool,
    tenant_id: &str,
    organization_id: Option<&str>,
    provider_code: &str,
    display_name: &str,
) -> Result<serde_json::Value, CommerceServiceError> {
    let id = stable_storage_id(&["provider-account", tenant_id, provider_code, display_name]);
    let now = current_timestamp_string();
    let row = sqlx::query(
        r#"
        INSERT INTO commerce_payment_provider_account
            (id, tenant_id, organization_id, account_no, provider_code, merchant_id, environment, country_code,
             settlement_currency, secret_ref, status, created_at, updated_at)
        VALUES (CAST($1 AS TEXT), CAST($2 AS TEXT), CAST($3 AS TEXT), CAST($4 AS TEXT), CAST($5 AS TEXT), CAST($6 AS TEXT),
                CAST($7 AS TEXT), CAST($8 AS TEXT), CAST($9 AS TEXT), CAST($10 AS TEXT), CAST($11 AS TEXT), CAST($12 AS TEXT), CAST($12 AS TEXT))
        ON CONFLICT (tenant_id, account_no) DO UPDATE SET
            provider_code = EXCLUDED.provider_code,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        RETURNING id, account_no, provider_code, status
        "#,
    )
    .bind(&id)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(display_name)
    .bind(provider_code)
    .bind("merchant")
    .bind("production")
    .bind("CN")
    .bind("CNY")
    .bind("vault://secret")
    .bind("active")
    .bind(&now)
    .fetch_one(pool)
    .await
    .map_err(storage_error("failed to upsert provider account"))?;
    Ok(serde_json::json!({
        "id": pg_string(&row, "id"),
        "providerCode": pg_string(&row, "provider_code"),
        "status": pg_string(&row, "status"),
    }))
}

async fn list_payment_methods_sqlite(
    pool: &SqlitePool,
) -> Result<Vec<serde_json::Value>, CommerceServiceError> {
    let rows = sqlx::query(
        "SELECT id, method_key, display_name, provider_code, status FROM commerce_payment_method ORDER BY sort_order ASC, created_at ASC",
    )
    .fetch_all(pool)
    .await
    .map_err(storage_error("failed to list payment methods"))?;
    Ok(rows
        .iter()
        .map(|row| {
            serde_json::json!({
                "id": sqlite_string(row, "id"),
                "methodKey": sqlite_string(row, "method_key"),
                "status": sqlite_string(row, "status"),
            })
        })
        .collect())
}

async fn list_payment_methods_postgres(
    pool: &PgPool,
) -> Result<Vec<serde_json::Value>, CommerceServiceError> {
    let rows = sqlx::query(
        "SELECT id, method_key, display_name, provider_code, status FROM commerce_payment_method ORDER BY sort_order ASC, created_at ASC",
    )
    .fetch_all(pool)
    .await
    .map_err(storage_error("failed to list payment methods"))?;
    Ok(rows
        .iter()
        .map(|row| {
            serde_json::json!({
                "id": pg_string(row, "id"),
                "methodKey": pg_string(row, "method_key"),
                "status": pg_string(row, "status"),
            })
        })
        .collect())
}

async fn list_payment_channels_sqlite(
    pool: &SqlitePool,
) -> Result<Vec<serde_json::Value>, CommerceServiceError> {
    let rows = sqlx::query(
        "SELECT id, channel_no, provider_account_id, method_id, scene_code, currency_code, country_code, status, priority FROM commerce_payment_channel ORDER BY priority ASC, created_at ASC",
    )
    .fetch_all(pool)
    .await
    .map_err(storage_error("failed to list payment channels"))?;
    Ok(rows
        .iter()
        .map(|row| {
            serde_json::json!({
                "id": sqlite_string(row, "id"),
                "channelCode": sqlite_string(row, "channel_no"),
                "status": sqlite_string(row, "status"),
            })
        })
        .collect())
}

async fn list_payment_channels_postgres(
    pool: &PgPool,
) -> Result<Vec<serde_json::Value>, CommerceServiceError> {
    let rows = sqlx::query(
        "SELECT id, channel_no, provider_account_id, method_id, scene_code, currency_code, country_code, status, priority FROM commerce_payment_channel ORDER BY priority ASC, created_at ASC",
    )
    .fetch_all(pool)
    .await
    .map_err(storage_error("failed to list payment channels"))?;
    Ok(rows
        .iter()
        .map(|row| {
            serde_json::json!({
                "id": pg_string(row, "id"),
                "channelCode": pg_string(row, "channel_no"),
                "status": pg_string(row, "status"),
            })
        })
        .collect())
}

async fn list_payment_intents_sqlite(
    pool: &SqlitePool,
) -> Result<Vec<serde_json::Value>, CommerceServiceError> {
    let rows = sqlx::query(
        "SELECT id, status FROM commerce_payment_intent ORDER BY created_at DESC, id DESC",
    )
    .fetch_all(pool)
    .await
    .map_err(storage_error("failed to list payment intents"))?;
    Ok(rows
        .iter()
        .map(|row| {
            serde_json::json!({
                "id": sqlite_string(row, "id"),
                "status": sqlite_string(row, "status"),
            })
        })
        .collect())
}

async fn list_payment_intents_postgres(
    pool: &PgPool,
) -> Result<Vec<serde_json::Value>, CommerceServiceError> {
    let rows = sqlx::query(
        "SELECT id, status FROM commerce_payment_intent ORDER BY created_at DESC, id DESC",
    )
    .fetch_all(pool)
    .await
    .map_err(storage_error("failed to list payment intents"))?;
    Ok(rows
        .iter()
        .map(|row| {
            serde_json::json!({
                "id": pg_string(row, "id"),
                "status": pg_string(row, "status"),
            })
        })
        .collect())
}

async fn list_payment_attempts_sqlite(
    pool: &SqlitePool,
) -> Result<Vec<serde_json::Value>, CommerceServiceError> {
    let rows = sqlx::query(
        "SELECT id, status FROM commerce_payment_attempt ORDER BY created_at DESC, id DESC",
    )
    .fetch_all(pool)
    .await
    .map_err(storage_error("failed to list payment attempts"))?;
    Ok(rows
        .iter()
        .map(|row| {
            serde_json::json!({
                "id": sqlite_string(row, "id"),
                "status": sqlite_string(row, "status"),
            })
        })
        .collect())
}

async fn list_payment_attempts_postgres(
    pool: &PgPool,
) -> Result<Vec<serde_json::Value>, CommerceServiceError> {
    let rows = sqlx::query(
        "SELECT id, status FROM commerce_payment_attempt ORDER BY created_at DESC, id DESC",
    )
    .fetch_all(pool)
    .await
    .map_err(storage_error("failed to list payment attempts"))?;
    Ok(rows
        .iter()
        .map(|row| {
            serde_json::json!({
                "id": pg_string(row, "id"),
                "status": pg_string(row, "status"),
            })
        })
        .collect())
}

async fn list_reconciliation_runs_sqlite(
    pool: &SqlitePool,
) -> Result<Vec<serde_json::Value>, CommerceServiceError> {
    let rows = sqlx::query(
        "SELECT id, status FROM commerce_payment_reconciliation_run ORDER BY created_at DESC, id DESC",
    )
    .fetch_all(pool)
    .await
    .map_err(storage_error("failed to list reconciliation runs"))?;
    Ok(rows
        .iter()
        .map(|row| {
            serde_json::json!({
                "id": sqlite_string(row, "id"),
                "status": sqlite_string(row, "status"),
            })
        })
        .collect())
}

async fn list_reconciliation_runs_postgres(
    pool: &PgPool,
) -> Result<Vec<serde_json::Value>, CommerceServiceError> {
    let rows = sqlx::query(
        "SELECT id, status FROM commerce_payment_reconciliation_run ORDER BY created_at DESC, id DESC",
    )
    .fetch_all(pool)
    .await
    .map_err(storage_error("failed to list reconciliation runs"))?;
    Ok(rows
        .iter()
        .map(|row| {
            serde_json::json!({
                "id": pg_string(row, "id"),
                "status": pg_string(row, "status"),
            })
        })
        .collect())
}

fn storage_error(context: &'static str) -> impl FnOnce(sqlx::Error) -> CommerceServiceError {
    move |error| CommerceServiceError::storage(format!("{context}: {error}"))
}

fn sqlite_string(row: &sqlx::sqlite::SqliteRow, column: &str) -> String {
    row.try_get::<String, _>(column)
        .or_else(|_| {
            row.try_get::<Option<String>, _>(column)
                .map(|value| value.unwrap_or_default())
        })
        .unwrap_or_default()
}

fn pg_string(row: &sqlx::postgres::PgRow, column: &str) -> String {
    row.try_get::<String, _>(column)
        .or_else(|_| {
            row.try_get::<Option<String>, _>(column)
                .map(|value| value.unwrap_or_default())
        })
        .unwrap_or_default()
}
