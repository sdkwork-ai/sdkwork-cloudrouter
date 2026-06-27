mod account;
mod idempotency;
mod order;
mod payment;
mod transaction;

pub use account::SqlxCommerceAccountRuntimeStore;
pub use idempotency::SqlxCommerceRuntimeIdempotencyStore;
pub use order::SqlxCommerceOrderRuntimeStore;
pub use payment::SqlxCommercePaymentRuntimeStore;
pub use transaction::SqlxCommerceRuntimeTransactionManager;

use crate::CommerceServiceHostRuntimeStores;
use sqlx::{PgPool, SqlitePool};
use std::sync::Arc;

#[derive(Clone, Debug)]
pub enum CommerceSqlxRuntimePool {
    Sqlite(SqlitePool),
    Postgres(PgPool),
}

pub fn build_commerce_sqlx_runtime_stores(
    pool: CommerceSqlxRuntimePool,
) -> CommerceServiceHostRuntimeStores {
    CommerceServiceHostRuntimeStores {
        account: Some(Arc::new(SqlxCommerceAccountRuntimeStore::new(pool.clone()))),
        order: Some(Arc::new(SqlxCommerceOrderRuntimeStore::new(pool.clone()))),
        payment: Some(Arc::new(SqlxCommercePaymentRuntimeStore::new(pool))),
    }
}

pub fn build_commerce_sqlx_runtime_infrastructure(
    pool: CommerceSqlxRuntimePool,
) -> (
    Box<dyn crate::CommerceRuntimeIdempotencyStore + Send>,
    Box<dyn crate::CommerceRuntimeTransactionManager + Send>,
) {
    (
        Box::new(SqlxCommerceRuntimeIdempotencyStore::new(pool.clone())),
        Box::new(SqlxCommerceRuntimeTransactionManager),
    )
}

pub(crate) fn block_on_commerce_async<F, T>(
    future: F,
) -> Result<T, sdkwork_commerce_contract_service::CommerceServiceError>
where
    F: std::future::Future<
        Output = Result<T, sdkwork_commerce_contract_service::CommerceServiceError>,
    >,
{
    tokio::task::block_in_place(|| tokio::runtime::Handle::current().block_on(future))
}

pub(crate) fn parse_body_json(
    body_json: &str,
) -> Result<serde_json::Value, sdkwork_commerce_contract_service::CommerceServiceError> {
    if body_json.trim().is_empty() {
        return Ok(serde_json::json!({}));
    }
    serde_json::from_str(body_json).map_err(|error| {
        sdkwork_commerce_contract_service::CommerceServiceError::validation(format!(
            "invalid runtime request json: {error}"
        ))
    })
}

pub(crate) fn json_string(
    value: serde_json::Value,
) -> Result<String, sdkwork_commerce_contract_service::CommerceServiceError> {
    serde_json::to_string(&value).map_err(|error| {
        sdkwork_commerce_contract_service::CommerceServiceError::storage(format!(
            "failed to encode runtime response json: {error}"
        ))
    })
}

pub(crate) fn string_field(body: &serde_json::Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        body.get(*key).and_then(|value| match value {
            serde_json::Value::String(text) if !text.is_empty() => Some(text.clone()),
            serde_json::Value::Number(number) => Some(number.to_string()),
            _ => None,
        })
    })
}

pub(crate) fn i64_field(body: &serde_json::Value, keys: &[&str]) -> Option<i64> {
    keys.iter()
        .find_map(|key| body.get(*key).and_then(|value| value.as_i64()))
}

pub(crate) fn fallback_request_no(user_id: &str, suffix: &str, idempotency_key: &str) -> String {
    format!("rpc-{suffix}-{user_id}-{idempotency_key}")
}

pub(crate) fn stable_storage_id(parts: &[&str]) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    parts.hash(&mut hasher);
    format!("commerce-{:016x}", hasher.finish())
}

pub(crate) fn current_timestamp_string() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_owned())
}
