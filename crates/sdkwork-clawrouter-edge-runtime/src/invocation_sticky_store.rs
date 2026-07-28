use sdkwork_clawrouter_router_service::domain::DomainError;
use sdkwork_clawrouter_router_service::ports::{
    StickyObjectRouteBinding, StickyObjectRouteLookup, StickyObjectRouteUpsert, StickyRouteStore,
    StickyRouteStoreFuture,
};
use sha2::{Digest, Sha256};
use sqlx::Row;

#[derive(Clone)]
pub(crate) struct InvocationStickyObjectRouteStore(sqlx::PgPool);

impl InvocationStickyObjectRouteStore {
    pub(crate) fn postgres(pool: sqlx::PgPool) -> Self {
        Self(pool)
    }
}

impl std::fmt::Debug for InvocationStickyObjectRouteStore {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str("InvocationStickyObjectRouteStore::Postgres")
    }
}

impl StickyRouteStore for InvocationStickyObjectRouteStore {
    fn find_binding<'a>(
        &'a self,
        query: StickyObjectRouteLookup,
    ) -> StickyRouteStoreFuture<'a, Option<StickyObjectRouteBinding>> {
        Box::pin(async move {
            let object_key_hash = sticky_object_key_hash(
                query.tenant_id,
                query.organization_id,
                &query.object_type,
                &query.object_id,
            );
            sqlx::query(
                r#"
                SELECT tenant_id, organization_id, object_type, object_id,
                       parent_object_type, parent_object_id, supplier_code, account_id,
                       account_group_id, vendor_code, api_code, catalog_key,
                       provider_model, region_code, sticky_scope
                FROM ai_upstream_object_route
                WHERE tenant_id = $1
                  AND organization_id = $2
                  AND object_type = $3
                  AND object_id = $4
                  AND object_key_hash = $5
                  AND status = 1
                ORDER BY id DESC
                LIMIT 1
                "#,
            )
            .bind(query.tenant_id)
            .bind(query.organization_id)
            .bind(&query.object_type)
            .bind(&query.object_id)
            .bind(object_key_hash)
            .fetch_optional(&self.0)
            .await
            .map_err(sticky_store_error)?
            .map(sticky_binding_from_postgres_row)
            .transpose()
        })
    }

    fn upsert_binding<'a>(
        &'a self,
        command: StickyObjectRouteUpsert,
    ) -> StickyRouteStoreFuture<'a, ()> {
        Box::pin(async move {
            let object_key_hash = sticky_object_key_hash(
                command.tenant_id,
                command.organization_id,
                &command.object_type,
                &command.object_id,
            );
            sqlx::query(
                r#"
                INSERT INTO ai_upstream_object_route
                    (uuid, tenant_id, organization_id, status, api_key_id, account_group_id,
                     object_type, object_id, object_key_hash, parent_object_type,
                     parent_object_id, supplier_code, account_id, vendor_code, api_code,
                     catalog_key, provider_model, region_code, sticky_scope, last_seen_at)
                VALUES
                    ($1, $2, $3, 1, $4, $5, $6, $7, $8, $9, $10,
                     $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP)
                ON CONFLICT(tenant_id, organization_id, object_type, object_id)
                WHERE deleted_at IS NULL
                DO UPDATE SET
                    status = 1,
                    api_key_id = EXCLUDED.api_key_id,
                    account_group_id = EXCLUDED.account_group_id,
                    object_key_hash = EXCLUDED.object_key_hash,
                    parent_object_type = EXCLUDED.parent_object_type,
                    parent_object_id = EXCLUDED.parent_object_id,
                    supplier_code = EXCLUDED.supplier_code,
                    account_id = EXCLUDED.account_id,
                    vendor_code = EXCLUDED.vendor_code,
                    api_code = EXCLUDED.api_code,
                    catalog_key = EXCLUDED.catalog_key,
                    provider_model = EXCLUDED.provider_model,
                    region_code = EXCLUDED.region_code,
                    sticky_scope = EXCLUDED.sticky_scope,
                    last_seen_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP,
                    version = ai_upstream_object_route.version + 1
                "#,
            )
            .bind(&command.request_id)
            .bind(command.tenant_id)
            .bind(command.organization_id)
            .bind(command.api_key_id)
            .bind(command.account_group_id)
            .bind(&command.object_type)
            .bind(&command.object_id)
            .bind(&object_key_hash)
            .bind(&command.parent_object_type)
            .bind(&command.parent_object_id)
            .bind(&command.supplier_code)
            .bind(command.account_id)
            .bind(&command.vendor_code)
            .bind(&command.api_code)
            .bind(&command.catalog_key)
            .bind(&command.provider_model)
            .bind(&command.region_code)
            .bind(&command.sticky_scope)
            .execute(&self.0)
            .await
            .map_err(sticky_store_error)?;
            Ok(())
        })
    }
}

fn sticky_binding_from_postgres_row(
    row: sqlx::postgres::PgRow,
) -> Result<StickyObjectRouteBinding, DomainError> {
    Ok(StickyObjectRouteBinding {
        tenant_id: row.get("tenant_id"),
        organization_id: row.get("organization_id"),
        object_type: row.get("object_type"),
        object_id: row.get("object_id"),
        parent_object_type: row.get("parent_object_type"),
        parent_object_id: row.get("parent_object_id"),
        supplier_code: row.get("supplier_code"),
        account_id: row.get("account_id"),
        account_group_id: row.get("account_group_id"),
        vendor_code: row.get("vendor_code"),
        api_code: row.get("api_code"),
        catalog_key: row.get("catalog_key"),
        provider_model: row.get("provider_model"),
        region_code: row.get("region_code"),
        sticky_scope: row.get("sticky_scope"),
    })
}

fn sticky_store_error(error: sqlx::Error) -> DomainError {
    if let sqlx::Error::Database(database_error) = &error {
        if database_error
            .code()
            .map(|code| code == "23505")
            .unwrap_or(false)
        {
            return DomainError::conflict("sticky route store failed: resource already exists");
        }
    }
    DomainError::new("sticky route store failed: database operation failed")
}

fn sticky_object_key_hash(
    tenant_id: i64,
    organization_id: i64,
    object_type: &str,
    object_id: &str,
) -> String {
    let mut hasher = Sha256::new();
    hasher.update(tenant_id.to_string());
    hasher.update(b":");
    hasher.update(organization_id.to_string());
    hasher.update(b":");
    hasher.update(object_type.trim().as_bytes());
    hasher.update(b":");
    hasher.update(object_id.trim().as_bytes());
    hex::encode(hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::sticky_store_error;

    #[test]
    fn sticky_store_error_redacts_sqlx_details() {
        let error = sticky_store_error(sqlx::Error::Configuration(
            "postgres://operator:secret@database.internal/clawrouter".into(),
        ));

        assert_eq!(
            error.to_string(),
            "sticky route store failed: database operation failed"
        );
    }
}
