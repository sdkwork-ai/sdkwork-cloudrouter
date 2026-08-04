//! PostgreSQL read model for `iam_gateway_chain_policy`.

use async_trait::async_trait;
use sqlx::Row;
use sqlx::PgPool;

use crate::ports::{ChainPolicyRecord, GatewayChainPolicyStore};

/// Read-only store over the gateway call-chain policy table.
#[derive(Debug, Clone)]
pub struct PostgresGatewayChainPolicyStore {
    pool: PgPool,
}

impl PostgresGatewayChainPolicyStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl GatewayChainPolicyStore for PostgresGatewayChainPolicyStore {
    async fn find_chain_policy(
        &self,
        scope_type: i32,
        scope_id: i64,
    ) -> Option<ChainPolicyRecord> {
        let row = sqlx::query(
            "SELECT scope_type, scope_id, payload
             FROM iam_gateway_chain_policy
             WHERE status = 1
               AND deleted_at IS NULL
               AND (effective_from IS NULL OR effective_from <= CURRENT_TIMESTAMP)
               AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
               AND scope_type = $1
               AND scope_id = $2
             ORDER BY version DESC, id DESC
             LIMIT 1",
        )
        .bind(scope_type)
        .bind(scope_id)
        .fetch_optional(&self.pool)
        .await
        .ok()
        .flatten()?;
        Some(ChainPolicyRecord {
            scope_type: row.get("scope_type"),
            scope_id: row.get("scope_id"),
            payload: row.get("payload"),
        })
    }
}
