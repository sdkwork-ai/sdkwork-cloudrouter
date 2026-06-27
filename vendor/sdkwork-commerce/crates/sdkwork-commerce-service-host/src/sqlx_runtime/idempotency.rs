use sdkwork_commerce_contract_service::{
    CommerceIdempotencyRecord, CommerceRequestHash, CommerceServiceError, IdempotencyStatus,
};
use sqlx::{PgPool, Row, SqlitePool};

use crate::CommerceRuntimeIdempotencyStore;

use super::{
    block_on_commerce_async, current_timestamp_string, stable_storage_id, CommerceSqlxRuntimePool,
};

#[derive(Clone, Debug)]
pub struct SqlxCommerceRuntimeIdempotencyStore {
    pool: CommerceSqlxRuntimePool,
}

impl SqlxCommerceRuntimeIdempotencyStore {
    pub fn new(pool: CommerceSqlxRuntimePool) -> Self {
        Self { pool }
    }
}

impl CommerceRuntimeIdempotencyStore for SqlxCommerceRuntimeIdempotencyStore {
    fn find(
        &self,
        tenant_id: &str,
        scope: &str,
        idempotency_key: &str,
    ) -> Result<Option<CommerceIdempotencyRecord>, CommerceServiceError> {
        block_on_commerce_async(async {
            match &self.pool {
                CommerceSqlxRuntimePool::Sqlite(pool) => {
                    find_sqlite(pool, tenant_id, scope, idempotency_key).await
                }
                CommerceSqlxRuntimePool::Postgres(pool) => {
                    find_postgres(pool, tenant_id, scope, idempotency_key).await
                }
            }
        })
    }

    fn lock(
        &mut self,
        record: CommerceIdempotencyRecord,
    ) -> Result<CommerceIdempotencyRecord, CommerceServiceError> {
        block_on_commerce_async(async {
            match &self.pool {
                CommerceSqlxRuntimePool::Sqlite(pool) => lock_sqlite(pool, &record).await,
                CommerceSqlxRuntimePool::Postgres(pool) => lock_postgres(pool, &record).await,
            }
        })
    }

    fn complete(
        &mut self,
        tenant_id: &str,
        scope: &str,
        idempotency_key: &str,
        response_json: &str,
    ) -> Result<(), CommerceServiceError> {
        block_on_commerce_async(async {
            match &self.pool {
                CommerceSqlxRuntimePool::Sqlite(pool) => {
                    complete_sqlite(pool, tenant_id, scope, idempotency_key, response_json).await
                }
                CommerceSqlxRuntimePool::Postgres(pool) => {
                    complete_postgres(pool, tenant_id, scope, idempotency_key, response_json).await
                }
            }
        })
    }

    fn fail(
        &mut self,
        tenant_id: &str,
        scope: &str,
        idempotency_key: &str,
    ) -> Result<(), CommerceServiceError> {
        block_on_commerce_async(async {
            match &self.pool {
                CommerceSqlxRuntimePool::Sqlite(pool) => {
                    fail_sqlite(pool, tenant_id, scope, idempotency_key).await
                }
                CommerceSqlxRuntimePool::Postgres(pool) => {
                    fail_postgres(pool, tenant_id, scope, idempotency_key).await
                }
            }
        })
    }
}

async fn find_sqlite(
    pool: &SqlitePool,
    tenant_id: &str,
    scope: &str,
    idempotency_key: &str,
) -> Result<Option<CommerceIdempotencyRecord>, CommerceServiceError> {
    let row = sqlx::query(
        r#"
        SELECT tenant_id, scope, idempotency_key, request_hash, response_json, status
        FROM commerce_idempotency_key
        WHERE tenant_id = ? AND scope = ? AND idempotency_key = ?
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .bind(scope)
    .bind(idempotency_key)
    .fetch_optional(pool)
    .await
    .map_err(|error| {
        CommerceServiceError::storage(format!("failed to find idempotency key: {error}"))
    })?;

    Ok(row.as_ref().map(map_idempotency_row))
}

async fn find_postgres(
    pool: &PgPool,
    tenant_id: &str,
    scope: &str,
    idempotency_key: &str,
) -> Result<Option<CommerceIdempotencyRecord>, CommerceServiceError> {
    let row = sqlx::query(
        r#"
        SELECT tenant_id, scope, idempotency_key, request_hash, response_json, status
        FROM commerce_idempotency_key
        WHERE tenant_id = CAST($1 AS TEXT) AND scope = CAST($2 AS TEXT) AND idempotency_key = CAST($3 AS TEXT)
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .bind(scope)
    .bind(idempotency_key)
    .fetch_optional(pool)
    .await
    .map_err(|error| CommerceServiceError::storage(format!("failed to find idempotency key: {error}")))?;

    Ok(row.as_ref().map(map_idempotency_row_pg))
}

async fn lock_sqlite(
    pool: &SqlitePool,
    record: &CommerceIdempotencyRecord,
) -> Result<CommerceIdempotencyRecord, CommerceServiceError> {
    let now = current_timestamp_string();
    let id = stable_storage_id(&[
        "runtime-idempotency",
        &record.tenant_id,
        &record.scope,
        &record.idempotency_key,
    ]);
    let insert = sqlx::query(
        r#"
        INSERT INTO commerce_idempotency_key
            (id, tenant_id, organization_id, scope, idempotency_key, request_hash,
             status, locked_until, expires_at, created_at, updated_at)
        VALUES
            (?, ?, NULL, ?, ?, ?, 'locked', ?, ?, ?, ?)
        "#,
    )
    .bind(&id)
    .bind(&record.tenant_id)
    .bind(&record.scope)
    .bind(&record.idempotency_key)
    .bind(record.request_hash.as_str())
    .bind(&now)
    .bind(&now)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await;

    if let Err(error) = insert {
        if is_unique_violation(&error) {
            return find_sqlite(
                pool,
                &record.tenant_id,
                &record.scope,
                &record.idempotency_key,
            )
            .await?
            .ok_or_else(|| {
                CommerceServiceError::storage(
                    "idempotency key conflict did not resolve to an existing record",
                )
            });
        }
        return Err(CommerceServiceError::storage(format!(
            "failed to lock idempotency key: {error}"
        )));
    }

    Ok(record.clone())
}

async fn lock_postgres(
    pool: &PgPool,
    record: &CommerceIdempotencyRecord,
) -> Result<CommerceIdempotencyRecord, CommerceServiceError> {
    let now = current_timestamp_string();
    let id = stable_storage_id(&[
        "runtime-idempotency",
        &record.tenant_id,
        &record.scope,
        &record.idempotency_key,
    ]);
    let insert = sqlx::query(
        r#"
        INSERT INTO commerce_idempotency_key
            (id, tenant_id, organization_id, scope, idempotency_key, request_hash,
             status, locked_until, expires_at, created_at, updated_at)
        VALUES
            (CAST($1 AS TEXT), CAST($2 AS TEXT), NULL, CAST($3 AS TEXT), CAST($4 AS TEXT), CAST($5 AS TEXT),
             'locked', CAST($6 AS TEXT), CAST($6 AS TEXT), CAST($6 AS TEXT), CAST($6 AS TEXT))
        "#,
    )
    .bind(&id)
    .bind(&record.tenant_id)
    .bind(&record.scope)
    .bind(&record.idempotency_key)
    .bind(record.request_hash.as_str())
    .bind(&now)
    .execute(pool)
    .await;

    if let Err(error) = insert {
        if is_unique_violation(&error) {
            return find_postgres(
                pool,
                &record.tenant_id,
                &record.scope,
                &record.idempotency_key,
            )
            .await?
            .ok_or_else(|| {
                CommerceServiceError::storage(
                    "idempotency key conflict did not resolve to an existing record",
                )
            });
        }
        return Err(CommerceServiceError::storage(format!(
            "failed to lock idempotency key: {error}"
        )));
    }

    Ok(record.clone())
}

async fn complete_sqlite(
    pool: &SqlitePool,
    tenant_id: &str,
    scope: &str,
    idempotency_key: &str,
    response_json: &str,
) -> Result<(), CommerceServiceError> {
    let now = current_timestamp_string();
    sqlx::query(
        r#"
        UPDATE commerce_idempotency_key
        SET response_json = ?, status = 'completed', updated_at = ?
        WHERE tenant_id = ? AND scope = ? AND idempotency_key = ?
        "#,
    )
    .bind(response_json)
    .bind(&now)
    .bind(tenant_id)
    .bind(scope)
    .bind(idempotency_key)
    .execute(pool)
    .await
    .map_err(|error| {
        CommerceServiceError::storage(format!("failed to complete idempotency key: {error}"))
    })?;
    Ok(())
}

async fn complete_postgres(
    pool: &PgPool,
    tenant_id: &str,
    scope: &str,
    idempotency_key: &str,
    response_json: &str,
) -> Result<(), CommerceServiceError> {
    let now = current_timestamp_string();
    sqlx::query(
        r#"
        UPDATE commerce_idempotency_key
        SET response_json = CAST($1 AS TEXT), status = 'completed', updated_at = CAST($2 AS TEXT)
        WHERE tenant_id = CAST($3 AS TEXT) AND scope = CAST($4 AS TEXT) AND idempotency_key = CAST($5 AS TEXT)
        "#,
    )
    .bind(response_json)
    .bind(&now)
    .bind(tenant_id)
    .bind(scope)
    .bind(idempotency_key)
    .execute(pool)
    .await
    .map_err(|error| CommerceServiceError::storage(format!("failed to complete idempotency key: {error}")))?;
    Ok(())
}

async fn fail_sqlite(
    pool: &SqlitePool,
    tenant_id: &str,
    scope: &str,
    idempotency_key: &str,
) -> Result<(), CommerceServiceError> {
    let now = current_timestamp_string();
    sqlx::query(
        r#"
        UPDATE commerce_idempotency_key
        SET status = 'failed', updated_at = ?
        WHERE tenant_id = ? AND scope = ? AND idempotency_key = ?
        "#,
    )
    .bind(&now)
    .bind(tenant_id)
    .bind(scope)
    .bind(idempotency_key)
    .execute(pool)
    .await
    .map_err(|error| {
        CommerceServiceError::storage(format!("failed to fail idempotency key: {error}"))
    })?;
    Ok(())
}

async fn fail_postgres(
    pool: &PgPool,
    tenant_id: &str,
    scope: &str,
    idempotency_key: &str,
) -> Result<(), CommerceServiceError> {
    let now = current_timestamp_string();
    sqlx::query(
        r#"
        UPDATE commerce_idempotency_key
        SET status = 'failed', updated_at = CAST($1 AS TEXT)
        WHERE tenant_id = CAST($2 AS TEXT) AND scope = CAST($3 AS TEXT) AND idempotency_key = CAST($4 AS TEXT)
        "#,
    )
    .bind(&now)
    .bind(tenant_id)
    .bind(scope)
    .bind(idempotency_key)
    .execute(pool)
    .await
    .map_err(|error| CommerceServiceError::storage(format!("failed to fail idempotency key: {error}")))?;
    Ok(())
}

fn map_idempotency_row(row: &sqlx::sqlite::SqliteRow) -> CommerceIdempotencyRecord {
    map_idempotency_values(
        row.try_get::<String, _>("tenant_id").unwrap_or_default(),
        row.try_get::<String, _>("scope").unwrap_or_default(),
        row.try_get::<String, _>("idempotency_key")
            .unwrap_or_default(),
        row.try_get::<String, _>("request_hash")
            .unwrap_or_default()
            .as_str(),
        row.try_get::<Option<String>, _>("response_json")
            .ok()
            .flatten(),
        row.try_get::<String, _>("status")
            .unwrap_or_default()
            .as_str(),
    )
}

fn map_idempotency_row_pg(row: &sqlx::postgres::PgRow) -> CommerceIdempotencyRecord {
    map_idempotency_values(
        row.try_get::<String, _>("tenant_id").unwrap_or_default(),
        row.try_get::<String, _>("scope").unwrap_or_default(),
        row.try_get::<String, _>("idempotency_key")
            .unwrap_or_default(),
        row.try_get::<String, _>("request_hash")
            .unwrap_or_default()
            .as_str(),
        row.try_get::<Option<String>, _>("response_json")
            .ok()
            .flatten(),
        row.try_get::<String, _>("status")
            .unwrap_or_default()
            .as_str(),
    )
}

fn map_idempotency_values(
    tenant_id: String,
    scope: String,
    idempotency_key: String,
    request_hash: &str,
    response_json: Option<String>,
    status: &str,
) -> CommerceIdempotencyRecord {
    let request_hash = CommerceRequestHash::new(request_hash).unwrap_or_else(|_| {
        CommerceRequestHash::new("runtime-idempotency-request-hash").expect("fallback hash")
    });
    let status = match status {
        "completed" => IdempotencyStatus::Completed,
        "failed" => IdempotencyStatus::Failed,
        _ => IdempotencyStatus::Locked,
    };

    CommerceIdempotencyRecord {
        tenant_id,
        scope,
        idempotency_key,
        request_hash,
        response_json,
        status,
    }
}

fn is_unique_violation(error: &sqlx::Error) -> bool {
    error
        .as_database_error()
        .map(|db| db.is_unique_violation())
        .unwrap_or(false)
}
